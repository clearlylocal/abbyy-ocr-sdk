import 'std/dotenv/load.ts'
import { dirname, join } from 'std/path/mod.ts'
import { _getImageMapParams } from './_getImageMapParams.ts'
import type { ImageMapGenerationOptions } from '../../core/types.ts'

export async function jsonImageMap(filePath: string, options: ImageMapGenerationOptions) {
	const dirName = dirname(filePath)

	const { imageMap, bareFileName } = await _getImageMapParams(filePath, options)

	const outPath = join(dirName, `${bareFileName}-image-map.json`)

	await Deno.writeTextFile(outPath, JSON.stringify(imageMap, null, '\t') + '\n')

	console.info(`Wrote to ${outPath}`)
	console.info('Done!')
}
