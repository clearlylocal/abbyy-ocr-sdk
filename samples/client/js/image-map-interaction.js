/// <reference lib="dom" />
/// <reference lib="dom.iterable" />

globalThis.chrome.webview.addEventListener('message', ({ data }) => {
	switch (data.action) {
		case 'LOAD_SEGMENTS': {
			const { segments } = data
			/** @type {Partial<Record<string, Segment>>} */
			const segmentsBySource = Object.groupBy(segments, (x) => x.source)

			for (const rect of document.querySelectorAll('[data-cl-rect]')) {
				rect.dataset.clNumDbMatches = String(segmentsBySource[rect.title]?.length ?? 0)
			}
			return
		}
	}
})

/** @typedef {{ x: number, y: number }} Point */

/** @param {number} n */
const px = (n) => `${Math.round(n)}px`

class DragState {
	/** @type {Point | null} */
	#start = null
	/** @type {Point | null} */
	#end = null
	/** @type {boolean} */
	#clicked = false
	/** @type {HTMLElement | null} */
	#rect = null
	/** @type {HTMLElement} */
	#imageMap

	/** @param {HTMLElement} imageMap */
	constructor(imageMap) {
		this.#imageMap = imageMap
	}

	get rect() {
		return this.#rect
	}

	get start() {
		return this.#start
	}
	set start(v) {
		this.#start = v

		this.#rect?.remove()

		this.#rect = document.createElement('div')
		this.#rect.dataset.clRect = ''
		this.#rect.dataset.clUserAdded = ''

		this.#rect.style.top = px(v.y)
		this.#rect.style.left = px(v.x)
		this.#rect.style.width = px(0)
		this.#rect.style.height = px(0)

		this.#imageMap.appendChild(this.#rect)
	}

	get end() {
		return this.#end
	}
	set end(v) {
		this.#end = v
		if (v && this.#rect) {
			this.#rect.style.top = px(Math.min(v.y, this.#start.y))
			this.#rect.style.left = px(Math.min(v.x, this.#start.x))
			this.#rect.style.width = px(Math.abs(v.x - this.#start.x))
			this.#rect.style.height = px(Math.abs(v.y - this.#start.y))
		}
	}

	get clicked() {
		return this.#clicked
	}
	set clicked(v) {
		if (this.#clicked && !v) {
			// is mouseup
			this.#rect.click()
		}

		if (!v && (!this.#end || !this.#start || (this.#start.x === this.#end.x && this.#start.y === this.#end.y))) {
			this.#rect?.remove()
		}

		if (v) this.#imageMap.dataset.clClicked = ''
		else delete this.#imageMap.dataset.clClicked

		this.#clicked = v
	}

	#resetState() {
		this.#start = null
		this.#end = null
		this.#rect = null
		this.#clicked = false
	}

	clear() {
		this.#rect?.remove()
		this.#resetState()
	}

	commit() {
		this.#resetState()
	}
}

/** @type {HTMLImageElement} */
const img = document.querySelector('[data-cl-img]')
/** @type {HTMLElement} */
const imageMap = document.querySelector('[data-cl-image-map]')

const dragState = new DragState(imageMap)

/**
 * @typedef {typeof btns[number]} ButtonName
 *
 * https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/buttons
 * - 1: Primary button (usually the left button)
 * - 2: Secondary button (usually the right button)
 * - 4: Auxiliary button (usually the mouse wheel button or middle button)
 * - 8: 4th button (typically the "Browser Back" button)
 * - 16: 5th button (typically the "Browser Forward" button)
 */
const btns = /** @type {const} */ (['left', 'right', 'wheel', 'back', 'forward'])

/**
 * @param {MouseEvent} e
 * @param {ButtonName} btn
 */
function mouseButtonPressed(e, btn) {
	// Use binary `&` with the relevant power of 2 to check if a given button is pressed
	return Boolean(e.buttons & (2 ** btns.indexOf(btn)))
}

/** @param {MouseEvent} e */
function mouseDownHandler(e) {
	const clicked = mouseButtonPressed(e, 'left')
	dragState.clicked = clicked

	if (!clicked) return

	e.preventDefault()
	dragState.start = { x: e.offsetX, y: e.offsetY }
	dragState.end = null
}

/** @param {MouseEvent} e */
function mouseChangeHandler(e) {
	const clicked = mouseButtonPressed(e, 'left')
	dragState.clicked = clicked

	if (!clicked) return

	e.preventDefault()
	dragState.end = { x: e.offsetX, y: e.offsetY }
}

img.addEventListener('mousedown', mouseDownHandler, false)

img.addEventListener('mouseup', mouseChangeHandler, false)
img.addEventListener('mousemove', mouseChangeHandler, false)

imageMap.addEventListener('click', (e) => {
	if (e.target.matches('[data-cl-rect]')) {
		/** @type {HTMLElement} */
		const rect = e.target

		for (const rect of document.querySelectorAll('[data-cl-current]')) {
			delete rect.dataset.clCurrent
		}
		rect.dataset.clCurrent = true

		if (!rect.matches('[data-cl-user-added]')) dragState.clear()

		globalThis.chrome.webview.postMessage({ action: 'SELECT_SEGMENT', key: 'source', value: rect.title ?? '' })
	}
})
