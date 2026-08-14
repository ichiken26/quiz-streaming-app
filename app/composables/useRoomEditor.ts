import { computed, reactive, ref } from 'vue'
import { QUIZ_EDITOR_LIMITS, isValidRoomIdentifier } from '#shared/constants/quiz'
import type { Choice, Question, RoomChange, Slide } from '#shared/types/quiz'
import { getCorrectChoiceIds } from '#shared/utils/quizScoring'
import { getQuestionNumber } from '#shared/utils/quizSlides'
import {
  choiceLabel,
  createEmptyRoomConfig,
  createId,
  createQuestion,
  isRoomConfigComplete,
  questionForSlide,
} from '#shared/utils/roomConfig'

export function useRoomEditor() {
  const room = reactive(createEmptyRoomConfig())
  const selected = ref(new Set<string>())
  const activeChoiceIds = ref(new Set<string>())
  const changes = ref<RoomChange[]>([])
  const draggedIndex = ref<number>()
  const contextMenu = reactive({ open: false, x: 0, y: 0, slideId: '' })

  const authorValid = computed(() => isValidRoomIdentifier(room.author))
  const roomIdValid = computed(() => isValidRoomIdentifier(room.roomId))
  const canSave = computed(() => isRoomConfigComplete(room))
  const contextSlide = computed(() => room.slides.find(slide => slide.id === contextMenu.slideId))

  function questionFor(slide: Slide) {
    return questionForSlide(room, slide)
  }

  function questionLabel(slide: Slide) {
    return `Q${getQuestionNumber(room.slides, slide.id) ?? '-'}`
  }

  function markChanged(field: string, contentId?: string) {
    const key = `${field}:${contentId ?? ''}`
    const next = { field, contentId, changedAt: new Date().toISOString() }
    const index = changes.value.findIndex(item => `${item.field}:${item.contentId ?? ''}` === key)
    if (index >= 0) changes.value[index] = next
    else changes.value.push(next)
  }

  function insertSlide(slide: Slide, afterSlideId = '') {
    const targetIndex = room.slides.findIndex(item => item.id === afterSlideId)
    if (targetIndex >= 0) room.slides.splice(targetIndex + 1, 0, slide)
    else room.slides.push(slide)
  }

  function addQuiz(afterSlideId = '') {
    const question = createQuestion()
    room.questions.push(question)
    insertSlide({
      id: createId('content'),
      type: 'question',
      title: '新しいクイズ',
      imageUrl: '',
      questionId: question.id,
    }, afterSlideId)
    markChanged('content:add', question.id)
    closeContextMenu()
  }

  function transformSlide(slide: Slide) {
    if (slide.type === 'question') {
      const questionId = slide.questionId
      slide.type = 'slide'
      slide.questionId = undefined
      if (questionId && !room.slides.some(item => item !== slide && item.questionId === questionId)) {
        room.questions = room.questions.filter(question => question.id !== questionId)
      }
    }
    else {
      const question = createQuestion()
      room.questions.push(question)
      slide.type = 'question'
      slide.questionId = question.id
    }
    markChanged('content:transform', slide.id)
    closeContextMenu()
  }

  function addChoice(question: Question) {
    if (question.choices.length >= QUIZ_EDITOR_LIMITS.maxChoices) return
    question.choices.push({
      id: createId('choice'),
      label: choiceLabel(question.choices.length),
      text: '',
    })
    markChanged('quiz:choices', question.id)
  }

  function updateActiveChoice(choiceId: string, active: boolean) {
    const next = new Set(activeChoiceIds.value)
    if (active) next.add(choiceId)
    else next.delete(choiceId)
    activeChoiceIds.value = next
  }

  function removeChoice(question: Question, choiceId: string) {
    if (question.choices.length <= QUIZ_EDITOR_LIMITS.minChoices) return
    const choiceIndex = question.choices.findIndex(choice => choice.id === choiceId)
    if (choiceIndex < 0) return

    question.choices.splice(choiceIndex, 1)
    question.choices = question.choices.map((choice, index) => ({
      ...choice,
      label: choiceLabel(index),
    }))
    const available = new Set(question.choices.map(choice => choice.id))
    question.correctChoiceIds = getCorrectChoiceIds(question).filter(id => available.has(id))
    question.correctChoiceId = question.type === 'single' ? question.correctChoiceIds[0] : undefined
    updateActiveChoice(choiceId, false)
    markChanged('quiz:choices', question.id)
  }

  function removeEmptyChoiceOnBlur(question: Question, choice: Choice) {
    if (!activeChoiceIds.value.has(choice.id)) return
    updateActiveChoice(choice.id, false)
    if (!choice.text.trim()) removeChoice(question, choice.id)
  }

  function setQuestionType(question: Question) {
    const first = getCorrectChoiceIds(question)[0]
    question.correctChoiceId = question.type === 'single' ? first : undefined
    question.correctChoiceIds = first ? [first] : []
    markChanged('quiz:type', question.id)
  }

  function setCorrect(question: Question, choiceId: string, checked: boolean) {
    if (question.type === 'single') {
      question.correctChoiceId = choiceId
      question.correctChoiceIds = [choiceId]
    }
    else {
      const ids = new Set(getCorrectChoiceIds(question))
      if (checked) ids.add(choiceId)
      else ids.delete(choiceId)
      question.correctChoiceIds = [...ids]
      question.correctChoiceId = undefined
    }
    markChanged('quiz:answer', question.id)
  }

  function toggleSelected(id: string, checked: boolean) {
    const next = new Set(selected.value)
    if (checked) next.add(id)
    else next.delete(id)
    selected.value = next
  }

  async function removeSlides(
    ids: Set<string>,
    deleteImage: (imageUrl: string) => Promise<void>,
    deleteAudio: (audioUrl: string) => Promise<void>,
  ) {
    const removed = room.slides.filter(slide => ids.has(slide.id))
    await Promise.all(removed.map(async (slide) => {
      if (slide.imageUrl) await deleteImage(slide.imageUrl)
      if (slide.type === 'question' && slide.questionId) {
        const question = room.questions.find(item => item.id === slide.questionId)
        if (question?.audio?.url) await deleteAudio(question.audio.url)
      }
    }))
    const questionIds = new Set(
      removed.flatMap(slide => slide.type === 'question' && slide.questionId ? [slide.questionId] : []),
    )
    room.slides = room.slides.filter(slide => !ids.has(slide.id))
    const referencedQuestionIds = new Set(room.slides.flatMap(slide => slide.questionId ? [slide.questionId] : []))
    room.questions = room.questions.filter(
      question => !questionIds.has(question.id) || referencedQuestionIds.has(question.id),
    )
    removed.forEach(slide => markChanged('content:delete', slide.id))
    selected.value = new Set()
    closeContextMenu()
  }

  function dragStart(index: number) {
    draggedIndex.value = index
  }

  function reorder(targetIndex: number) {
    if (draggedIndex.value === undefined || draggedIndex.value === targetIndex) return
    const [item] = room.slides.splice(draggedIndex.value, 1)
    if (item) room.slides.splice(targetIndex, 0, item)
    draggedIndex.value = undefined
    markChanged('content:order')
  }

  function openContextMenu(event: MouseEvent, slideId = '') {
    event.preventDefault()
    Object.assign(contextMenu, { open: true, x: event.clientX, y: event.clientY, slideId })
  }

  function closeContextMenu() {
    contextMenu.open = false
  }

  return {
    room,
    selected,
    changes,
    contextMenu,
    contextSlide,
    authorValid,
    roomIdValid,
    canSave,
    questionFor,
    questionLabel,
    markChanged,
    insertSlide,
    addQuiz,
    transformSlide,
    addChoice,
    activateChoice: (choiceId: string) => updateActiveChoice(choiceId, true),
    removeEmptyChoiceOnBlur,
    removeChoice,
    setQuestionType,
    setCorrect,
    toggleSelected,
    removeSlides,
    dragStart,
    reorder,
    openContextMenu,
    closeContextMenu,
  }
}
