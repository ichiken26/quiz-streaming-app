import type { Question, RoomRuntimeState } from '#shared/types/quiz'
import { shouldBlockSlideNavigation } from '#shared/utils/quizNavigation'

type SlideNavigationActions = {
  first: () => void
  previous: () => void
  next: () => void
  last: () => void
}

export function useAdminSlideNavigation(
  currentQuestion: MaybeRefOrGetter<Question | undefined>,
  runtimeState: RoomRuntimeState,
  actions: SlideNavigationActions,
) {
  const warningOpen = ref(false)
  const canJumpToLast = computed(() => runtimeState.hasVisitedFinalSlide)

  function closeWarning() {
    warningOpen.value = false
  }

  function navigate(action: () => void, forward = false) {
    if (shouldBlockSlideNavigation({
      forward,
      hasQuestion: Boolean(toValue(currentQuestion)),
      questionOpen: runtimeState.questionOpen,
      questionClosed: runtimeState.questionClosed,
    })) {
      warningOpen.value = true
      return
    }
    action()
  }

  function first() {
    navigate(actions.first)
  }

  function previous() {
    navigate(actions.previous)
  }

  function next() {
    navigate(actions.next, true)
  }

  function last() {
    if (!canJumpToLast.value) return
    navigate(actions.last, true)
  }

  return {
    warningOpen: readonly(warningOpen),
    canJumpToLast,
    closeWarning,
    first,
    previous,
    next,
    last,
  }
}
