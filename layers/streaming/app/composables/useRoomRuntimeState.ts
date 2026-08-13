import type { RoomConfig, RoomMode, RoomRuntimeState } from '#shared/types/quiz'
import {
  canJumpToLastSlide,
  canNavigateBackward,
  canNavigateForward,
  recordFinalSlideVisit,
} from '#shared/utils/quizNavigation'

type PublishState = (
  state: RoomRuntimeState,
  options?: { useServerQuestionStart?: boolean },
) => Promise<void>

function navigationGuard(
  room: RoomConfig | null | undefined,
  runtimeState: RoomRuntimeState,
  targetIndex: number,
) {
  const slides = room?.slides ?? []
  const slide = slides[runtimeState.currentSlideIndex]
  const hasQuestion = Boolean(
    slide?.questionId
    && room?.questions.some(question => question.id === slide.questionId),
  )

  return {
    mode: runtimeState.mode,
    hasQuestion,
    questionOpen: runtimeState.questionOpen,
    questionClosed: runtimeState.questionClosed,
    atFirstSlide: runtimeState.currentSlideIndex <= 0,
    atLastSlide: runtimeState.currentSlideIndex >= Math.max(0, slides.length - 1),
    hasVisitedFinalSlide: runtimeState.hasVisitedFinalSlide,
    targetIndex,
    slidesLength: slides.length,
  }
}

export function useRoomRuntimeState(
  room: Ref<RoomConfig | null | undefined>,
  runtimeState: RoomRuntimeState,
  publishState: PublishState,
) {
  const operationError = ref<string>()
  const currentSlide = computed(
    () => room.value?.slides[runtimeState.currentSlideIndex],
  )
  const currentQuestion = computed(() => {
    const questionId = runtimeState.currentQuestionId
    return room.value?.questions.find(question => question.id === questionId)
  })

  async function commit(options?: { useServerQuestionStart?: boolean }) {
    operationError.value = undefined
    try {
      await publishState({ ...runtimeState }, options)
    }
    catch (error) {
      operationError.value = error instanceof Error ? error.message : String(error)
    }
  }

  function canApplySlide(targetIndex: number) {
    const context = navigationGuard(room.value, runtimeState, targetIndex)
    if (targetIndex === runtimeState.currentSlideIndex) return false
    if (targetIndex < runtimeState.currentSlideIndex) {
      return canNavigateBackward(context)
    }
    if (targetIndex >= context.slidesLength - 1) {
      return canJumpToLastSlide(context)
    }
    return canNavigateForward(context)
  }

  function applySlide(index: number) {
    const slides = room.value?.slides
    if (!slides?.length) return

    const targetIndex = Math.min(Math.max(index, 0), slides.length - 1)
    if (!canApplySlide(targetIndex)) return

    runtimeState.hasVisitedFinalSlide = recordFinalSlideVisit(
      runtimeState.hasVisitedFinalSlide,
      runtimeState.currentSlideIndex,
      targetIndex,
      slides.length,
    )
    runtimeState.currentSlideIndex = targetIndex
    runtimeState.mode = 'slide'
    runtimeState.questionOpen = false
    runtimeState.questionClosed = false
    runtimeState.currentQuestionId = slides[runtimeState.currentSlideIndex]?.questionId
    runtimeState.questionStartedAt = undefined
    runtimeState.winnerReveal = undefined
    void commit()
  }

  function setMode(mode: RoomMode, questionOpen = false) {
    runtimeState.mode = mode
    runtimeState.questionOpen = questionOpen
    void commit()
  }

  function previous() {
    applySlide(runtimeState.currentSlideIndex - 1)
  }

  function next() {
    applySlide(runtimeState.currentSlideIndex + 1)
  }

  function first() {
    applySlide(0)
  }

  function last() {
    applySlide((room.value?.slides.length ?? 1) - 1)
  }

  function openQuestion() {
    if (!currentQuestion.value) return
    runtimeState.currentQuestionId = currentQuestion.value.id
    runtimeState.mode = 'question'
    runtimeState.questionOpen = true
    runtimeState.questionClosed = false
    runtimeState.questionStartedAt = Date.now()
    void commit({ useServerQuestionStart: true })
  }

  function closeQuestion() {
    runtimeState.questionClosed = true
    setMode('closed')
  }

  function showAnswer() {
    if (!currentQuestion.value) return
    setMode('answer')
  }

  function showResults() {
    setMode('result')
  }

  return {
    operationError: readonly(operationError),
    currentSlide,
    currentQuestion,
    previous,
    next,
    first,
    last,
    openQuestion,
    closeQuestion,
    showAnswer,
    showResults,
  }
}
