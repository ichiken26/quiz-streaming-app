import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canJumpToLastSlide,
  canNavigateBackward,
  canNavigateForward,
  recordFinalSlideVisit,
  shouldBlockSlideNavigation,
} from '../shared/utils/quizNavigation.ts'

const baseGuard = {
  mode: 'slide',
  hasQuestion: true,
  questionOpen: false,
  questionClosed: false,
  atFirstSlide: false,
  atLastSlide: false,
  hasVisitedFinalSlide: true,
}

test('a question slide cannot advance before an explicit close', () => {
  assert.equal(canNavigateForward({
    ...baseGuard,
    questionClosed: false,
  }), false)
  assert.equal(canNavigateForward({
    ...baseGuard,
    questionClosed: true,
  }), true)
  assert.equal(shouldBlockSlideNavigation({
    forward: true,
    ...baseGuard,
    questionClosed: false,
  }), true)
})

test('question acceptance blocks forward navigation only while answers are open', () => {
  assert.equal(canNavigateForward({
    ...baseGuard,
    mode: 'question',
    questionOpen: true,
  }), false)
  assert.equal(canNavigateForward({
    ...baseGuard,
    mode: 'closed',
    questionOpen: false,
    questionClosed: true,
  }), true)
})

test('auto or manual close enables forward navigation on a quiz slide', () => {
  assert.equal(canNavigateForward({
    ...baseGuard,
    mode: 'question',
    questionOpen: false,
    questionClosed: false,
  }), false)
  assert.equal(canNavigateForward({
    ...baseGuard,
    mode: 'closed',
    questionOpen: false,
    questionClosed: true,
  }), true)
})

test('an open question blocks navigation in either direction', () => {
  assert.equal(canNavigateForward({
    ...baseGuard,
    mode: 'question',
    questionOpen: true,
  }), false)
  assert.equal(canNavigateBackward({
    ...baseGuard,
    mode: 'question',
    questionOpen: true,
  }), false)
})

test('regular slides allow forward navigation', () => {
  assert.equal(canNavigateForward({
    ...baseGuard,
    hasQuestion: false,
  }), true)
})

test('the final slide is recorded only after it is displayed', () => {
  assert.equal(recordFinalSlideVisit(false, 0, 1, 3), false)
  assert.equal(recordFinalSlideVisit(false, 1, 2, 3), true)
  assert.equal(recordFinalSlideVisit(true, 1, 0, 3), true)
})

test('last jump stays disabled until the final slide has been visited', () => {
  assert.equal(canJumpToLastSlide({
    ...baseGuard,
    hasVisitedFinalSlide: false,
  }), false)
  assert.equal(canJumpToLastSlide({
    ...baseGuard,
    atLastSlide: true,
  }), false)
  assert.equal(canJumpToLastSlide({
    ...baseGuard,
    questionClosed: true,
  }), true)
})
