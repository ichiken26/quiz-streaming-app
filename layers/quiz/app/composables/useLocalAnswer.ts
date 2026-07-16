import type { StoredAnswer } from '#shared/types/quiz'

export function useLocalAnswer(
  roomId: MaybeRefOrGetter<string>,
  questionId: MaybeRefOrGetter<string | undefined>,
  sessionId?: MaybeRefOrGetter<string | undefined>,
) {
  const answer = ref<StoredAnswer | null>(null)
  const storageKey = computed(() => {
    const id = toValue(questionId)
    const session = toValue(sessionId) ?? 'legacy'
    return id ? `quiz-answer:${toValue(roomId)}:${session}:${id}` : undefined
  })

  function loadAnswer() {
    answer.value = null
    if (!import.meta.client || !storageKey.value) return

    const stored = localStorage.getItem(storageKey.value)
    if (!stored) return

    try {
      answer.value = JSON.parse(stored) as StoredAnswer
    }
    catch {
      localStorage.removeItem(storageKey.value)
    }
  }

  function saveAnswer(choiceIds: string[]) {
    if (!import.meta.client || !storageKey.value) return false
    loadAnswer()
    if (answer.value) return false

    const nextAnswer: StoredAnswer = {
      choiceId: choiceIds[0]!,
      choiceIds,
      answeredAt: new Date().toISOString(),
    }
    localStorage.setItem(storageKey.value, JSON.stringify(nextAnswer))
    answer.value = nextAnswer

    // Firebase submission is handled separately; this only prevents local re-entry.
    return true
  }

  onMounted(loadAnswer)
  watch(storageKey, loadAnswer)

  return {
    answer: readonly(answer),
    hasAnswered: computed(() => answer.value !== null),
    saveAnswer,
  }
}
