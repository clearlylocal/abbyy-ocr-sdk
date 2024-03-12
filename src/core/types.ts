export type OcrSdkOptions = {
	waitTimeout: number
}

export type ImageMapGenerationOptions = {
	applicationId: string
	password: string
	serviceUrl: string

	languages: Language[]
}

export const taskStatuses = [
	'Submitted',
	'Queued',
	'InProgress',
	'Completed',
	'ProcessingFailed',
	'Deleted',
	'NotEnoughCredits',
] as const
export const completedTaskStatuses = ['Completed'] satisfies TaskStatus[]
export const ongoingTaskStatuses = ['Queued', 'InProgress'] satisfies TaskStatus[]

export type Task = {
	id: string
	status: TaskStatus
	resultUrls?: string[]
	error?: string
	registrationTime?: Date
	statusChangeTime?: Date
	filesCount?: number
	credits?: number
}

export type CompletedTask = Expand<
	Task & Required<Pick<Task, 'resultUrls'>> & {
		status: CompletedTaskStatus
	}
>

export type OngoingTask = Expand<
	Omit<Task, 'resultUrls'> & {
		status: OngoingTaskStatus
	}
>

/** https://support.abbyy.com/hc/en-us/articles/360017269940-Task-statuses */
export type TaskStatus = typeof taskStatuses[number]
export type CompletedTaskStatus = typeof completedTaskStatuses[number]
export type OngoingTaskStatus = typeof ongoingTaskStatuses[number]

/** https://support.abbyy.com/hc/en-us/articles/360017269680-processImage-Method */
export type ImageProcessingSettings<T extends ExportFormat> = Expand<
	& {
		languages: readonly Language[]
		/** one to three export formats */
		exportFormats: readonly T[]
	}
	& Partial<{
		profile: Profile
		textType: TextType
		imageSource: ImageSource
		correctOrientation: boolean
		correctSkew: boolean
		readBarcodes: boolean
		pdfPassword: string
	}>
	& Partial<Prefixed<T, FormatSpecificSettings>>
>

type GetPrefix<T extends string> = T extends `${infer Prefix}:${string}` ? Prefix : never
type Prefixed<T extends string, S> = { [K in string & keyof S]: T extends `${GetPrefix<K>}${string}` ? S[K] : never }

type FormatSpecificSettings = {
	'xml:writeFormatting': boolean
	'xml:writeRecognitionVariants': boolean
	'xml:writeWordRecognitionVariants': boolean

	'pdf:writeTags': 'auto' | 'write' | 'dontWrite'

	'txtUnstructured:paragraphAsOneLine': boolean
}

/** https://support.abbyy.com/hc/en-us/articles/360017326839-Processing-profiles */
export type Profile = 'documentConversion' | 'documentArchiving' | 'textExtraction' | 'barcodeRecognition'
/** https://support.abbyy.com/hc/en-us/articles/360017326879-Text-types */
export type TextType = 'normal' | 'typewriter' | 'matrix' | 'index' | 'ocrA' | 'ocrB' | 'e13b' | 'cmc7' | 'gothic'
export type ImageSource = 'auto' | 'photo' | 'scanner'

/**
 * More details at https://support.abbyy.com/hc/en-us/articles/360017269680-processImage-Method.
 * Maximum of 3 export formats per task
 */
export type ExportFormat = typeof exportFormats[number]
/** https://support.abbyy.com/hc/en-us/articles/360017326859-Recognition-languages */
export type Language = typeof languages[number]

export const exportFormats = [
	'txt',
	'txtUnstructured',
	'rtf',
	'docx',
	'xlsx',
	'pptx',
	'pdfSearchable',
	'pdfTextAndImages',
	'pdfa',
	'xml',
	'xmlForCorrectedImage',
	'alto',
] as const

