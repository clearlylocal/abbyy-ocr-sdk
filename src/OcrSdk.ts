import { completedTaskStatuses } from './types.ts'
import { ongoingTaskStatuses } from './types.ts'
import { OngoingTaskStatus } from './types.ts'
import { CompletedTaskStatus } from './types.ts'
import { taskStatuses } from './types.ts'
import type { CompletedTask, ImageProcessingSettings, OcrSdkOptions, OngoingTask, Task } from './types.ts'

const defaultOptions: OcrSdkOptions = {
	waitTimeout: 2000,
}

const defaultImageProcessingSettings: ImageProcessingSettings = {
	languages: ['English'],
	exportFormat: 'txt',
}

type GetTaskParams = [
	method: 'GET' | 'POST',
	urlPath: string,
	queryParams?: Record<string, string>,
	body?: BodyInit | null | undefined,
]

export class OcrSdk {
	public options: OcrSdkOptions

	#applicationId: string
	#password: string
	#serviceUrl: string

	/**
	 * To obtain an application ID and password, register at https://cloud.ocrsdk.com/Account/Register
	 * More info on getting your application id and password at https://ocrsdk.com/documentation/faq/#faq3
	 */
	constructor(applicationId: string, password: string, serviceUrl: string, options?: Partial<OcrSdkOptions>) {
		this.options = { ...defaultOptions, ...options }

		this.#applicationId = applicationId
		this.#password = password
		this.#serviceUrl = serviceUrl
	}

	/**
	 * OCR an image via the ABBYY Cloud OCR API
	 *
	 * @param image Binary data of image to be processed
	 * @param settings Settings for processing the image
	 *
	 * @returns Binary data of the output file, in the format specified by `settings.exportFormat` (default: `txt`)
	 */
	async ocr(image: Uint8Array, settings?: Partial<ImageProcessingSettings>) {
		const task = await this.#initOcrTask(image, settings)
		const result = await this.#waitForCompletion(task)
		return this.#getResult(result)
	}

	/**
	 * Upload file to server and start processing.
	 *
	 * @param image Binary data of image to be processed
	 * @param settings Image processing settings
	 * @returns Queued task
	 */
	#initOcrTask(image: Uint8Array, settings?: Partial<ImageProcessingSettings>) {
		const { languages, ...otherSettings } = { ...defaultImageProcessingSettings, ...settings }
		const params = { ...otherSettings, language: languages.join(',') }

		return this.#getTaskFromEndpoint('POST', 'processImage', params, image)
	}

	/**
	 * Get current task status.
	 * @param task Task in any status
	 * @returns Task with updated status
	 */
	#getTaskStatus(task: Task) {
		return this.#getTaskFromEndpoint('GET', 'getTaskStatus', { taskId: task.id })
	}

	/**
	 * Wait until task processing is finished.
	 * You need to check task status after processing to see if you can download result.
	 *
	 * @param task Task in any status
	 * @returns Completed task
	 */
	async #waitForCompletion(task: Task) {
		// Poll /getTaskStatus until task is completed.
		// Note: it's recommended to wait at least 2000 ms as the timeout between polling requests. Making requests more
		// often will not improve application performance.
		while (true) {
			await new Promise((res) => setTimeout(res, this.options.waitTimeout))

			task = await this.#getTaskStatus(task)
			if (isOngoing(task)) continue
			assertIsCompleted(task)

			return task
		}
	}

	/** Get result of document processing of a completed task */
	async #getResult(task: CompletedTask) {
		const res = await fetch(task.resultUrl)
		return new Uint8Array(await res.arrayBuffer())
	}

	#hydrateTask(obj: Record<string, unknown>) {
		const task: Record<string, unknown> = {}

		if (obj.taskId != null) task.id = String(obj.taskId)
		if (obj.status != null) task.status = String(obj.status)
		if (obj.error != null) task.error = String(obj.error)
		if (obj.registrationTime != null) task.registrationTime = new Date(String(obj.registrationTime))
		if (obj.statusChangeTime != null) task.statusChangeTime = new Date(String(obj.statusChangeTime))
		if (obj.filesCount != null) task.filesCount = Number(obj.filesCount)
		if (obj.credits != null) task.credits = Number(obj.credits)

		if (Array.isArray(obj.resultUrls)) {
			task.resultUrls = obj.resultUrls
			task.resultUrl = obj.resultUrls[0]
		}

		assertIsTask(task)

		return task
	}

	#getUrl(urlPath: string) {
		// https://support.abbyy.com/hc/en-us/sections/360004931659-API-v2-JSON-version
		return new URL(['v2', urlPath].join('/'), this.#serviceUrl)
	}

	#getHttpHeaders() {
		return {
			Authorization: `Basic ${btoa(`${this.#applicationId}:${this.#password}`)}`,
		}
	}

	/** Send request to the API with given method, path, parameters, and body, returning task data */
	async #getTaskFromEndpoint(...[method, urlPath, queryParams, body]: GetTaskParams): Promise<Task> {
		const url = this.#getUrl(urlPath)
		url.search = new URLSearchParams(Object.entries(queryParams ?? {})).toString()

		const res = await fetch(url, { method, headers: this.#getHttpHeaders(), body })

		if (!res.ok) {
			throw new Error(`API call to ${urlPath} returned status ${res.status}: ${await res.text()}`)
		}

		return this.#hydrateTask(await res.json())
	}
}

function assertIsTask(data: unknown): asserts data is Task {
	const { id, status } = data as Task

	if (typeof id !== 'string' || !taskStatuses.includes(status)) {
		throw new TypeError(`Invalid task data: ${JSON.stringify(data)}`)
	}
}

function assertIsCompleted(task: Task): asserts task is CompletedTask {
	const { status, resultUrl, resultUrls } = task

	if (resultUrl == null || resultUrls == null || !completedTaskStatuses.includes(status as CompletedTaskStatus)) {
		throw new TypeError(`Invalid completed task data: ${JSON.stringify(task)}`)
	}
}

function isOngoing(task: Task): task is OngoingTask {
	return ongoingTaskStatuses.includes(task.status as OngoingTaskStatus)
}
