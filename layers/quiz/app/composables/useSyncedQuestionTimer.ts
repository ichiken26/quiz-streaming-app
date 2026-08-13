import type { Question, RoomRuntimeState } from '#shared/types/quiz'

function isValidStartedAt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function useSyncedQuestionTimer(
  question: MaybeRefOrGetter<Question | undefined>,
  runtimeState: RoomRuntimeState,
) {
  const timer = useQuestionTimer(
    computed(() => toValue(question)?.timeLimitSeconds ?? 0),
  )

  watch(
    [
      () => toValue(question)?.id,
      () => runtimeState.questionStartedAt,
      () => runtimeState.questionOpen,
    ],
    ([questionId, startedAt, questionOpen]) => {
      if (questionId && questionOpen && isValidStartedAt(startedAt)) {
        timer.start(startedAt)
        return
      }
      timer.stop()
    },
    { immediate: true },
  )

  return timer
}
