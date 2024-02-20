# ABBYY Cloud OCR SDK demo

## Files

- `src/`
  - `OcrSdk.ts`: The `OcrSdk` class, with various methods for interacting with the ABBYY Cloud OCR API (loosely based on https://github.com/abbyy/ocrsdk.com/blob/master/JavaScript/ocrsdk.js)
  - `main.ts`: Basic example using `OcrSdk`'s `ocr` method to get a text file of the OCRed content
  - `createImageMap.ts`: Slightly more involved example that gets xml content, then converts it to a hoverable HTML image map based on the text data and coordinates of each line
  - `types.ts`: TypeScript types for interacting with `OcrSdk`
- `samples/`
  - `ocr-sample.jpg`: An example input image file
  - `result.txt`: Result of running `main.ts` on `ocr-sample.jpg`
  - `result-pretty.xml`: Pretty-printed output from `OcrSdk#ocr(<ocr-sample.jpg bytes>, { exportFormat: 'xml' })`
  - `image-map.html`: Result of running `createImageMap.ts` on `ocr-sample.jpg`
