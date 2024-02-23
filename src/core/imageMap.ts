import { load } from 'cheerio'
import type { Cheerio, CheerioAPI, Element } from 'cheerio'

// https://support.abbyy.com/hc/en-us/articles/360017270080-Output-XML-document

type RectType = 'paragraph' | 'line'
export type ImageMapOptions = { rectType: RectType }
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
			})
		}
		case 'line': {
			return [...$('line')].map((x) => getPositionedText($(x as Element), $))
		}
	}
}

function mergeLines(lines: PositionedText[]): PositionedText {
	return lines.length === 1 ? lines[0] : {
		text: lines.map((l) => l.text).join(' '),
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
