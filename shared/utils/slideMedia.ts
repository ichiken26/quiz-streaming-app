export const ACCEPTED_SLIDE_MEDIA_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'application/pdf',
] as const

export type AcceptedSlideMediaMimeType = typeof ACCEPTED_SLIDE_MEDIA_MIME_TYPES[number]

export const ACCEPTED_SLIDE_MEDIA_ACCEPT = [
  ...ACCEPTED_SLIDE_MEDIA_MIME_TYPES,
  '.jpg',
  '.jpeg',
  '.png',
  '.pdf',
].join(',')

export const UPLOADABLE_SLIDE_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
] as const

const EXTENSION_MIME: Record<string, AcceptedSlideMediaMimeType> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  pdf: 'application/pdf',
}

function mimeFromExtension(fileName: string) {
  const extension = fileName.toLowerCase().split('.').pop()
  return extension ? EXTENSION_MIME[extension] : undefined
}

export function resolveSlideMediaMimeType(file: Pick<File, 'name' | 'type'>) {
  if (ACCEPTED_SLIDE_MEDIA_MIME_TYPES.includes(file.type as AcceptedSlideMediaMimeType)) {
    return file.type as AcceptedSlideMediaMimeType
  }
  return mimeFromExtension(file.name)
}

export function isAcceptedSlideMedia(file: Pick<File, 'name' | 'type'>) {
  return resolveSlideMediaMimeType(file) !== undefined
}

export function isPdfSlideMedia(file: Pick<File, 'name' | 'type'>) {
  return resolveSlideMediaMimeType(file) === 'application/pdf'
}

export function isUploadableSlideImage(file: Pick<File, 'name' | 'type'>) {
  const mimeType = resolveSlideMediaMimeType(file)
  return mimeType !== undefined
    && (UPLOADABLE_SLIDE_IMAGE_MIME_TYPES as readonly string[]).includes(mimeType)
}
