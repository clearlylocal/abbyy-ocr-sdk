import 'std/dotenv/load.ts'
import { OcrSdk } from '../core/OcrSdk.ts'
import { prettifyXml } from '../core/prettifyXml.ts'
import { join } from 'std/path/mod.ts'

const applicationId = Deno.env.get('APPLICATION_ID')!
const password = Deno.env.get('PASSWORD')!
const serviceUrl = Deno.env.get('SERVICE_URL')!

const imageFileName = 'ocr-sample.jpg'
const dirName = 'samples'
const imagePath = join(dirName, imageFileName)
const bareFileName = imageFileName.split('.')[0]

const image = await Deno.readFile(imagePath)

const ocrSdk = new OcrSdk(applicationId, password, serviceUrl)

const outputs = await ocrSdk.ocr(image, {
	languages: ['English'],
	exportFormats: ['txt', 'xml'],
})

for (const [ext, file] of Object.entries(outputs)) {
	let text = new TextDecoder().decode(await file.arrayBuffer()).replaceAll('\r\n', '\n')
	if (file.type === 'application/xml') text = prettifyXml(text)

	await Deno.writeTextFile(join(dirName, `${bareFileName}-result.${ext}`), text)
}

console.info('Done!')
