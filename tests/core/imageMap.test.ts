import { imageMap, mergeLineTexts, NON_SPACE_DELIMITED, Rect } from '../../src/core/imageMap.ts'
import { assertEquals } from 'std/assert/mod.ts'

const xml = String.raw

Deno.test(imageMap.name, async (t) => {
	// simplified xml format
	const xmlContent = xml`<page>
		<par>
			<line l="0" t="0" r="15" b="10">
				<charParams l="0" t="0" r="5" b="10">f</charParams>
				<charParams l="5" t="0" r="10" b="10">o</charParams>
				<charParams l="10" t="0" r="15" b="10">o</charParams>
			</line>
			<line l="0" t="10" r="15" b="20">
				<charParams l="0" t="10" r="5" b="20">b</charParams>
				<charParams l="5" t="10" r="10" b="20">a</charParams>
				<charParams l="10" t="10" r="15" b="20">r</charParams>
			</line>
		</par>
	</page>`

	await t.step('line', () => {
		const map = imageMap(xmlContent, { rectType: 'line' })
		assertEquals(map.texts, [
			{ text: 'foo', rect: new Rect({ l: 0, t: 0, r: 15, b: 10 }) },
			{ text: 'bar', rect: new Rect({ l: 0, t: 10, r: 15, b: 20 }) },
		])
	})

	await t.step('paragraph', () => {
		const map = imageMap(xmlContent, { rectType: 'paragraph' })
		assertEquals(map.texts, [
			{ text: 'foo bar', rect: new Rect({ l: 0, t: 0, r: 15, b: 20 }) },
		])
	})

	await t.step('paragraph (Chinese)', () => {
		const xmlContent = xml`<page>
			<par>
				<line l="0" t="0" r="15" b="10">
					<charParams l="0" t="0" r="5" b="10">福</charParams>
					<charParams l="5" t="0" r="10" b="10">呜</charParams>
					<charParams l="10" t="0" r="15" b="10">呜</charParams>
				</line>
				<line l="0" t="10" r="15" b="20">
					<charParams l="0" t="10" r="5" b="20">巴</charParams>
					<charParams l="5" t="10" r="10" b="20">啊</charParams>
					<charParams l="10" t="10" r="15" b="20">啊</charParams>
				</line>
			</par>
		</page>`

		const map = imageMap(xmlContent, { rectType: 'paragraph' })
		assertEquals(map.texts, [
			{ text: '福呜呜巴啊啊', rect: new Rect({ l: 0, t: 0, r: 15, b: 20 }) },
		])
	})

	await t.step('non-tab space', () => {
		const xmlContent = xml`<page>
			<par>
				<line l="0" t="0" r="35" b="10">
					<charParams l="0" t="0" r="5" b="10">f</charParams>
					<charParams l="5" t="0" r="10" b="10">o</charParams>
					<charParams l="10" t="0" r="15" b="10">o</charParams>
					<charParams l="15" t="0" r="20" b="10"> </charParams>
					<charParams l="20" t="0" r="25" b="10">b</charParams>
					<charParams l="25" t="0" r="30" b="10">a</charParams>
					<charParams l="30" t="0" r="35" b="10">r</charParams>
				</line>
			</par>
		</page>`

		const map = imageMap(xmlContent)
		assertEquals(map.texts, [
			{ text: 'foo bar', rect: new Rect({ l: 0, t: 0, r: 35, b: 10 }) },
		])
	})

	await t.step('hard tab within single line splits rects', () => {
		const xmlContent = xml`<page>
			<par>
				<line l="0" t="0" r="35" b="10">
					<charParams l="0" t="0" r="5" b="10">f</charParams>
					<charParams l="5" t="0" r="10" b="10">o</charParams>
					<charParams l="10" t="0" r="15" b="10">o</charParams>
					<charParams l="15" t="0" r="20" b="10" isTab="1"> </charParams>
					<charParams l="20" t="0" r="25" b="10">b</charParams>
					<charParams l="25" t="0" r="30" b="10">a</charParams>
					<charParams l="30" t="0" r="35" b="10">r</charParams>
				</line>
			</par>
		</page>`

		const map = imageMap(xmlContent)
		assertEquals(map.texts, [
			{ text: 'foo', rect: new Rect({ l: 0, t: 0, r: 15, b: 10 }) },
			{ text: 'bar', rect: new Rect({ l: 20, t: 0, r: 35, b: 10 }) },
		])
	})

	await t.step('soft tab (space with width > height) within single line splits rects', () => {
		const xmlContent = xml`<page>
			<par>
				<line l="0" t="0" r="45" b="10">
					<charParams l="0" t="0" r="5" b="10">f</charParams>
					<charParams l="5" t="0" r="10" b="10">o</charParams>
					<charParams l="10" t="0" r="15" b="10">o</charParams>
					<charParams l="15" t="0" r="30" b="10"> </charParams>
					<charParams l="30" t="0" r="35" b="10">b</charParams>
					<charParams l="35" t="0" r="40" b="10">a</charParams>
					<charParams l="40" t="0" r="45" b="10">r</charParams>
				</line>
			</par>
		</page>`

		const map = imageMap(xmlContent)
		assertEquals(map.texts, [
			{ text: 'foo', rect: new Rect({ l: 0, t: 0, r: 15, b: 10 }) },
			{ text: 'bar', rect: new Rect({ l: 30, t: 0, r: 45, b: 10 }) },
		])
	})

	await t.step('soft tab within multi-line paragraph adds literal tab char', () => {
		const xmlContent = xml`<page>
			<par>
				<line l="0" t="0" r="45" b="20">
					<charParams l="0" t="0" r="5" b="10">f</charParams>
					<charParams l="5" t="0" r="10" b="10">o</charParams>
					<charParams l="10" t="0" r="15" b="10">o</charParams>
					<charParams l="15" t="0" r="30" b="10"> </charParams>
					<charParams l="30" t="0" r="35" b="10">b</charParams>
					<charParams l="35" t="0" r="40" b="10">a</charParams>
					<charParams l="40" t="0" r="45" b="10">r</charParams>
				</line>
				<line l="0" t="0" r="15" b="10">
					<charParams l="0" t="10" r="5" b="20">b</charParams>
					<charParams l="5" t="10" r="10" b="20">a</charParams>
					<charParams l="10" t="10" r="15" b="20">z</charParams>
				</line>
			</par>
		</page>`

		const map = imageMap(xmlContent)
		assertEquals(map.texts, [
			{ text: 'foo\tbar baz', rect: new Rect({ l: 0, t: 0, r: 45, b: 20 }) },
		])
	})
})

