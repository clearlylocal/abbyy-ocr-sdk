import { load } from 'cheerio'
import { taskStatuses } from './types.ts'
import type { CompletedTaskData, ImageProcessingSettings, OcrSdkOptions, TaskData } from './types.ts'

const defaultOptions: OcrSdkOptions = {
	waitTimeout: 2000,
}

const defaultImageProcessingSettings: ImageProcessingSettings = {
	languages: ['English'],
	exportFormat: 'txt',
}

export class OcrSdk {
	options: OcrSdkOptions

	/**
	 * To obtain an application ID and password, register at https://cloud.ocrsdk.com/Account/Register
	 * More info on getting your application id and password at https://ocrsdk.com/documentation/faq/#faq3
	 */
	constructor(
		private applicationId: string,
		private password: string,
		private serviceUrl: string,
		options?: Partial<OcrSdkOptions>,
	) {
		this.options = {
			...defaultOptions,
			...options,
		}
	}

	/**
	 * Upload file to server and start processing.
	 *
	 * @param image Binary data of image to be processed
	 * @param settings Image processing settings
	 */
	processImage(image: Uint8Array, settings?: Partial<ImageProcessingSettings>) {
		const { languages, ...otherSettings } = {
			...defaultImageProcessingSettings,
			...settings,
		}
		const params = {
			...otherSettings,
			language: languages.join(','),
		}

		return this.#createTaskRequest(
			'POST',
			'/processImage',
			params,
			image,
		)
	}

	/**
	 * Get current task status.
	 *
	 * @param taskId Identifier as returned in `taskData.id`
	 */
	getTaskStatus(taskId: string) {
		return this.#createTaskRequest(
			'GET',
			'/getTaskStatus',
			{ taskId },
		)
	}

	isTaskActive(taskData: TaskData) {
		return taskData.status === 'Queued' || taskData.status === 'InProgress'
	}

	/** Convenience method for sending for processing, waiting until completion, then getting the result */
	async ocr(image: Uint8Array, settings?: Partial<ImageProcessingSettings>) {
		const taskData = await this.processImage(image, settings)
		const resultData = await this.waitForCompletion(taskData.id)
		return this.getResult(resultData.resultUrl)
	}

	/**
	 * Wait until task processing is finished.
	 * You need to check task status after processing to see if you can download result.
	 *
	 * @param taskId Task identifier as returned in `taskData.id`
	 */
	async waitForCompletion(taskId: string) {
		// Call getTaskStatus every several seconds until task is completed.
		// Note: it's recommended that your application waits at least 2 seconds before making the first getTaskStatus
		// request and also between such requests for the same task. Making requests more often will not improve your
		// application performance.
		// Note: if your application queues several files and waits for them, it's recommended that you use
		// `listFinishedTasks` instead (see https://ocrsdk.com/documentation/apireference/listFinishedTasks/).

		while (true) {
			await new Promise((res) => setTimeout(res, this.options.waitTimeout))

			const taskData = await this.getTaskStatus(taskId)

			if (this.isTaskActive(taskData)) {
				continue
			}

			assertIsCompleted(taskData)

			return taskData
		}
	}

	/** Get result of document processing. Task needs to be in 'Completed' state to call this function. */
	async getResult(resultUrl: string) {
		const res = await fetch(resultUrl)
		return new Uint8Array(await res.arrayBuffer())
	}

	/** Create http GET or POST request to cloud service with given path and parameters. */
	async #createTaskRequest(
		method: 'GET' | 'POST',
		urlPath: string,
		queryParams: Record<string, string>,
		body?: BodyInit | null | undefined,
	): Promise<TaskData> {
		const url = new URL(urlPath, this.serviceUrl)
		url.search = new URLSearchParams(Object.entries(queryParams)).toString()

		const headers = {
			Authorization: `Basic ${btoa(`${this.applicationId}:${this.password}`)}`,
		}

		const res = await fetch(url, { method, headers, body })

		if (!res.ok) {
			throw new Error(`API call returned status ${res.status}`)
		}

		const xml = await res.text()

		const $ = load(xml, { xml: true })

		const $task = $('response task')
		const $error = $('error message')

		if (!$task.length) {
			throw new Error($error.text() ?? 'Unknown server response')
		}

		const taskData = {
			id: $task.attr('id'),
			status: $task.attr('status'),
			resultUrl: $task.attr('resultUrl'),
		} as { error?: string }

		if ($error.length) {
			taskData.error = $error.text()
		}

		assertIsTaskData(taskData)

		return taskData
	}
}

function assertIsTaskData(data: unknown): asserts data is TaskData {
	const { id, status, resultUrl, error } = data as TaskData

	if (
		typeof id !== 'string' ||
		!taskStatuses.includes(status) ||
		(resultUrl != null && typeof resultUrl !== 'string') ||
		(error != null && typeof error !== 'string')
	) {
		throw new TypeError(`Invalid task data: ${JSON.stringify(data)}`)
	}
}

function assertIsCompleted(taskData: TaskData): asserts taskData is CompletedTaskData {
	const { status, resultUrl } = taskData

	if (
		!resultUrl ||
		status !== 'Completed'
	) {
		throw new TypeError(`Invalid completed task data: ${JSON.stringify(taskData)}`)
	}
}
