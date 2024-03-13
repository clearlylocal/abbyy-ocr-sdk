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

export function imageMap(xml: string, options?: Partial<ImageMapOptions>): ImageMap {
	const { rectType } = { ...defaultImageMapOptions, ...options }
	const $ = load(xml, { xml: true })
	const texts = getAllTexts($, rectType)
	return { texts }
}

/**
 * Represents the pixel coordinates of a rectangular area, corresponding to the bounding box of a
 * {@link PositionedElement} such as `<line>` or `<charParams>`.
 *
 * Note: Though its name and properties are the same as those of the FineReader XML `<rect>` element, this does _not_
 * correspond to `<rect>`. The `<rect>` elements are a low-level concept that do not yield meaningful results when used
 * to locate text areas.
 */
export class Rect {
	/** x coordinate of left border */
	public l: number
	/** y coordinate of top border */
	public t: number
	/** x coordinate of right border */
	public r: number
	/** y coordinate of bottom border */
	public b: number

	constructor({ l, t, r, b }: { l: number; t: number; r: number; b: number }) {
		this.l = l
		this.t = t
		this.r = r
		this.b = b
	}

	get width(): number {
		return this.r - this.l
	}

	get height(): number {
		return this.b - this.t
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

function getAllTexts($: CheerioAPI, rectType: RectType): PositionedText[] {
	switch (rectType) {
		case 'paragraph': {
			return [...$('par')].flatMap((par) => {
				const lines = [...$(par).find('line')].map((x) => getTabDelimitedTexts($, $(positioned(x))))
				return lines.length < 2 ? lines.flat() : mergeLines(lines.flatMap(mergeTabs))
			})
		}
		case 'line': {
			return [...$('line')].flatMap((x) => getTabDelimitedTexts($, $(positioned(x))))
		}
	}
}

const nonSpaceDelimitedScripts = ['Han', 'Hiragana', 'Katakana', 'Thai', 'Khmer', 'Lao', 'Myanmar', 'Javanese'] as const
const nonSpaceDelimitedExts = nonSpaceDelimitedScripts.map((x) => `\\p{Script_Extensions=${x}}` as const)
const fullWidthPunct = '！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？［＼］＾＿｀｛｜｝～'
const nonSpaceDelimitedPunct = '\\-/'
const nonSpaceDelimited = `[${[...nonSpaceDelimitedExts, fullWidthPunct, nonSpaceDelimitedPunct].join('')}]` as const
const nonSpaceDelimitedRe = new RegExp(nonSpaceDelimited, 'u')

/**
 * Merge the text from multiple hard-wrapped lines, joining with or without a space, depending on whether the preceeding
 * and following characters are typically space delimited or not.
 *
 * @example
 * ```ts
 * import { mergeLineTexts } from './imageMap.ts'
 * import { assertEquals } from 'std/assert/mod.ts'
 *
 * assertEquals(mergeLineTexts(['Some', 'multi-line', 'text']), 'Some multi-line text')
 * assertEquals(mergeLineTexts(['Some multi-', 'line text']), 'Some multi-line text')
 * assertEquals(mergeLineTexts(['跨行的', '文字']), '跨行的文字')
 * ```
 */
export function mergeLineTexts(lines: string[]): string {
	let text = ''
	for (const line of lines) {
		if (!text) text = line
		else {
			const prevChar = text.match(/.$/u)?.[0] ?? ''
			const nextChar = line.match(/^./u)?.[0] ?? ''
			if (!nonSpaceDelimitedRe.test(prevChar) && !nonSpaceDelimitedRe.test(nextChar)) {
				text += ' '
			}
			text += line
		}
	}
	return text
}

function mergeByStrategy(strategy: (texts: string[]) => string): (lines: PositionedText[]) => PositionedText[] {
	return (lines) =>
		lines.length < 2 ? lines : [{
			text: strategy(lines.map((l) => l.text)),
			rect: Rect.merge(lines.map((l) => l.rect)),
		}]
}

const mergeLines = mergeByStrategy(mergeLineTexts)
const mergeTabs = mergeByStrategy((texts) => texts.join('\t'))

function getRect($el: Cheerio<PositionedElement>): Rect {
	const l = Number($el.attr('l'))
	const t = Number($el.attr('t'))
	const r = Number($el.attr('r'))
	const b = Number($el.attr('b'))

	return new Rect({ l, t, r, b })
}

function getAspectRatio($el: Cheerio<PositionedElement>): number {
	const { width, height } = getRect($el)
	return width / height
}

function getTextContent($char: Cheerio<PositionedElement>): string {
	if ($char.attr('isTab')) return '\t'

	const text = $char.text()
	const isSoftTab = text.trim() === '' && getAspectRatio($char) > 1

	return isSoftTab ? '\t' : text
}

/**
 * @param $ - Cheerio context
 * @param $line - XML `<line>` element
 */
function getTabDelimitedTexts($: CheerioAPI, $line: Cheerio<PositionedElement>): PositionedText[] {
	const { l, t, r, b } = getRect($line)

	const texts: PositionedText[] = [{ text: '', rect: new Rect({ l, t, r, b }) }]

	for (const c of $line.find('charParams')) {
		const $char = $(positioned(c))
		const positionedText = texts.at(-1)!

		const text = getTextContent($char)

		if (text === '\t') {
			positionedText.rect.r = Number($char.attr('l'))
			texts.push({ text: '', rect: new Rect({ l: Number($char.attr('r')), t, r, b }) })
		} else {
			positionedText.text += text
		}
	}

	return texts
}
