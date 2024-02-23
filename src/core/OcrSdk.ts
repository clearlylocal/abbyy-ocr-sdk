import { completedTaskStatuses, ongoingTaskStatuses, taskStatuses } from './types.ts'
import type {
	CompletedTask,
	CompletedTaskStatus,
	ExportFormat,
	ImageProcessingSettings,
	OcrSdkOptions,
	OngoingTask,
	OngoingTaskStatus,
	Task,
} from './types.ts'

const defaultOptions: OcrSdkOptions = {
	waitTimeout: 2000,
}

type QueryParamMap = Partial<Record<string, string | boolean>>
type GetTaskParams = [
	method: 'GET' | 'POST',
	urlPath: string,
	queryParams?: QueryParamMap,
	body?: BodyInit | null | undefined,
]

type ImageBinary = Blob | BufferSource | ReadableStream<Uint8Array>

export class OcrSdk {
	public options: OcrSdkOptions

	#applicationId: string
	#password: string
	#serviceUrl: string

	/**
	 * To obtain an application ID and password, register at https://cloud.ocrsdk.com/Account/Register
	 * More info on getting your application id and password at https://support.abbyy.com/hc/en-us/articles/360017270140-FAQ#application-id
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
	 * @param settings Image processing settings
	 * @returns Binary data of the output file, in the format specified by `settings.exportFormat`
	 */
	async ocr<T extends ExportFormat>(image: ImageBinary, settings: ImageProcessingSettings<T>) {
		const task = await this.#initOcrTask(image, settings)
		const result = await this.#waitForCompletion(task)
		return this.#getResults(result, settings.exportFormats)
	}

	/**
	 * Upload file to server and start processing.
	 *
	 * @param image Binary data of image to be processed
	 * @param settings Image processing settings
	 * @returns Queued task
	 */
	#initOcrTask<T extends ExportFormat>(image: ImageBinary, settings: ImageProcessingSettings<T>) {
		const { languages, exportFormats, ...otherSettings } = settings
		const params = { ...otherSettings, language: languages.join(','), exportFormat: exportFormats.join(',') }

		// https://support.abbyy.com/hc/en-us/articles/360017269680-processImage-Method
		return this.#getTaskFromEndpoint('POST', 'processImage', params, image)
	}

	/**
	 * Get current task status.
	 * @param task Task in any status
	 * @returns Task with updated status
	 */
	#getTaskStatus(task: Task) {
		// https://support.abbyy.com/hc/en-us/articles/360017269860-getTaskStatus-Method
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
	async #getResults<T extends ExportFormat>(task: CompletedTask, exportFormats: readonly T[]) {
		return Object.fromEntries(
			await Promise.all(task.resultUrls.map(async (resultUrl, idx) => {
				const res = await fetch(resultUrl)
				const contentType = res.headers.get('Content-Type')
				const lastModified = res.headers.get('Last-Modified')

				const file = new File([await res.arrayBuffer()], new URL(resultUrl).pathname.split('/').at(-1)!, {
					type: contentType ?? undefined,
					lastModified: lastModified ? new Date(lastModified).valueOf() : undefined,
				})

				return [exportFormats[idx], file] as const
			})),
		) as Record<T, File>
	}

	#hydrateTask(obj: Record<string, unknown>) {
		const task: Partial<Task> = {}

		if (obj.taskId != null) task.id = String(obj.taskId)
		if (obj.status != null) task.status = String(obj.status) as Task['status']
		if (obj.error != null) task.error = String(obj.error)
		if (obj.registrationTime != null) task.registrationTime = new Date(String(obj.registrationTime))
		if (obj.statusChangeTime != null) task.statusChangeTime = new Date(String(obj.statusChangeTime))
		if (obj.filesCount != null) task.filesCount = Number(obj.filesCount)
		if (obj.credits != null) task.credits = Number(obj.credits)
		if (Array.isArray(obj.resultUrls)) task.resultUrls = obj.resultUrls.map(String)

		assertIsTask(task)

		return task
	}

	#getApiUrl(path: string, queryParams?: QueryParamMap) {
		// https://support.abbyy.com/hc/en-us/sections/360004931659-API-v2-JSON-version
		const url = new URL(['v2', path].join('/'), this.#serviceUrl)
		for (const [k, v] of Object.entries(queryParams ?? {})) url.searchParams.set(k, String(v))
		return url
	}

	#getHttpHeaders() {
		return {
			Authorization: `Basic ${btoa(`${this.#applicationId}:${this.#password}`)}`,
		}
	}

	/** Send request to the API with given method, path, parameters, and body, returning task data */
	async #getTaskFromEndpoint(...[method, urlPath, queryParams, body]: GetTaskParams): Promise<Task> {
		const url = this.#getApiUrl(urlPath, queryParams)

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
	const { status, resultUrls } = task

	if (resultUrls == null || !completedTaskStatuses.includes(status as CompletedTaskStatus)) {
		throw new TypeError(`Invalid completed task data: ${JSON.stringify(task)}`)
	}
}

function isOngoing(task: Task): task is OngoingTask {
	return ongoingTaskStatuses.includes(task.status as OngoingTaskStatus)
}
