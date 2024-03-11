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

export function imageMap(xml: string, options?: Partial<ImageMapOptions>): ImageMap {
	const { rectType } = { ...defaultImageMapOptions, ...options }
	const $ = load(xml, { xml: true })
	const texts = getTexts($, rectType)
	return { texts }
}

function getTexts($: CheerioAPI, rectType: RectType): PositionedText[] {
	switch (rectType) {
		case 'paragraph': {
			return [...$('par')].flatMap((par) => {
				const linesGroups = [...$(par).find('line')].map((x) => getPositionedTexts($(x as Element), $))

				return linesGroups.every((g) => g.length === 1) ? mergeLines(linesGroups.flat()) : linesGroups.flat()
			})
				.filter((x): x is PositionedText => Boolean(x))
		}
		case 'line': {
			return [...$('line')].flatMap((x) => getPositionedTexts($(x as Element), $))
		}
	}
}

const nonSpaceDelimitedScripts = ['Han', 'Hiragana', 'Katakana', 'Thai', 'Khmer', 'Lao', 'Myanmar', 'Javanese'] as const
const nonSpaceDelimitedExts = nonSpaceDelimitedScripts.map((x) => `\\p{Script_Extensions=${x}}` as const)
const fullWidthPunct = `！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？［＼］＾＿｀｛｜｝～` as const
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

export type ImageMap = { texts: PositionedText[] }

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
 * Note: Though its properties are the same as `<rect />`'s attributes, this does _not_ correspond to `<rect />` XML
 * elements. The `<rect />` elements appear to be a lower-level concept, do not map to recognizable concepts such as
 * paragraph or line, and do not yield usable results when used to locate text areas.
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

/**
 * @param $line - XML `<line>` element
 * @param $ - Cheerio context
 */
function getPositionedTexts($line: Cheerio<Element>, $: CheerioAPI): PositionedText[] {
	const l = Number($line.attr('l'))
	const t = Number($line.attr('t'))
	const b = Number($line.attr('b'))
	const r = Number($line.attr('r'))

	const positionedTexts = [{ text: '', rect: { l, t, b, r } }]

	for (const c of $line.find('charParams')) {
		const $c = $(c)
		const positionedText = positionedTexts.at(-1)!

		if ($c.attr('isTab')) {
			positionedText.rect.r = Number($c.attr('l'))
			positionedTexts.push({ text: '', rect: { l: Number($c.attr('r')), t, b, r } })
		} else {
			positionedText.text += $c.text()
		}
	}

	return positionedTexts
}
