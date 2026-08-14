export const QUESTION_AUDIO_MIME_TYPE = 'audio/mpeg' as const

export const QUESTION_AUDIO_ACCEPT = [
  QUESTION_AUDIO_MIME_TYPE,
  '.mp3',
].join(',')

export const QUESTION_AUDIO_MAX_BYTES = 20 * 1024 * 1024

const EXTENSION_MIME: Record<string, typeof QUESTION_AUDIO_MIME_TYPE> = {
  mp3: QUESTION_AUDIO_MIME_TYPE,
}

export function resolveQuestionAudioMimeType(file: Pick<File, 'name' | 'type'>) {
  if (file.type === QUESTION_AUDIO_MIME_TYPE) return QUESTION_AUDIO_MIME_TYPE
  const extension = file.name.toLowerCase().split('.').pop()
  return extension ? EXTENSION_MIME[extension] : undefined
}

export function isAcceptedQuestionAudio(file: Pick<File, 'name' | 'type'>) {
  return resolveQuestionAudioMimeType(file) === QUESTION_AUDIO_MIME_TYPE
}

export function isQuestionAudioWithinSizeLimit(size: number) {
  return size > 0 && size <= QUESTION_AUDIO_MAX_BYTES
}

export function audioObjectNameFromUrl(roomId: string, audioUrl: string) {
  const prefix = `/api/admin/audio/${roomId}/`
  return audioUrl.startsWith(prefix) ? audioUrl.slice(prefix.length) : undefined
}

export function formatAudioDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00'
  const total = Math.floor(seconds)
  const minutes = Math.floor(total / 60)
  const remainder = total % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}
