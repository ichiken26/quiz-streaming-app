import { QUIZ_EDITOR_LIMITS } from '#shared/constants/quiz'

function canvasToPng(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      value => value ? resolve(value) : reject(new Error('PNGへ変換できませんでした')),
      'image/png',
    )
  })
}

export async function pdfToPngFiles(file: File) {
  const pdfjs = await import('pdfjs-dist')
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const baseName = file.name.replace(/\.pdf$/i, '')
  const pages: File[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: QUIZ_EDITOR_LIMITS.pdfRenderScale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(viewport.width)
    canvas.height = Math.ceil(viewport.height)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('PDFページを描画できませんでした')
    await page.render({ canvas, canvasContext: context, viewport }).promise
    const blob = await canvasToPng(canvas)
    pages.push(new File(
      [blob],
      `${baseName}-${String(pageNumber).padStart(3, '0')}.png`,
      { type: 'image/png' },
    ))
  }

  return pages
}
