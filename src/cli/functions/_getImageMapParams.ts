import { basename } from 'std/path/basename.ts'
import { OcrSdk } from '../../core/OcrSdk.ts'
import { type ImageMap, imageMap } from '../../core/imageMap.ts'
import type { ImageMapGenerationOptions } from '../../core/types.ts'

export async function _getImageMapParams(
	filePath: string,
	options: ImageMapGenerationOptions,
): Promise<{ imageFileName: string; xml: string; bareFileName: string; imageMap: ImageMap }> {
	const { applicationId, password, serviceUrl, languages } = options

	const fileName = basename(filePath)
	const segs = fileName.split('.')
	const ext = segs.at(-1)!

	let imageFileName: string
	let xml: string
	let bareFileName: string

	if (ext === 'xml') {
		const { load } = await import('cheerio')
		xml = await Deno.readTextFile(filePath)
		const $ = load(xml)
		imageFileName = $('block[blockName="cl:original-image"] pictureFile').attr('path') ?? ''
		bareFileName = imageFileName.split('.')[0]
	} else {
		imageFileName = fileName
		bareFileName = segs[0]
		const image = await Deno.readFile(filePath)

		const ocrSdk = new OcrSdk(applicationId, password, serviceUrl)

		const output = await ocrSdk.ocr(image, {
			languages,
			exportFormats: ['xml'],
		})

		xml = new TextDecoder().decode(await output.xml.arrayBuffer())
	}

	return { xml, imageMap: imageMap(xml), imageFileName, bareFileName }
}
