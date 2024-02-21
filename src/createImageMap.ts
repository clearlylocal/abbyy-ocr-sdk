import 'std/dotenv/load.ts'
import { join } from 'std/path/mod.ts'
import { load } from 'cheerio'
import type { Cheerio, CheerioAPI, Element } from 'cheerio'
import { OcrSdk } from './OcrSdk.ts'
import type { Language } from './types.ts'
import { escape } from 'std/html/entities.ts'

const applicationId = Deno.env.get('APPLICATION_ID')!
const password = Deno.env.get('PASSWORD')!
const serviceUrl = Deno.env.get('SERVICE_URL')!

const languages: Language[] = ['English']
const exportFormat = 'xml'
const dir = './samples'
const imageFileName = 'ocr-sample.jpg'
const imagePath = join(dir, imageFileName)
const outputPath = join(dir, 'image-map.html')

const ocrSdk = new OcrSdk(applicationId, password, serviceUrl)

const image = await Deno.readFile(imagePath)

const { rects } = getImgMapData(new TextDecoder().decode(await ocrSdk.ocr(image, { languages, exportFormat })), 'line')

await Deno.writeTextFile(
	outputPath,
	`<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>Image map for ${imageFileName}</title>
	</head>
	<body>
		<div class="container">
			<img draggable="false" src="${escape(imageFileName)}">\n${
		rects.map(({ text, rect }) => {
			return `\t\t\t<div class="rect" style="${
				Object.entries(rect).map(([k, v]) => `${k}: ${v}px;`).join('')
			}" title="${escape(text)}">${escape(text)}</div>`
		}).join('\n')
	}
		</div>
		<style>
			body {
				font-family: sans-serif;
			}

			.container {
				position: relative;
			}

			.container img {
				pointer-events: none;
				user-select: none;
			}

			.rect {
				position: absolute;
				outline: 3px solid hsl(0deg 100% 50%);
				color: hsl(0deg 0% 0% / 0.01);
				white-space: pre-wrap;
			}
		</style>
	</body>
</html>`,
)

function getImgMapData(xml: string, rectType: 'line' | 'block') {
	const $ = load(xml, { xml: true })

	return {
		rects: [...$(rectType)].map((x) => getTextData($(x as Element), $)).filter(Boolean) as TextData[],
	}
}

type TextData = {
	text: string
	rect: {
		left: number
		top: number
		width: number
		height: number
	}
}

function getTextData($x: Cheerio<Element>, $: CheerioAPI) {
	const l = Number($x.attr('l'))
	const t = Number($x.attr('t'))
	const b = Number($x.attr('b'))
	const r = Number($x.attr('r'))

	const rect = { left: l, top: t, width: r - l, height: b - t }

	const text = [...$x.find('charParams')]
		.map((c) => {
			const $c = $(c)
			if ($c.attr('isTab')) return '\t'.repeat(3)

			return $c.text()
		})
		.join('')
		.trim()

	return text ? { text, rect } : null
}
