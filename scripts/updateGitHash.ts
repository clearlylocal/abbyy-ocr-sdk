// update the git hash in ./saveAsTxt.node.mjs to import the latest JS-transpiled version of `OcrSdk.ts`

const commitHash = new TextDecoder().decode(
	(await new Deno.Command('git', {
		args: ['rev-parse', 'HEAD'],
	}).output()).stdout,
).trim()

const path = './src/saveAsTxt.node.mjs'
const js = await Deno.readTextFile(path)

await Deno.writeTextFile(path, js.replace(/(?<=\/clearlylocal\/abbyy-ocr-sdk\/)\w+/, commitHash))
