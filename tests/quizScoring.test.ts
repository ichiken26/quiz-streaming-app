import assert from 'node:assert/strict'
import test from 'node:test'
import type { Question, RealtimeAnswer, Slide } from '../shared/types/quiz.ts'
import { buildLeaderboard, isAnswerCorrect } from '../shared/utils/quizScoring.ts'
import { getQuestionNumber } from '../shared/utils/quizSlides.ts'

const questions: Question[] = [
  {
    id: 'single',
    type: 'single',
    text: 'single',
    choices: [{ id: 'a', label: 'A', text: 'A' }],
    correctChoiceId: 'a',
    timeLimitSeconds: 10,
  },
  {
    id: 'multiple',
    type: 'multiple',
    text: 'multiple',
    choices: [
      { id: 'a', label: 'A', text: 'A' },
      { id: 'b', label: 'B', text: 'B' },
    ],
    correctChoiceIds: ['a', 'b'],
    timeLimitSeconds: 10,
  },
]

const answer = (overrides: Partial<RealtimeAnswer>): RealtimeAnswer => ({
  participantId: 'participant',
  nickname: 'Alice',
  sessionId: 'current',
  choiceId: 'a',
  answeredAt: 1,
  ...overrides,
})

test('multiple choice requires an exact match', () => {
  assert.equal(isAnswerCorrect(questions[1]!, answer({ choiceIds: ['a', 'b'] })), true)
  assert.equal(isAnswerCorrect(questions[1]!, answer({ choiceIds: ['a'] })), false)
})

test('leaderboard excludes previous sessions and keeps tied winners', () => {
  const result = buildLeaderboard({
    single: {
      alice: answer({ participantId: 'alice', nickname: 'Alice' }),
      bob: answer({ participantId: 'bob', nickname: 'Bob' }),
      old: answer({ participantId: 'old', nickname: 'Old', sessionId: 'previous' }),
    },
  }, questions, 'current')

  assert.deepEqual(result.map(entry => [entry.nickname, entry.score]), [
    ['Alice', 1],
    ['Bob', 1],
  ])
})

test('question numbers follow quiz order and ignore regular slides', () => {
  const slides: Slide[] = [
    { id: 'opening', type: 'slide', title: 'Opening', imageUrl: '/opening.png' },
    { id: 'question-a', type: 'question', title: 'Question', imageUrl: '', questionId: 'a' },
    { id: 'break', type: 'slide', title: 'Break', imageUrl: '/break.png' },
    { id: 'question-b', type: 'question', title: 'Question', imageUrl: '', questionId: 'b' },
  ]

  assert.equal(getQuestionNumber(slides, 'question-a'), 1)
  assert.equal(getQuestionNumber(slides, 'question-b'), 2)
  assert.equal(getQuestionNumber(slides, 'break'), undefined)
})
