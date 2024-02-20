import 'std/dotenv/load.ts'
import { OcrSdk } from './OcrSdk.ts'
import type { ExportFormat, Language } from './types.ts'

const languages: Language[] = ['English']
const exportFormat: ExportFormat = 'txt'
const imagePath = './samples/ocr-sample.jpg'
const outputPath = './samples/result.txt'

const applicationId = Deno.env.get('APPLICATION_ID')!
const password = Deno.env.get('PASSWORD')!
const serviceUrl = Deno.env.get('SERVICE_URL')!

const ocrSdk = new OcrSdk(applicationId, password, serviceUrl)

const image = await Deno.readFile(imagePath)
const result = await ocrSdk.ocr(image, { languages, exportFormat })

console.info(`Result: ${new TextDecoder().decode(result).slice(0, 1000)}...`)

await Deno.writeFile(outputPath, result)

console.info('Done!')
