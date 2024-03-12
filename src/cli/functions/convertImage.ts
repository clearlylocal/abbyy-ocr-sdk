import 'std/dotenv/load.ts'
import { OcrSdk } from '../../core/OcrSdk.ts'
import { prettifyXml } from '../../core/prettifyXml.ts'
import { basename, dirname, join } from 'std/path/mod.ts'
import type { ExportFormat, Language } from '../../core/types.ts'

type Options = {
	applicationId: string
	password: string
	serviceUrl: string

	exportFormats: ExportFormat[]
	languages: Language[]
}

export async function convertImage(imagePath: string, options: Options) {
	const { applicationId, password, serviceUrl, exportFormats, languages } = options

	const imageFileName = basename(imagePath)
	const dirName = dirname(imagePath)
	const bareFileName = imageFileName.split('.')[0]

	const image = await Deno.readFile(imagePath)

	const ocrSdk = new OcrSdk(applicationId, password, serviceUrl)

	const outputs = await ocrSdk.ocr(image, {
		exportFormats,
		languages,
	})

	for (const [ext, file] of Object.entries(outputs)) {
		let text = new TextDecoder().decode(await file.arrayBuffer()).replaceAll('\r\n', '\n')

		if (file.type === 'application/xml') {
			const { load } = await import('cheerio')
			const $ = load(text, { xml: true })
			const $block = $('<block blockType="Picture" blockName="cl:original-image"><pictureFile /></block>')
			$block.find('pictureFile').attr('path', imageFileName)
			$block.insertBefore($('page').eq(0).find('block').eq(0))

			text = prettifyXml($.xml())
		}

		const outPath = join(dirName, `${bareFileName}-result.${ext}`)
		await Deno.writeTextFile(outPath, text)

		console.info(`Wrote to ${outPath}`)
	}

	console.info('Done!')
}
