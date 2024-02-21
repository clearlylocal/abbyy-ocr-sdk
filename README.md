# ABBYY Cloud OCR SDK demo

## Files

- `src/`
  - [OcrSdk.ts](./src/OcrSdk.ts): The `OcrSdk` class, with various methods for interacting with the ABBYY Cloud OCR API. Loosely based on [ABBYY's sample JS code](https://github.com/abbyy/ocrsdk.com/blob/master/JavaScript/ocrsdk.js), but with the following changes:
    - Rewritten in modern JS/TS with ES6 classes etc.
    - Promise-based API instead of callbacks
    - Methods now deal with raw binary data rather than file paths (file reading/writing is left up to calling code)
    - Exposes a single `ocr` method to OCR an image and return the output file binary in the requested format
  - [saveAsTxt.ts](./src/saveAsTxt.ts): Basic example using `OcrSdk`'s `ocr` method to get a text file of the OCRed content
  - [createImageMap.ts](./src/createImageMap.ts): Slightly more involved example that gets XML content, then converts it to a hoverable HTML image map based on the text data and coordinates of each line
  - [types.ts](./src/types.ts): TypeScript types for interacting with `OcrSdk`
  - [saveAsTxt.node.mjs](./src/saveAsTxt.node.mjs): JavaScript/NodeJS version of `saveAsTxt.ts`
- `samples/`
  - [ocr-sample.jpg](./samples/ocr-sample.jpg): An example input image file
  - [result.txt](./samples/result.txt): Result of running `main.ts` on `ocr-sample.jpg`
  - [result-pretty.xml](./samples/result-pretty.xml): Pretty-printed output from `OcrSdk#ocr(<ocr-sample.jpg bytes>, { exportFormat: 'xml' })`
  - [image-map.html](./samples/image-map.html): Result of running `createImageMap.ts` on `ocr-sample.jpg`
