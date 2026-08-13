import { QUIZ_EDITOR_LIMITS, isValidRoomIdentifier } from '../constants/quiz'
import type { Choice, Question, RoomConfig, Slide } from '../types/quiz'
import { getCorrectChoiceIds } from './quizScoring'

export type IdFactory = (prefix: string) => string

export const createId: IdFactory = prefix => `${prefix}-${crypto.randomUUID().slice(0, 8)}`

export function createEmptyRoomConfig(): RoomConfig {
  return {
    author: '',
    roomId: '',
    title: '',
    description: '',
    winnerLastRank: 1,
    initialSlideIndex: 0,
    slides: [],
    questions: [],
  }
}

export function choiceLabel(index: number) {
  return String.fromCharCode(65 + index)
}

export function createQuestion(idFactory: IdFactory = createId): Question {
  const choices: Choice[] = Array.from(
    { length: QUIZ_EDITOR_LIMITS.minChoices },
    (_, index) => ({
      id: idFactory('choice'),
      label: choiceLabel(index),
      text: '',
    }),
  )
  return {
    id: idFactory('question'),
    type: 'single',
    text: '',
    choices,
    correctChoiceIds: [],
    timeLimitSeconds: QUIZ_EDITOR_LIMITS.defaultTimeLimitSeconds,
  }
}

export function questionForSlide(room: RoomConfig, slide: Slide) {
  return room.questions.find(question => question.id === slide.questionId)
}

export function isQuestionComplete(question: Question) {
  if (!question.text.trim() || question.timeLimitSeconds <= 0) return false
  if (
    question.choices.length < QUIZ_EDITOR_LIMITS.minChoices
    || question.choices.some(choice => !choice.text.trim())
  ) return false
  const answers = getCorrectChoiceIds(question)
  return question.type === 'single' ? answers.length === 1 : answers.length >= 1
}

export function isRoomConfigComplete(room: RoomConfig) {
  return isValidRoomIdentifier(room.author)
    && isValidRoomIdentifier(room.roomId)
    && Boolean(room.title.trim())
    && room.slides.every((slide) => {
      if (slide.type !== 'question') return Boolean(slide.imageUrl)
      const question = questionForSlide(room, slide)
      return Boolean(question && isQuestionComplete(question))
    })
}

export function normalizeRoomConfig(room: RoomConfig): RoomConfig {
  return structuredClone({
    ...room,
    winnerLastRank: room.winnerLastRank ?? 1,
    initialSlideIndex: 0,
  })
}
