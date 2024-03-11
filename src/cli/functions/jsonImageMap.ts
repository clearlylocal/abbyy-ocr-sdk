import 'std/dotenv/load.ts'
import { basename, dirname, join } from 'std/path/mod.ts'
import { OcrSdk } from '../../core/OcrSdk.ts'
import { imageMap } from '../../core/imageMap.ts'
import type { Language } from '../../core/types.ts'

type Options = {
	applicationId: string
	password: string
	serviceUrl: string

	languages: Language[]
}

export async function jsonImageMap(imagePath: string, options: Options) {
	const { applicationId, password, serviceUrl, languages } = options

	const imageFileName = basename(imagePath)
	const dirName = dirname(imagePath)
	const bareFileName = imageFileName.split('.')[0]

	const image = await Deno.readFile(imagePath)

	const ocrSdk = new OcrSdk(applicationId, password, serviceUrl)

	const { xml } = await ocrSdk.ocr(image, {
		languages,
		exportFormats: ['xml'],
	})

	const map = imageMap(
		new TextDecoder().decode(await xml.arrayBuffer()),
		{ rectType: 'paragraph' },
	)

	const outPath = join(dirName, `${bareFileName}-image-map.json`)

	await Deno.writeTextFile(outPath, JSON.stringify(map, null, '\t') + '\n')

	console.info(`Wrote to ${outPath}`)
	console.info('Done!')
}
