import { Command, EnumType } from 'cliffy/command/mod.ts'
import { convertImage } from './functions/convertImage.ts'
import { htmlImageMap } from './functions/htmlImageMap.ts'
import { jsonImageMap } from './functions/jsonImageMap.ts'
import { exportFormats, languages } from '../core/types.ts'

const ocrSdkParams = {
	applicationId: Deno.env.get('ABBYY_APPLICATION_ID')!,
	password: Deno.env.get('ABBYY_PASSWORD')!,
	serviceUrl: Deno.env.get('ABBYY_SERVICE_URL')!,
}

const language = [
	'-l, --language <type:language>',
	'Languages (default: "English")',
	{ required: false, collect: true },
] as const satisfies Parameters<Command['option']>

const convert = new Command()
	.type('language', new EnumType(languages))
	.option(...language)
	.type('output-format', new EnumType(exportFormats))
	.option('-o, --output <type:output-format>', 'Output formats (default: "txt")', { required: false, collect: true })
	.arguments('<path:file>')
	.action(async (params, path) => {
		const options = {
			...ocrSdkParams,
			exportFormats: params.output ?? ['txt'],
			languages: params.language ?? ['English'],
		}
		await convertImage(path, options)
	})

const html = new Command()
	.type('language', new EnumType(languages))
	.option(...language)
	.arguments('<path:file>')
	.action(async (params, path) => {
		const options = {
			...ocrSdkParams,
			languages: params.language ?? ['English'],
		}
		await htmlImageMap(path, options)
	})

const json = new Command()
	.type('language', new EnumType(languages))
	.option(...language)
	.arguments('<path:file>')
	.action(async (params, path) => {
		const options = {
			...ocrSdkParams,
			languages: params.language ?? ['English'],
		}
		await jsonImageMap(path, options)
	})

await new Command()
	.command('convert', convert)
	.command('html', html)
	.command('json', json)
	.parse(Deno.args)
