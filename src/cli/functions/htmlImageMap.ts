import 'std/dotenv/load.ts'
import { basename, dirname, join } from 'std/path/mod.ts'
import { OcrSdk } from '../../core/OcrSdk.ts'
import { escape } from 'std/html/entities.ts'
import { imageMap } from '../../core/imageMap.ts'
import type { Language } from '../../core/types.ts'

type Options = {
	applicationId: string
	password: string
	serviceUrl: string

	languages: Language[]
}

export async function htmlImageMap(imagePath: string, options: Options) {
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

	const { texts } = imageMap(
		new TextDecoder().decode(await xml.arrayBuffer()),
		{ rectType: 'paragraph' },
	)

	const outPath = join(dirName, `${bareFileName}-image-map.html`)

	await Deno.writeTextFile(
		outPath,
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

	console.info(`Wrote to ${outPath}`)
	console.info('Done!')
}
