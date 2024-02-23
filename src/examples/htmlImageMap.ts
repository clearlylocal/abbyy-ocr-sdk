import 'std/dotenv/load.ts'
import { join } from 'std/path/mod.ts'
import { OcrSdk } from '../core/OcrSdk.ts'
import { escape } from 'std/html/entities.ts'
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

const { texts } = imageMap(
	new TextDecoder().decode(await xml.arrayBuffer()),
	{ rectType: 'paragraph' },
)

await Deno.writeTextFile(
	join(dirName, `${bareFileName}-image-map.html`),
	`<!DOCTYPE html>
<html lang="en">
	<head>
		<meta charset="utf-8">
		<title>Image map for ${imageFileName}</title>
	</head>
	<body>
		<div class="container">
			<img draggable="false" src="${escape(imageFileName)}">\n${
		texts.map(({ text, rect: { l, t, b, r } }) => {
			const rect = { left: l, top: t, width: r - l, height: b - t }

			return `\t\t\t<div class="rect" style="${
				Object.entries(rect).map(([k, v]) => `${k}: ${v}px;`).join(' ')
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

console.info('Done!')
