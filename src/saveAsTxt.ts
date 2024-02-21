import 'std/dotenv/load.ts'
import { OcrSdk } from './OcrSdk.ts'
import type { ExportFormat, Language } from './types.ts'

const applicationId = Deno.env.get('APPLICATION_ID')!
const password = Deno.env.get('PASSWORD')!
const serviceUrl = Deno.env.get('SERVICE_URL')!

const languages: Language[] = ['English']
const exportFormat: ExportFormat = 'txt'
const imagePath = './samples/ocr-sample.jpg'
const outputPath = './samples/result.txt'

const image = await Deno.readFile(imagePath)

const ocrSdk = new OcrSdk(applicationId, password, serviceUrl)
const result = await ocrSdk.ocr(image, { languages, exportFormat })

const text = new TextDecoder().decode(result).replaceAll('\r\n', '\n')
console.info(`Result: ${text}`)

await Deno.writeTextFile(outputPath, text)

console.info('Done!')
