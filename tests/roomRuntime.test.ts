import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canInteractWithAnswer,
  questionAt,
  slideAt,
  shouldAutoCloseQuestion,
} from '../shared/utils/roomRuntime.ts'
import type { RoomConfig } from '../shared/types/quiz.ts'

const room: RoomConfig = {
  author: 'kokage',
  roomId: 'room',
  title: 'Room',
  winnerLastRank: 1,
  initialSlideIndex: 0,
  slides: [
    { id: 'intro', type: 'slide', title: 'Intro', imageUrl: '/intro.png' },
    { id: 'question-slide', type: 'question', title: 'Question', imageUrl: '', questionId: 'question-1' },
  ],
  questions: [{
    id: 'question-1',
    type: 'single',
    text: 'Question',
    choices: [{ id: 'a', label: 'A', text: 'Answer' }],
    correctChoiceId: 'a',
    timeLimitSeconds: 10,
  }],
}

test('an open question closes automatically only after its timer expires', () => {
  const openState = {
    mode: 'question' as const,
    questionOpen: true,
    questionStartedAt: Date.now(),
  }

  assert.equal(shouldAutoCloseQuestion(openState, false, true), false)
  assert.equal(shouldAutoCloseQuestion(openState, true, true), true)
  assert.equal(shouldAutoCloseQuestion(openState, true, false), false)
  assert.equal(shouldAutoCloseQuestion({ mode: 'question', questionOpen: true }, true, true), false)
  assert.equal(shouldAutoCloseQuestion({ mode: 'closed', questionOpen: false, questionStartedAt: Date.now() }, true, true), false)
})

test('answers are interactive only while acceptance is open', () => {
  assert.equal(canInteractWithAnswer({
    answerState: 'waiting', expired: false, hasAnswered: false, submitting: false,
  }), false)
  assert.equal(canInteractWithAnswer({
    answerState: 'open', expired: false, hasAnswered: false, submitting: false,
  }), true)
  assert.equal(canInteractWithAnswer({
    answerState: 'open', expired: true, hasAnswered: false, submitting: false,
  }), false)
  assert.equal(canInteractWithAnswer({
    answerState: 'closed', expired: false, hasAnswered: false, submitting: false,
  }), false)
})

test('the active quiz is resolved from the current slide', () => {
  assert.equal(questionAt(room, 0), undefined)
  assert.equal(questionAt(room, 1)?.id, 'question-1')
})

test('an invalid runtime index resolves to a valid slide', () => {
  assert.equal(slideAt(room, Number.NaN)?.id, 'intro')
  assert.equal(slideAt(room, 99)?.id, 'question-slide')
})
