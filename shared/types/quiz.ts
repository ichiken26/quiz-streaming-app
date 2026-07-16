export type SlideType = 'slide' | 'question' | 'answer' | 'result'

export type QuestionType = 'single' | 'multiple'

export type Choice = {
  id: string
  label: string
  text: string
}

export type Question = {
  id: string
  type: QuestionType
  text: string
  choices: Choice[]
  correctChoiceId?: string
  correctChoiceIds?: string[]
  timeLimitSeconds: number
}

export type Slide = {
  id: string
  type: SlideType
  title: string
  imageUrl: string
  questionId?: string
}

export type RoomConfig = {
  roomId: string
  title: string
  description?: string
  initialSlideIndex: number
  slides: Slide[]
  questions: Question[]
}

export type RoomMode = 'slide' | 'question' | 'closed' | 'answer' | 'result'

export type RoomRuntimeState = {
  sessionId?: string
  currentSlideIndex: number
  mode: RoomMode
  currentQuestionId?: string
  questionOpen: boolean
  questionClosed: boolean
  hasVisitedFinalSlide: boolean
  questionStartedAt?: number
  winnerReveal?: WinnerReveal
}

export type Winner = {
  nickname: string
  score: number
  totalQuestions: number
}

export type WinnerReveal = {
  open: boolean
  winners: Winner[]
  revealedAt: number
}

export type StoredAnswer = {
  choiceId: string
  choiceIds?: readonly string[]
  answeredAt: string
}

export type RealtimeAnswer = {
  participantId: string
  nickname: string
  sessionId?: string
  choiceId: string
  choiceIds?: readonly string[]
  answeredAt: number
}

export type LeaderboardEntry = Winner & {
  answeredQuestions: number
}

export type AdminRoomSummary = {
  roomId: string
  title: string
  updatedAt: string
}

export type RoomChange = {
  field: string
  contentId?: string
  changedAt: string
}

export type RealtimeConnectionStatus
  = 'idle' | 'connecting' | 'connected' | 'error' | 'unconfigured'
