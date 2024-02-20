import 'std/dotenv/load.ts'
import { load } from 'cheerio'
import type { Cheerio, CheerioAPI, Element } from 'cheerio'
import { OcrSdk } from './OcrSdk.ts'
import type { Language } from './types.ts'
import { encodeBase64 } from 'std/encoding/base64.ts'
import { escape } from 'std/html/entities.ts'

const languages: Language[] = ['English']
const exportFormat = 'xml'
const imagePath = './samples/ocr-sample.jpg'
const outputPath = './samples/image-map.html'

const applicationId = Deno.env.get('APPLICATION_ID')!
const password = Deno.env.get('PASSWORD')!
const serviceUrl = Deno.env.get('SERVICE_URL')!

const ocrSdk = new OcrSdk(applicationId, password, serviceUrl)

const image = await Deno.readFile(imagePath)

const dataUri = `data:image/jpg;base64,${encodeBase64(image)}`

const { rects } = getImgMapData(new TextDecoder().decode(await ocrSdk.ocr(image, { languages, exportFormat })), 'line')

await Deno.writeTextFile(
	outputPath,
	`<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<title>Image map for ${imagePath.split('/').at(-1)}</title>
</head>
<body>
<div class="container">
	<img src=${dataUri}>
	${
		rects.map((rect) => {
			return `<div class="rect" style="${
				Object.entries({
					left: rect.l,
					top: rect.t,
					width: rect.r - rect.l,
					height: rect.b - rect.t,
				}).map(([k, v]) => `${k}: ${v}px;`).join(' ')
			}" title="${escape(rect.text)}"></div>`
		}).join('\n')
	}
</div>
<style>
.container {
	position: relative;
}

.rect {
	position: absolute;
	outline: 10px solid red;
}
</style>
</body>
</html>`,
)

function getImgMapData(xml: string, rectType: 'line' | 'block') {
	const $ = load(xml, { xml: true })

	return {
		rects: [...$(rectType)].map((x) => getRectData($(x as Element), $)).filter(Boolean) as RectData[],
	}
}

type RectData = {
	text: string
	l: number
	t: number
	b: number
	r: number
}

function getRectData($x: Cheerio<Element>, $: CheerioAPI) {
	const l = Number($x.attr('l'))
	const t = Number($x.attr('t'))
	const b = Number($x.attr('b'))
	const r = Number($x.attr('r'))

	const text = [...$x.find('charParams')]
		.map((c) => {
			const $c = $(c)
			if ($c.attr('isTab')) return '\n'

			return $c.text()
		})
		.join('')
		.trim()

	return text ? { text, l, t, b, r } : null
}
