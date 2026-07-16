export type SlideNavigationGuard = {
  forward: boolean
  hasQuestion: boolean
  questionOpen: boolean
  questionClosed: boolean
}

export function shouldBlockSlideNavigation({
  forward,
  hasQuestion,
  questionOpen,
  questionClosed,
}: SlideNavigationGuard) {
  return questionOpen || (forward && hasQuestion && !questionClosed)
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
