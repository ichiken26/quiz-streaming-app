import assert from 'node:assert/strict'
import test from 'node:test'
import {
  recordFinalSlideVisit,
  shouldBlockSlideNavigation,
} from '../shared/utils/quizNavigation.ts'

test('a question slide cannot advance before an explicit close', () => {
  assert.equal(shouldBlockSlideNavigation({
    forward: true,
    hasQuestion: true,
    questionOpen: false,
    questionClosed: false,
  }), true)
  assert.equal(shouldBlockSlideNavigation({
    forward: true,
    hasQuestion: true,
    questionOpen: false,
    questionClosed: true,
  }), false)
})

test('an open question blocks navigation in either direction', () => {
  assert.equal(shouldBlockSlideNavigation({
    forward: false,
    hasQuestion: true,
    questionOpen: true,
    questionClosed: false,
  }), true)
})

test('the final slide is recorded only after it is displayed', () => {
  assert.equal(recordFinalSlideVisit(false, 0, 1, 3), false)
  assert.equal(recordFinalSlideVisit(false, 1, 2, 3), true)
  assert.equal(recordFinalSlideVisit(true, 1, 0, 3), true)
})
