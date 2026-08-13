import type { AnswerState, RoomConfig, RoomMode, RoomRuntimeState } from '../types/quiz'

export function slideAt(room: RoomConfig | undefined, index: number) {
  if (!room?.slides.length) return undefined
  const normalizedIndex = Number.isInteger(index) ? index : room.initialSlideIndex
  return room.slides[Math.min(Math.max(normalizedIndex, 0), room.slides.length - 1)]
}

export function questionAt(room: RoomConfig | undefined, index: number) {
  const questionId = slideAt(room, index)?.questionId
  if (!questionId) return undefined
  return room?.questions.find(question => question.id === questionId)
}

export function createInitialRuntimeState(room: RoomConfig): RoomRuntimeState {
  return {
    currentSlideIndex: room.initialSlideIndex,
    mode: 'slide',
    currentQuestionId: room.slides[room.initialSlideIndex]?.questionId,
    questionOpen: false,
    questionClosed: false,
    hasVisitedFinalSlide: false,
    winnerReveal: undefined,
  }
}

export function participantAnswerState(state: Pick<RoomRuntimeState, 'questionOpen' | 'mode'>) {
  if (state.questionOpen && state.mode === 'question') return 'open' as const
  const closedModes: RoomMode[] = ['closed', 'answer', 'result']
  return closedModes.includes(state.mode) ? 'closed' as const : 'waiting' as const
}

export function shouldAutoCloseQuestion(
  state: Pick<RoomRuntimeState, 'questionOpen' | 'mode' | 'questionStartedAt'>,
  expired: boolean,
  timerRunning = false,
) {
  return timerRunning
    && expired
    && state.questionOpen
    && state.mode === 'question'
    && typeof state.questionStartedAt === 'number'
    && state.questionStartedAt > 0
}

export function canInteractWithAnswer(options: {
  answerState: AnswerState
  expired: boolean
  hasAnswered: boolean
  submitting: boolean
}) {
  return options.answerState === 'open'
    && !options.expired
    && !options.hasAnswered
    && !options.submitting
}
