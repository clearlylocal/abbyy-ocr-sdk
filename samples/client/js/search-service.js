/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

// https://www.fusejs.io/
import './fuse.js'

let loaded = false
const { promise, resolve } = Promise.withResolvers()
promise.then(() => loaded = true)
const getFuseInstance = () => promise

globalThis.chrome.webview.addEventListener('message', async ({ data }) => {
	switch (data.action) {
		case 'LOAD_SEGMENTS': {
			if (!loaded) {
				const { segments } = data
				const segmentIndex = Fuse.createIndex(['source', 'target'], segments)
				resolve(new Fuse(segments, { includeScore: true }, segmentIndex))
			}
			return
		}
		case 'SELECT_SEGMENT': {
			const { key, value } = data
			const fuse = await getFuseInstance()

			const results = fuse.search({ [key]: value })

			if (!results.length) {
				const result = {
					item: { id: '', source: '', target: '' },
					refIndex: -1,
					score: 1,
				}

				result.item[key] = value

				results.push(result)
			}

			globalThis.chrome.webview.postMessage({ action: 'POPULATE_EDITOR', results, index: 0 })
		}
	}
})
