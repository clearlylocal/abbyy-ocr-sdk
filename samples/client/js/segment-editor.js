/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

/** @typedef {typeof segments[number]} Segment */
// deno-fmt-ignore
const segments = [{"id":"018a82","source":"Credit Card Bill","target":"信用卡账单"},{"id":"da1ad1","source":"This is a bill in which you have to pay. If you do not pay within one (1) month, a $250.00 fine is assessed.","target":"这是您必须支付的账单。如果您在一（1）个月内不支付，将被处以 250 美元的罚款。"},{"id":"206664","source":"Name: John Phillips","target":"姓名： 约翰-菲利普斯约翰-菲利普斯"},{"id":"8ea9b1","source":"Phone: (123) 456-7890","target":"电话：(123) 456-7890"},{"id":"41778c","source":"Address 123 Main Street CC Number: XXXXXXXXXXXX1234","target":"地址 123 Main Street CC 号码XXXXXXXXXXXX1234"},{"id":"28fc1b","source":"San Francisco. CA12345","target":"旧金山。CA12345"},{"id":"198bdc","source":"Bill Received: 01/16/1968","target":"收到账单：01/16/1968"},{"id":"d6a8c0","source":"Your Transactions","target":"您的交易"},{"id":"c2479d","source":"Item","target":"项目"},{"id":"3c9d7c","source":"Price","target":"价格"},{"id":"495fcf","source":"The ABC Store - Cookies","target":"ABC 商店 - 饼干"},{"id":"198ba5","source":"$2.81","target":"$2.81"},/* {"id":"69b9e4","source":"Orville's Bakery - Donuts","target":"奥维尔面包店 - 甜甜圈"}, */{"id":"565bcb","source":"$5.95","target":"$5.95"},{"id":"bdbe82","source":"Stan's Gas Station -10 Gallons of Gas","target":"斯坦加油站 -10加仑汽油"},{"id":"d7c011","source":"$40.00","target":"$40.00"},{"id":"b87f2a","source":"Total: $48.76","target":"共计：48.76 美元"},{"id":"c516ad","source":"$40.00","target":"$40.00"},{"id":"b05cd4","source":"Item","target":"物品"}]

window.segments = segments

globalThis.chrome.webview.postMessage({ action: 'LOAD_SEGMENTS', segments })

let results = null

const resultsTable = document.getElementById('search-results')
const tbody = resultsTable.querySelector('tbody')

function populateResultsTable(newResults, index) {
	if (newResults !== results) {
		tbody.textContent = ''

		for (const { item: { id, source, target }, score } of newResults) {
			const tr = document.createElement('tr')
			for (
				const v of [
					id,
					source,
					target,
					new Intl.NumberFormat('en-US', { style: 'percent' }).format(1 - score),
				]
			) {
				const td = document.createElement('td')
				td.textContent = v
				tr.appendChild(td)
			}
			tbody.appendChild(tr)
		}
	}

	for (const [idx, row] of [...tbody.querySelectorAll('tr')].entries()) {
		row.classList[idx === index ? 'add' : 'remove']('selected')
	}
}

resultsTable.addEventListener('click', (e) => {
	const row = e.target.closest('tbody tr')
	if (results && row) {
		const id = row.querySelector('td:first-child').textContent

		const index = results.findIndex((x) => x.item.id === id)
		globalThis.chrome.webview.postMessage({ action: 'POPULATE_EDITOR', index })
	}
})

globalThis.chrome.webview.addEventListener('message', ({ data }) => {
	switch (data.action) {
		case 'POPULATE_EDITOR': {
			const { index } = data

			const r = data.results ?? results
			const segment = r[index]?.item ?? { id: '', source: '', target: '' }

			document.querySelector('[name=id]').value = segment.id
			document.querySelector('[name=source]').value = segment.source
			document.querySelector('[name=target]').value = segment.target

			populateResultsTable(r, index)
			if (data.results) results = data.results

			return
		}
	}
})
