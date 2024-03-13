import { imageMap, mergeLineTexts, Rect } from '../../src/core/imageMap.ts'
import { assertEquals } from 'std/assert/mod.ts'

Deno.test(imageMap.name, async (t) => {
	// simplified xml format
	const xml = `<page>
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
		const map = imageMap(xml, { rectType: 'line' })
		assertEquals(map.texts, [
			{ text: 'foo', rect: new Rect({ l: 0, t: 0, r: 15, b: 10 }) },
			{ text: 'bar', rect: new Rect({ l: 0, t: 10, r: 15, b: 20 }) },
		])
	})

	await t.step('paragraph', () => {
		const map = imageMap(xml, { rectType: 'paragraph' })
		assertEquals(map.texts, [
			{ text: 'foo bar', rect: new Rect({ l: 0, t: 0, r: 15, b: 20 }) },
		])
	})

	await t.step('non-tab space', () => {
		const xml = `<page>
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

		const map = imageMap(xml)
		assertEquals(map.texts, [
			{ text: 'foo bar', rect: new Rect({ l: 0, t: 0, r: 35, b: 10 }) },
		])
	})

	await t.step('hard tab within single line splits rects', () => {
		const xml = `<page>
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

		const map = imageMap(xml)
		assertEquals(map.texts, [
			{ text: 'foo', rect: new Rect({ l: 0, t: 0, r: 15, b: 10 }) },
			{ text: 'bar', rect: new Rect({ l: 20, t: 0, r: 35, b: 10 }) },
		])
	})

	await t.step('soft tab (space with width > height) within single line splits rects', () => {
		const xml = `<page>
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

		const map = imageMap(xml)
		assertEquals(map.texts, [
			{ text: 'foo', rect: new Rect({ l: 0, t: 0, r: 15, b: 10 }) },
			{ text: 'bar', rect: new Rect({ l: 30, t: 0, r: 45, b: 10 }) },
		])
	})

	await t.step('soft tab within multi-line paragraph adds literal tab char', () => {
		const xml = `<page>
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

		const map = imageMap(xml)
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
