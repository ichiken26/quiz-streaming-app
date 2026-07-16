import type { Slide } from '../types/quiz'

export function getQuestionNumber(slides: readonly Slide[], slideId?: string) {
  let questionNumber = 0

  for (const slide of slides) {
    if (slide.type === 'question') questionNumber += 1
    if (slide.id === slideId) {
      return slide.type === 'question' ? questionNumber : undefined
    }
  }

  return undefined
}
