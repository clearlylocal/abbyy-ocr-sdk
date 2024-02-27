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
			return [...$('par')].map((par) => {
				const lines = [...$(par).find('line')].map((x) => getPositionedText($(x as Element), $))
				return mergeLines(lines)
			}).filter((x): x is PositionedText => Boolean(x))
		}
		case 'line': {
			return [...$('line')].map((x) => getPositionedText($(x as Element), $))
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

function getPositionedText($x: Cheerio<Element>, $: CheerioAPI): PositionedText {
	const l = Number($x.attr('l'))
	const t = Number($x.attr('t'))
	const b = Number($x.attr('b'))
	const r = Number($x.attr('r'))

	const text = [...$x.find('charParams')]
		.map((c) => {
			const $c = $(c)
			if ($c.attr('isTab')) return '\t'

			return $c.text()
		})
		.join('')
		.trim()

	return { text, rect: { l, t, b, r } }
}
