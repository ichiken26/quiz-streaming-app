import { ref } from 'vue'
import { isValidRoomIdentifier } from '#shared/constants/quiz'
import type { Question, RoomConfig } from '#shared/types/quiz'
import {
  QUESTION_AUDIO_MIME_TYPE,
  audioObjectNameFromUrl,
  isAcceptedQuestionAudio,
  isQuestionAudioWithinSizeLimit,
} from '#shared/utils/questionAudio'
import { adminAudioApiPath } from '#shared/utils/roomRoutes'
import { apiErrorMessage } from '~/utils/apiError'

type AudioOptions = {
  markChanged: (field: string, contentId?: string) => void
  setError: (message: string) => void
}

export function useRoomEditorAudio(room: RoomConfig, options: AudioOptions) {
  const audioInput = ref<HTMLInputElement>()
  const targetQuestionId = ref('')

  async function uploadAudio(file: File) {
    return $fetch<{ audioUrl: string, name: string }>(adminAudioApiPath(room.roomId), {
      method: 'POST',
      body: file,
      headers: {
        'content-type': QUESTION_AUDIO_MIME_TYPE,
        'x-audio-filename': file.name,
      },
    })
  }

  async function deleteStoredAudio(audioUrl: string) {
    const objectName = audioObjectNameFromUrl(room.roomId, audioUrl)
    if (!objectName) return
    await $fetch(adminAudioApiPath(room.roomId, objectName), { method: 'DELETE' }).catch(() => undefined)
  }

  function findQuestion(questionId: string) {
    return room.questions.find(question => question.id === questionId)
  }

  function chooseAudio(questionId: string) {
    targetQuestionId.value = questionId
    audioInput.value?.click()
  }

  async function uploadQuestionAudio(questionId: string, file: File) {
    if (!isValidRoomIdentifier(room.roomId)) {
      options.setError('音声を追加する前に、有効なルームIDを入力してください')
      return
    }
    if (!isAcceptedQuestionAudio(file)) {
      options.setError('MP3ファイルのみアップロードできます')
      return
    }
    if (!isQuestionAudioWithinSizeLimit(file.size)) {
      options.setError('音声ファイルは20MB以下にしてください')
      return
    }

    const question = findQuestion(questionId)
    if (!question) return

    const previousAudioUrl = question.audio?.url
    try {
      const result = await uploadAudio(file)
      question.audio = { url: result.audioUrl, name: result.name }
      options.markChanged('quiz:audio', question.id)
      if (previousAudioUrl && previousAudioUrl !== result.audioUrl) {
        await deleteStoredAudio(previousAudioUrl)
      }
    }
    catch (error) {
      options.setError(apiErrorMessage(error, '音声をアップロードできませんでした'))
    }
  }

  async function onAudioSelected(files?: FileList | null) {
    const questionId = targetQuestionId.value
    const file = files?.[0]
    targetQuestionId.value = ''
    if (audioInput.value) audioInput.value.value = ''
    if (!questionId || !file) return
    await uploadQuestionAudio(questionId, file)
  }

  async function removeQuestionAudio(question: Question) {
    if (!question.audio) return
    await deleteStoredAudio(question.audio.url)
    question.audio = undefined
    options.markChanged('quiz:audio', question.id)
  }

  return {
    audioInput,
    chooseAudio,
    uploadQuestionAudio,
    onAudioSelected,
    deleteStoredAudio,
    removeQuestionAudio,
  }
}
