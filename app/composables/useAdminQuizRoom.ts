import { computed, ref, watch } from 'vue'
import { getQuestionNumber } from '#shared/utils/quizSlides'
import { createInitialRuntimeState, shouldAutoCloseQuestion } from '#shared/utils/roomRuntime'

export function useAdminQuizRoom() {
  const route = useRoute()
  const author = computed(() => String(route.params.author))
  const roomId = computed(() => String(route.params.roomId))
  const config = useAdminRoomConfig(roomId)
  const realtime = useRealtimeRoomState(roomId)
  const controller = useRoomRuntimeState(config.room, realtime.state, realtime.publishState)
  const timer = useSyncedQuestionTimer(
    computed(() => controller.currentQuestion.value),
    realtime.state,
  )
  const answerResults = useRealtimeAnswers(
    roomId,
    computed(() => controller.currentQuestion.value?.id),
    computed(() => realtime.state.sessionId),
  )
  const leaderboard = useRealtimeLeaderboard(
    roomId,
    computed(() => config.room.value?.questions ?? []),
    computed(() => realtime.state.sessionId),
  )
  const isFinalSlide = computed(() => Boolean(
    config.room.value?.slides.length
    && realtime.state.currentSlideIndex === config.room.value.slides.length - 1,
  ))
  const currentQuestionNumber = computed(() => getQuestionNumber(
    config.room.value?.slides ?? [],
    controller.currentSlide.value?.id,
  ))
  const currentSlideHeading = computed(() => currentQuestionNumber.value
    ? `Q${currentQuestionNumber.value}`
    : controller.currentSlide.value?.title)
  const resettingSession = ref(false)
  const resetConfirmOpen = ref(false)
  const winnerLastRank = computed(() => config.room.value?.winnerLastRank ?? 1)
  const slideNavigation = useAdminSlideNavigation(
    computed(() => Boolean(
      controller.currentQuestion.value
      || controller.currentSlide.value?.type === 'question',
    )),
    realtime.state,
    computed(() => config.room.value?.slides.length ?? 0),
    controller,
  )

  watch(
    [
      timer.isExpired,
      timer.isRunning,
      () => realtime.state.questionOpen,
      () => realtime.state.mode,
      () => realtime.state.questionStartedAt,
    ],
    ([expired, running]) => {
      if (shouldAutoCloseQuestion(realtime.state, expired, running)) {
        controller.closeQuestion()
      }
    },
  )

  async function revealWinner() {
    const winners = leaderboard.winnersThroughRank(winnerLastRank.value)
    if (!isFinalSlide.value || !winners.length) return
    await realtime.publishState({
      ...realtime.state,
      winnerReveal: { open: true, winners, revealedAt: Date.now() },
    })
  }

  async function closeWinner() {
    await realtime.publishState({ ...realtime.state, winnerReveal: undefined })
  }

  async function resetRoomSession() {
    if (!config.room.value) return
    resettingSession.value = true
    try {
      await realtime.resetSession(createInitialRuntimeState(config.room.value))
      resetConfirmOpen.value = false
    }
    finally {
      resettingSession.value = false
    }
  }

  watch(
    config.room,
    async (room) => {
      if (!room) return
      try {
        await realtime.initializeState(createInitialRuntimeState(room))
      }
      catch {
        // Connection details are exposed by the realtime composable.
      }
    },
    { immediate: true },
  )

  return {
    author,
    roomId,
    ...config,
    realtime,
    controller,
    timer,
    answerResults,
    leaderboard,
    isFinalSlide,
    currentQuestionNumber,
    currentSlideHeading,
    resettingSession,
    resetConfirmOpen,
    winnerLastRank,
    canGoNext: slideNavigation.canGoNext,
    canGoPrevious: slideNavigation.canGoPrevious,
    canGoFirst: slideNavigation.canGoFirst,
    canGoLast: slideNavigation.canGoLast,
    slideNavigation,
    revealWinner,
    closeWinner,
    resetRoomSession,
  }
}
