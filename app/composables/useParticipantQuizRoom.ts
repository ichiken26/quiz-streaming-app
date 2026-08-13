import { computed } from 'vue'
import { getQuestionNumber } from '#shared/utils/quizSlides'
import { participantAnswerState, questionAt, slideAt } from '#shared/utils/roomRuntime'

export function useParticipantQuizRoom() {
  const route = useRoute()
  const author = computed(() => String(route.params.author))
  const roomId = computed(() => String(route.params.roomId))
  const config = useRoomConfig(author, roomId)
  const realtime = useRealtimeRoomState(roomId)
  const identity = useParticipantIdentity(roomId, computed(() => realtime.state.sessionId))

  const currentSlide = computed(() => slideAt(config.room.value, realtime.state.currentSlideIndex))
  const currentQuestion = computed(() => {
    const slide = currentSlide.value
    if (slide?.type !== 'question') return undefined
    return questionAt(config.room.value ?? undefined, realtime.state.currentSlideIndex)
  })
  const currentQuestionNumber = computed(() => getQuestionNumber(
    config.room.value?.slides ?? [],
    currentSlide.value?.id,
  ))
  const answerState = computed(() => participantAnswerState(realtime.state))
  const timer = useSyncedQuestionTimer(currentQuestion, realtime.state)
  const localAnswer = useLocalAnswer(
    roomId,
    computed(() => currentQuestion.value?.id),
    computed(() => realtime.state.sessionId),
  )
  const answerSubmission = useRealtimeAnswerSubmission(
    roomId,
    computed(() => currentQuestion.value?.id),
  )

  async function answerQuestion(choiceIds: string[], options: { atDeadline?: boolean } = {}) {
    const deadlineSubmission = Boolean(options.atDeadline && timer.isExpired.value)
    if (
      (!deadlineSubmission && answerState.value !== 'open')
      || (deadlineSubmission && answerState.value === 'waiting')
      || (timer.isExpired.value && !deadlineSubmission)
      || localAnswer.hasAnswered.value
    ) return

    try {
      await answerSubmission.submitAnswer(
        choiceIds,
        identity.nickname.value,
        realtime.state.sessionId,
      )
      localAnswer.saveAnswer(choiceIds)
    }
    catch {
      // The submission composable owns the user-facing error state.
    }
  }

  return {
    author,
    roomId,
    ...config,
    realtime,
    identity,
    currentSlide,
    currentQuestion,
    currentQuestionNumber,
    answerState,
    timer,
    localAnswer,
    answerSubmission,
    answerQuestion,
  }
}
