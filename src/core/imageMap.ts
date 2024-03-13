import { load } from 'cheerio'
import type { Cheerio, CheerioAPI, Element } from 'cheerio'
import { assert } from 'std/assert/assert.ts'

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
 * Text along with its positional coordinates as a rect.
 *
 * Note: Properties do _not_ correspond to the FineReader XML `<text>` or `<rect>` elements.
 */
type PositionedText = {
	text: string
	rect: Rect
}

/**
 * Represents the pixel coordinates of a rectangular area, corresponding to the bounding box of a
 * {@link PositionedElement} such as `<line>` or `<charParams>`.
 *
 * Note: Though its name and properties are the same as those of the FineReader XML `<rect>` element, this does _not_
 * correspond to `<rect>`. The `<rect>` elements are a low-level concept that do not yield meaningful results when used
 * to locate text areas.
 */
class Rect {
	/** x coordinate of left border */
	public l: number
	/** y coordinate of top border */
	public t: number
	/** x coordinate of right border */
	public r: number
	/** y coordinate of bottom border */
	public b: number

	get width() {
		return this.r - this.l
	}

	get height() {
		return this.b - this.t
	}

	constructor({ l, t, r, b }: { l: number; t: number; r: number; b: number }) {
		this.l = l
		this.t = t
		this.r = r
		this.b = b
	}

	static merge(rects: Rect[]): Rect {
		return new Rect({
			l: Math.min(...rects.map((r) => r.l)),
			t: Math.min(...rects.map((r) => r.t)),
			r: Math.max(...rects.map((r) => r.r)),
			b: Math.max(...rects.map((r) => r.b)),
		})
	}
}

export function imageMap(xml: string, options?: Partial<ImageMapOptions>): ImageMap {
	const { rectType } = { ...defaultImageMapOptions, ...options }
	const $ = load(xml, { xml: true })
	const texts = getTexts($, rectType)
	return { texts }
}

/**
 * An element with pixel coordinates that can be converted to a {@link Rect} via the {@link getRect} function
 */
type PositionedElement = Element & {
	readonly tagName: PositionedElementTagName
}

/**
 * Elements with required integer `l`, `t`, `r`, and `b` attributes, per the [FineReader 10.0 XML Schema](
 * 	https://fr7.abbyy.com/FineReader_xml/FineReader10-schema-v1.xml
 * )
 */
type PositionedElementTagName = typeof positionedElementTagNames[number]
const positionedElementTagNames = ['line', 'charParams'] as const
function positioned(el: Element) {
	const { tagName } = el
	assert(
		positionedElementTagNames.includes(tagName as PositionedElementTagName),
		`Invalid positioned element: ${tagName}`,
	)
	return el as PositionedElement
}

function getTexts($: CheerioAPI, rectType: RectType): PositionedText[] {
	switch (rectType) {
		case 'paragraph': {
			return [...$('par')].flatMap((par) => {
				const linesGroups = [...$(par).find('line')].map((x) => getPositionedTexts($, $(positioned(x))))

				return linesGroups.every((g) => g.length === 1) ? mergeLines(linesGroups.flat()) : linesGroups.flat()
			}).filter(notNullish)
		}
		case 'line': {
			return [...$('line')].flatMap((x) => getPositionedTexts($, $(positioned(x))))
		}
	}
}

function notNullish<T>(x: T): x is Exclude<T, null | undefined> {
	return x != null
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
		rect: Rect.merge(lines.map((l) => l.rect)),
	}
}

function getRect($el: Cheerio<PositionedElement>): Rect {
	const l = Number($el.attr('l'))
	const t = Number($el.attr('t'))
	const r = Number($el.attr('r'))
	const b = Number($el.attr('b'))

	return new Rect({ l, t, r, b })
}

function getAspectRatio($el: Cheerio<PositionedElement>) {
	const { width, height } = getRect($el)
	return width / height
}

function getText($char: Cheerio<PositionedElement>) {
	if ($char.attr('isTab')) return '\t'

	const text = $char.text()
	const isSoftTab = text.trim() === '' && getAspectRatio($char) > 1

	return isSoftTab ? '\t' : text
}

/**
 * @param $ - Cheerio context
 * @param $line - XML `<line>` element
 */
function getPositionedTexts($: CheerioAPI, $line: Cheerio<PositionedElement>): PositionedText[] {
	const { l, t, r, b } = getRect($line)

	const positionedTexts: PositionedText[] = [{ text: '', rect: new Rect({ l, t, r, b }) }]

	for (const c of $line.find('charParams')) {
		const $char = $(positioned(c))
		const positionedText = positionedTexts.at(-1)!

		const text = getText($char)

		if (text === '\t') {
			positionedText.rect.r = Number($char.attr('l'))
			positionedTexts.push({ text: '', rect: new Rect({ l: Number($char.attr('r')), t, r, b }) })
		} else {
			positionedText.text += text
		}
	}

	return positionedTexts
}
