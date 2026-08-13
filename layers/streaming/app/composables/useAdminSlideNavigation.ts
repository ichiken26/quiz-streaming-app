import type { RoomRuntimeState } from '#shared/types/quiz'
import {
  canJumpToLastSlide,
  canNavigateBackward,
  canNavigateForward,
} from '#shared/utils/quizNavigation'

type SlideNavigationActions = {
  first: () => void
  previous: () => void
  next: () => void
  last: () => void
}

export function useAdminSlideNavigation(
  hasQuestion: MaybeRefOrGetter<boolean>,
  runtimeState: RoomRuntimeState,
  totalSlides: MaybeRefOrGetter<number>,
  actions: SlideNavigationActions,
) {
  const guard = computed(() => ({
    mode: runtimeState.mode,
    hasQuestion: toValue(hasQuestion),
    questionOpen: runtimeState.questionOpen,
    questionClosed: runtimeState.questionClosed,
    atFirstSlide: runtimeState.currentSlideIndex <= 0,
    atLastSlide: runtimeState.currentSlideIndex >= Math.max(0, toValue(totalSlides) - 1),
    hasVisitedFinalSlide: runtimeState.hasVisitedFinalSlide,
  }))

  const canGoNext = computed(() => canNavigateForward(guard.value))
  const canGoPrevious = computed(() => canNavigateBackward(guard.value))
  const canGoFirst = computed(() => canNavigateBackward(guard.value))
  const canGoLast = computed(() => canJumpToLastSlide(guard.value))

  function first() {
    if (!canGoFirst.value) return
    actions.first()
  }

  function previous() {
    if (!canGoPrevious.value) return
    actions.previous()
  }

  function next() {
    if (!canGoNext.value) return
    actions.next()
  }

  function last() {
    if (!canGoLast.value) return
    actions.last()
  }

  return {
    canGoNext,
    canGoPrevious,
    canGoFirst,
    canGoLast,
    first,
    previous,
    next,
    last,
  }
}
