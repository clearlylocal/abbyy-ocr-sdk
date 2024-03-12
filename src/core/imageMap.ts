import { load } from 'cheerio'
import type { Cheerio, CheerioAPI, Element } from 'cheerio'

// https://support.abbyy.com/hc/en-us/articles/360017270080-Output-XML-document

type RectType = 'paragraph' | 'line'
export type ImageMapOptions = {
	rectType: RectType
}
const defaultImageMapOptions: ImageMapOptions = {
	rectType: 'paragraph',
}

export type ImageMap = { texts: PositionedText[] }

/**
 * An element with numeric `l`, `t`, `r`, and `b` attributes, such as such as `<par>`, `<line>`, or `<charParams>`, that
 * can be converted to a {@link Rect}.
 */
type $PositionedElement = Cheerio<Element> & {
	readonly PositionedElement: unique symbol
}

/**
 * Text along with its positional coordinates as a rect.
 *
 * Note: Properties do _not_ correspond to the `<text />` and `<rect />` XML elements.
 */
type PositionedText = {
	text: string
	rect: Rect
}

/**
 * Note: Though its properties are the same as the ABBYY XML `<rect>` element's attributes, this does _not_ correspond
 * to `<rect>`. The `<rect>` elements are a low-level concept that do not yield usable results when used to locate
 * recognizable text areas. Instead, a `Rect` can correspond to any {@link $PositionedElement}, such as `<par>`,
 * `<line>`, or `<charParams>`.
 */
type Rect = {
	/** x coordinate of left border */
	l: number
	/** y coordinate of top border */
	t: number
	/** x coordinate of right border */
	r: number
	/** y coordinate of bottom border */
	b: number
}

export function imageMap(xml: string, options?: Partial<ImageMapOptions>): ImageMap {
	const { rectType } = { ...defaultImageMapOptions, ...options }
	const $ = load(xml, { xml: true })
	const texts = getTexts($, rectType)
	return { texts }
}

function notNullish<T>(x: T): x is Exclude<T, null | undefined> {
	return x != null
}

function getTexts($: CheerioAPI, rectType: RectType): PositionedText[] {
	switch (rectType) {
		case 'paragraph': {
			return [...$('par')].flatMap((par) => {
				const linesGroups = [...$(par).find('line')].map((x) =>
					getPositionedTexts($, $(x) as $PositionedElement)
				)

				return linesGroups.every((g) => g.length === 1) ? mergeLines(linesGroups.flat()) : linesGroups.flat()
			}).filter(notNullish)
		}
		case 'line': {
			return [...$('line')].flatMap((x) => getPositionedTexts($, $(x) as $PositionedElement))
		}
	}
}

const nonSpaceDelimitedScripts = ['Han', 'Hiragana', 'Katakana', 'Thai', 'Khmer', 'Lao', 'Myanmar', 'Javanese'] as const
const nonSpaceDelimitedExts = nonSpaceDelimitedScripts.map((x) => `\\p{Script_Extensions=${x}}` as const)
const fullWidthPunct = '！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？［＼］＾＿｀｛｜｝～'
const nonSpaceDelimited = `[${nonSpaceDelimitedExts.join('')}${fullWidthPunct}]`

function mergeLines(lines: PositionedText[]): PositionedText | null {
	if (lines.length === 0) return null
	if (lines.length === 1) return lines[0]

	let allText = ''
	for (const [idx, { text }] of lines.entries()) {
		if (idx === 0) allText += text
		else {
			const prevChar = allText.match(/.$/u)?.[0]
			if (
				prevChar && new RegExp(`${nonSpaceDelimited}$`, 'u').test(prevChar) ||
				new RegExp(`^${nonSpaceDelimited}`, 'u').test(text)
			) {
				allText += text
			} else {
				allText += ` ${text}`
			}
		}
	}

	return lines.length === 1 ? lines[0] : {
		text: allText,
		rect: mergeRects(lines.map((l) => l.rect)),
	}
}

function mergeRects(rects: Rect[]): Rect {
	return {
		l: Math.min(...rects.map((r) => r.l)),
		t: Math.min(...rects.map((r) => r.t)),
		b: Math.max(...rects.map((r) => r.b)),
		r: Math.max(...rects.map((r) => r.r)),
	}
}

function getRect($el: $PositionedElement): Rect {
	const l = Number($el.attr('l'))
	const t = Number($el.attr('t'))
	const b = Number($el.attr('b'))
	const r = Number($el.attr('r'))

	return { l, t, b, r }
}

function getAspectRatio($el: $PositionedElement) {
	const { l, t, b, r } = getRect($el)
	const width = r - l
	const height = b - t

	return width / height
}

function getText($char: $PositionedElement) {
	if ($char.attr('isTab')) return '\t'

	const text = $char.text()
	const isSoftTab = !/\S/.test(text) && getAspectRatio($char) > 2.5

	return isSoftTab ? '\t' : text
}

/**
 * @param $line - XML `<line>` element
 * @param $ - Cheerio context
 */
function getPositionedTexts($: CheerioAPI, $line: $PositionedElement): PositionedText[] {
	const { l, t, b, r } = getRect($line)

	const positionedTexts: PositionedText[] = [{ text: '', rect: { l, t, b, r } }]

	for (const c of $line.find('charParams')) {
		const $char = $(c) as $PositionedElement
		const positionedText = positionedTexts.at(-1)!

		const text = getText($char)

		if (text === '\t') {
			positionedText.rect.r = Number($char.attr('l'))
			positionedTexts.push({ text: '', rect: { l: Number($char.attr('r')), t, b, r } })
		} else {
			positionedText.text += text
		}
	}

	return positionedTexts
}
