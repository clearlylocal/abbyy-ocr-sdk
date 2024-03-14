// https://learn.microsoft.com/en-us/microsoft-edge/webview2/how-to/communicate-btwn-web-native
globalThis.chrome ??= {}
globalThis.chrome.webview ??= {
	callbacks: {},
	onmessage: null,
	async postMessage(data) {
		await new Promise((res) => setTimeout(res, 10))

		for (const cb of this.callbacks.message ?? []) {
			cb({ data })
		}

		this.onmessage?.({ data })
	},
	addEventListener(type, cb) {
		this.callbacks[type] ??= []
		this.callbacks[type].push(cb)
	},
}