export const languages = [
	'Abkhaz',
	'Adyghe',
	'Afrikaans',
	'Agul',
	'Albanian',
	'Altaic',
	'Arabic', // Arabic (Saudi Arabia)
	'ArmenianEastern', // Armenian (Eastern)
	'ArmenianGrabar', // Armenian (Grabar)
	'ArmenianWestern', // Armenian (Western)
	'Avar',
	'Aymara',
	'AzeriCyrillic', // Azerbaijani (Cyrillic)
	'AzeriLatin', // Azerbaijani (Latin)
	'Bashkir',
	'Basque',
	'Belarusian', // Belarussian
	'Bemba',
	'Blackfoot',
	'Breton',
	'Bugotu',
	'Bulgarian',
	'Buryat',
	'Catalan',
	'Chamorro',
	'Chechen',
	'ChinesePRC', // Chinese Simplified
	'ChineseTaiwan', // Chinese Traditional
	'Chukcha',
	'Chuvash',
	'CMC7', // For MICR CMC-7 text type
	'Corsican',
	'CrimeanTatar', // Crimean Tatar
	'Croatian',
	'Crow',
	'Czech',
	'Danish',
	'Dargwa',
	'Digits', // Numbers*
	'Dungan',
	'Dutch', // Dutch (Netherlands)
	'DutchBelgian', // Dutch (Belgium)
	'E13B', // For MICR (E-13B) text type
	'English',
	'EskimoCyrillic', // Eskimo (Cyrillic)
	'EskimoLatin', // Eskimo (Latin)
	'Esperanto',
	'Estonian',
	'Even',
	'Evenki',
	'Farsi',
	'Faeroese',
	'Fijian',
	'Finnish',
	'French',
	'Frisian',
	'Friulian',
	'GaelicScottish', // Scottish Gaelic
	'Gagauz',
	'Galician',
	'Ganda',
	'German',
	'GermanLuxembourg', // German (Luxembourg)
	'GermanNewSpelling', // German (new spelling)
	'Greek',
	'Guarani',
	'Hani',
	'Hausa',
	'Hawaiian',
	'Hebrew',
	'Hungarian',
	'Icelandic',
	'Ido',
	'Indonesian',
	'Ingush',
	'Interlingua',
	'Irish',
	'Italian',
	'Japanese',
	'Kabardian',
	'Kalmyk',
	'KarachayBalkar', // Karachay-Balkar
	'Karakalpak',
	'Kasub',
	'Kawa',
	'Kazakh',
	'Khakas',
	'Khanty',
	'Kikuyu',
	'Kirgiz',
	'Kongo',
	'Korean',
	'KoreanHangul', // Korean (Hangul)
	'Koryak',
	'Kpelle',
	'Kumyk',
	'Kurdish',
	'Lak',
	'Lappish', // Sami (Lappish)
	'Latin',
	'Latvian',
	'LatvianGothic', // Latvian language written in Gothic script
	'Lezgin',
	'Lithuanian',
	'Luba',
	'Macedonian',
	'Malagasy',
	'Malay',
	'Malinke',
	'Maltese',
	'Mansi',
	'Maori',
	'Mari',
	'Maya',
	'Miao',
	'Minangkabau',
	'Mohawk',
	'Mongol',
	'Mordvin',
	'Nahuatl',
	'Nenets',
	'Nivkh',
	'Nogay',
	'Norwegian', // NorwegianNynorsk + NorwegianBokmal
	'NorwegianBokmal', // Norwegian (Bokmal)
	'NorwegianNynorsk', // Norwegian (Nynorsk)
	'Nyanja',
	'Occidental',
	'Ojibway',
	'OldEnglish', // Old English
	'OldFrench', // Old French
	'OldGerman', // Old German
	'OldItalian', // Old Italian
	'OldSlavonic', // Old Slavonic
	'OldSpanish', // Old Spanish
	'Ossetian',
	'Papiamento',
	'PidginEnglish', // Tok Pisin
	'Polish',
	'PortugueseBrazilian', // Portuguese (Brazil)
	'PortugueseStandard', // Portuguese (Portugal)
	'Provencal',
	'Quechua',
	'RhaetoRomanic', // Rhaeto-Romanic
	'Romanian',
	'RomanianMoldavia', // Romanian (Moldavia)
	'Romany',
	'Ruanda',
	'Rundi',
	'RussianOldSpelling', // Russian (old spelling)
	'Russian',
	'Samoan',
	'Selkup',
	'SerbianCyrillic', // Serbian (Cyrillic)
	'SerbianLatin', // Serbian (Latin)
	'Shona',
	'Sioux (Dakota)',
	'Slovak',
	'Slovenian',
	'Somali',
	'Sorbian',
	'Sotho',
	'Spanish',
	'Sunda',
	'Swahili',
	'Swazi',
	'Swedish',
	'Tabassaran',
	'Tagalog',
	'Tahitian',
	'Tajik',
	'Tatar',
	'Thai',
	'Jingpo',
	'Tongan',
	'Tswana',
	'Tun',
	'Turkish',
	'Turkmen',
	'Tuvan',
	'Udmurt',
	'UighurCyrillic', // Uighur (Cyrillic)
	'UighurLatin', // Uighur (Latin)
	'Ukrainian',
	'UzbekCyrillic', // Uzbek (Cyrillic)
	'UzbekLatin', // Uzbek (Latin)
	'Vietnamese',
	'Visayan', // Cebuano
	'Welsh',
	'Wolof',
	'Xhosa',
	'Yakut',
	'Yiddish',
	'Zapotec',
	'Zulu',
] as const

// utility for more user-friendly intellisense
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never
