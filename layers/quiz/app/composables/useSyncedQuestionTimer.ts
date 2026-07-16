import type { Question, RoomRuntimeState } from '#shared/types/quiz'

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
      if (questionId && startedAt && questionOpen) timer.start(startedAt)
      else timer.stop()
    },
    { immediate: true },
  )

  return timer
}
