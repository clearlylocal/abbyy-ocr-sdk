import 'std/dotenv/load.ts'
import { basename, dirname, join } from 'std/path/mod.ts'
import { escape } from 'std/html/entities.ts'
import type { ImageMap } from '../../core/imageMap.ts'
import { _getImageMapParams } from './_getImageMapParams.ts'
import type { ImageMapGenerationOptions } from '../../core/types.ts'

function makeHtml(imageFileName: string, imageMap: ImageMap, template: string, templateName: string) {
	const { texts } = imageMap

	return template
		.replace(
			/^<!DOCTYPE[^>]+>/i,
			`$&\n<!-- Generated from template ${escape(templateName)} - do not edit directly -->`,
		)
		.replaceAll(/{{\s*title\s*}}/g, `Image map for ${escape(imageFileName)}`)
		.replaceAll(/(^\s+)?{{\s*image_map\s*}}/gm, (_, p1: string | undefined) => {
			const leadingSpace = p1 ?? ''

			return `${leadingSpace}<div data-cl-image-map>\n${
				leadingSpace + leadingSpace.charAt(0)
			}<img data-cl-img draggable="false" src="${escape(imageFileName)}">\n${
				texts.map(({ text, rect: { l, t, b, r } }) => {
					const rect = { left: l, top: t, width: r - l, height: b - t }

					return `${leadingSpace + leadingSpace.charAt(0)}<div data-cl-rect style="${
						Object.entries(rect).map(([k, v]) => `${k}: ${v}px;`).join(' ')
					}" title="${escape(text)}"><span data-cl-text>${escape(text)}</span></div>`
				}).join('\n')
			}\n${leadingSpace}</div>`
		})
}

export async function htmlImageMap(filePath: string, options: ImageMapGenerationOptions & { template: string }) {
	const dirName = dirname(filePath)

	const { imageMap, imageFileName, bareFileName } = await _getImageMapParams(filePath, options)

	const template = await Deno.readTextFile(options.template)
	const html = makeHtml(imageFileName, imageMap, template, basename(options.template))

	const outPath = join(dirName, `${bareFileName}-${basename(options.template).split('.')[0]}.html`)

	await Deno.writeTextFile(outPath, html)

	console.info(`Wrote to ${outPath}`)
	console.info('Done!')
}
