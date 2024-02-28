import 'std/dotenv/load.ts'
import { join } from 'std/path/mod.ts'
import { OcrSdk } from '../core/OcrSdk.ts'
import { imageMap } from '../core/imageMap.ts'

const applicationId = Deno.env.get('APPLICATION_ID')!
const password = Deno.env.get('PASSWORD')!
const serviceUrl = Deno.env.get('SERVICE_URL')!

const imageFileName = 'ocr-sample.jpg'
const dirName = 'samples'
const imagePath = join(dirName, imageFileName)
const bareFileName = imageFileName.split('.')[0]

const image = await Deno.readFile(imagePath)

const ocrSdk = new OcrSdk(applicationId, password, serviceUrl)

const { xml } = await ocrSdk.ocr(image, {
	languages: ['English'],
	exportFormats: ['xml'],
})

const map = imageMap(
	new TextDecoder().decode(await xml.arrayBuffer()),
	{ rectType: 'paragraph' },
)

await Deno.writeTextFile(
	join(dirName, `${bareFileName}-image-map.json`),
	JSON.stringify(map, null, '\t') + '\n',
)

console.info('Done!')