Deno.test(mergeLineTexts.name, async (t) => {
	await t.step('English', async (t) => {
		await t.step('basic', () => {
			const result = mergeLineTexts(['one', 'two'])
			assertEquals(result, 'one two')
		})

		await t.step('period', () => {
			const result = mergeLineTexts(['one.', 'two'])
			assertEquals(result, 'one. two')
		})

		await t.step('comma', () => {
			const result = mergeLineTexts(['one,', 'two'])
			assertEquals(result, 'one, two')
		})

		await t.step('hyphen', () => {
			const result = mergeLineTexts(['Some multi-', 'line text'])
			assertEquals(result, 'Some multi-line text')
		})
	})

	await t.step('Chinese', async (t) => {
		await t.step('basic', () => {
			const result = mergeLineTexts(['一', '二'])
			assertEquals(result, '一二')
		})

		await t.step('period', () => {
			const result = mergeLineTexts(['一。', '二'])
			assertEquals(result, '一。二')
		})

		await t.step('comma', () => {
			const result = mergeLineTexts(['一，', '二'])
			assertEquals(result, '一，二')
		})

		await t.step('enum comma', () => {
			const result = mergeLineTexts(['一、', '二'])
			assertEquals(result, '一、二')
		})
	})
})

Deno.test('NON_SPACE_DELIMITED regex', async (t) => {
	await t.step('literal', () => {
		// Logic to re-create the regular expression dynamically. We keep it under `tests`, rather than building the
		// regex each time at runtime, for performance reasons.
		const scripts = ['Han', 'Hiragana', 'Katakana', 'Thai', 'Khmer', 'Lao', 'Myanmar', 'Javanese'] as const
		const exts = scripts.map((x) => `\\p{scx=${x}}` as const)
		const fullWidthPunct = '！＂＃＄％＆＇（）＊＋，－．／：；＜＝＞？［＼］＾＿｀｛｜｝～'
		const nonSpaceDelimitedPunct = '\\-/'
		const alreadySpace = '\\p{White_Space}'
		const source = `[${[nonSpaceDelimitedPunct, alreadySpace, ...exts, fullWidthPunct].join('')}]` as const

		assertEquals(NON_SPACE_DELIMITED, new RegExp(source, 'u'))
	})

	function assertNumNonSpaceDelimitedMatches(str: string, expected: number) {
		const globalRe = new RegExp(NON_SPACE_DELIMITED.source, NON_SPACE_DELIMITED.flags + 'g')
		const numMatches = [...str.matchAll(globalRe)].length
		assertEquals(numMatches, expected)
	}

	await t.step('matches Chinese', () => {
		assertNumNonSpaceDelimitedMatches('文字、标点符号', 7)
	})

	await t.step('doesn’t match empty string', () => {
		assertNumNonSpaceDelimitedMatches('', 0)
	})

	await t.step('doesn’t match Latin alphabet', () => {
		assertNumNonSpaceDelimitedMatches('abcdefg', 0)
	})

	await t.step('matches text that’s already whitespace itself', () => {
		const nbsp = '\xa0'
		assertNumNonSpaceDelimitedMatches(` \t\n${nbsp}`, 4)
	})
})
