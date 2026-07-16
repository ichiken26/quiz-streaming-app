import { ref as databaseRef, serverTimestamp, set } from 'firebase/database'

export function useRealtimeAnswerSubmission(
  roomId: MaybeRefOrGetter<string>,
  questionId: MaybeRefOrGetter<string | undefined>,
) {
  const isSubmitting = ref(false)
  const submissionError = ref<string>()

  function getParticipantId() {
    const key = `quiz-participant:${toValue(roomId)}`
    const stored = localStorage.getItem(key)
    if (stored) return stored
    const participantId = crypto.randomUUID()
    localStorage.setItem(key, participantId)
    return participantId
  }

  async function submitAnswer(choiceIds: string[], nickname: string, sessionId?: string) {
    const question = toValue(questionId)
    if (!question) throw new Error('回答対象の問題がありません')
    if (!choiceIds.length) throw new Error('回答を選択してください')
    const normalizedNickname = nickname.trim().replace(/\s+/g, ' ').slice(0, 30)
    if (!normalizedNickname) throw new Error('ニックネームを入力してください')
    const participantId = getParticipantId()
    isSubmitting.value = true
    submissionError.value = undefined

    try {
      await set(
        databaseRef(
          useFirebaseDatabase(),
          `rooms/${toValue(roomId)}/answers/${question}/${participantId}`,
        ),
        {
          participantId,
          nickname: normalizedNickname,
          sessionId: sessionId ?? null,
          choiceId: choiceIds[0],
          choiceIds,
          answeredAt: serverTimestamp(),
        },
      )
    }
    catch (error) {
      submissionError.value = error instanceof Error ? error.message : String(error)
      throw error
    }
    finally {
      isSubmitting.value = false
    }
  }

  return {
    isSubmitting: readonly(isSubmitting),
    submissionError: readonly(submissionError),
    submitAnswer,
  }
}
