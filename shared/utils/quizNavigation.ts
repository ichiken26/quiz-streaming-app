export type SlideNavigationGuard = {
  mode: string
  hasQuestion: boolean
  questionOpen: boolean
  questionClosed: boolean
  atFirstSlide: boolean
  atLastSlide: boolean
  hasVisitedFinalSlide: boolean
}

/** 回答を受け付けている最中か（回答受付開始〜回答締切/自動締切の間） */
export function isQuestionAcceptanceActive({
  mode,
  questionOpen,
}: Pick<SlideNavigationGuard, 'mode' | 'questionOpen'>) {
  return mode === 'question' && questionOpen
}

/** クイズスライドで次へ進めるか（回答締切済み、または通常スライド） */
export function canNavigateForward({
  hasQuestion,
  questionOpen,
  questionClosed,
  atLastSlide,
  mode,
}: SlideNavigationGuard) {
  if (atLastSlide) return false
  if (isQuestionAcceptanceActive({ mode, questionOpen })) return false
  if (hasQuestion && !questionClosed) return false
  return true
}

export function canNavigateBackward({
  mode,
  questionOpen,
  atFirstSlide,
}: Pick<SlideNavigationGuard, 'mode' | 'questionOpen' | 'atFirstSlide'>) {
  return !atFirstSlide && !isQuestionAcceptanceActive({ mode, questionOpen })
}

export function canJumpToLastSlide(options: SlideNavigationGuard) {
  if (!options.hasVisitedFinalSlide || options.atLastSlide) return false
  return canNavigateForward(options)
}

/** @deprecated Prefer canNavigateForward / canNavigateBackward for UI disable logic */
export function shouldBlockSlideNavigation({
  forward,
  mode,
  hasQuestion,
  questionOpen,
  questionClosed,
}: SlideNavigationGuard & { forward: boolean }) {
  if (isQuestionAcceptanceActive({ mode, questionOpen })) return true
  return forward && hasQuestion && !questionClosed
}

export function recordFinalSlideVisit(
  alreadyVisited: boolean,
  currentIndex: number,
  targetIndex: number,
  totalSlides: number,
) {
  if (alreadyVisited || totalSlides <= 0) return alreadyVisited
  const finalIndex = totalSlides - 1
  return currentIndex === finalIndex || targetIndex === finalIndex
}
