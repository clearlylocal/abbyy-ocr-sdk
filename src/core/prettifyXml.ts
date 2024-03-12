import formatXml from 'xml-formatter'
import { escape, unescape } from 'std/html/entities.ts'

export function prettifyXml(xml: string, indentation: string | number = '\t') {
	// We add `xml:space="preserve"` to ensure whitespace within charParams is preserved, but then remove it at the end
	// to ensure the prettified XML still conforms to the schema.
	return formatXml(xml.replaceAll(/<charParams([^<]*[^</])>/g, '<charParams$1 xml:space="preserve">'), {
		indentation: typeof indentation === 'number' ? ' '.repeat(indentation) : indentation,
		collapseContent: true,
		lineSeparator: '\n',
	}).replaceAll(/<charParams([^<]+)\s+xml:space="preserve">/g, '<charParams$1>')
		// normalize entities
		.replaceAll(/&[^;]+;/g, (m) => {
			const val = unescape(m)
			return val === "'" ? m : escape(val)
		})
		.trim() +
		'\n'
}
