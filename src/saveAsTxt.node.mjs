#!/usr/bin/env -S node --env-file .env --experimental-network-imports

import { OcrSdk } from 'https://exports.deno.dev/s/https://raw.githubusercontent.com/clearlylocal/abbyy-ocr-sdk/fd975e4ecbe14f1c051fc2ca2638044525267985/src/OcrSdk.ts'
import { promises as fs } from 'fs'

const applicationId = process.env.APPLICATION_ID
const password = process.env.PASSWORD
const serviceUrl = process.env.SERVICE_URL

const languages = ['English']
const exportFormat = 'txt'
const imagePath = './samples/ocr-sample.jpg'
const outputPath = './samples/result.txt'

const image = await fs.readFile(imagePath)

const ocrSdk = new OcrSdk(applicationId, password, serviceUrl)
const result = await ocrSdk.ocr(image, { languages, exportFormat })

const text = new TextDecoder().decode(result).replaceAll('\r\n', '\n')
console.info(`Result: ${text}`)

await fs.writeFile(outputPath, text)

console.info('Done!')
