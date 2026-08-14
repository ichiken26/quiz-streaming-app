<script setup lang="ts">
import type { Choice, Question, QuestionType, RoomConfig, Slide } from '#shared/types/quiz'

const props = defineProps<{
  room: RoomConfig
  selected: Set<string>
  convertingPdf: boolean
  questionFor: (slide: Slide) => Question | undefined
  questionLabel: (slide: Slide) => string
}>()

const emit = defineEmits<{
  add: [afterSlideId: string, kind: 'image' | 'quiz']
  replaceImage: [slideId: string]
  removeImage: [slide: Slide]
  dropImage: [slideId: string, files?: FileList]
  removeSelected: []
  toggleSelected: [slideId: string, checked: boolean]
  dragStart: [index: number]
  reorder: [index: number]
  openContextMenu: [event: MouseEvent, slideId?: string]
  updateSlideTitle: [slide: Slide, title: string]
  updateQuestionType: [question: Question, type: QuestionType]
  updateQuestionText: [question: Question, text: string]
  updateChoice: [question: Question, choice: Choice, text: string]
  focusChoice: [choiceId: string]
  blurChoice: [question: Question, choice: Choice]
  setCorrect: [question: Question, choiceId: string, checked: boolean]
  removeChoice: [question: Question, choiceId: string]
  addChoice: [question: Question]
  updateTimeLimit: [question: Question, seconds: number]
  chooseAudio: [question: Question]
  removeAudio: [question: Question]
  dropFiles: [event: DragEvent]
}>()

function updateQuestionType(question: Question, type: QuestionType) {
  emit('updateQuestionType', question, type)
}

function updateQuestionText(question: Question, text: string) {
  emit('updateQuestionText', question, text)
}

function updateChoice(question: Question, choice: Choice, text: string) {
  emit('updateChoice', question, choice, text)
}

function updateTimeLimit(question: Question, seconds: number) {
  emit('updateTimeLimit', question, seconds)
}
</script>

<template>
  <section class="content-editor" aria-labelledby="content-title">
    <header class="content-editor__header">
      <div><p class="eyebrow">CONTENT</p><h2 id="content-title">コンテンツ追加スペース</h2></div>
      <button
        v-if="selected.size"
        class="button button--danger"
        type="button"
        @click="$emit('removeSelected')"
      >選択された全てのコンテンツを削除する（{{ selected.size }}）</button>
    </header>

    <div
      class="content-canvas"
      @dragover.prevent
      @drop.prevent="$emit('dropFiles', $event)"
      @dblclick.self="$emit('add', '', 'quiz')"
      @contextmenu.self="$emit('openContextMenu', $event)"
    >
      <article
        v-for="(slide, index) in room.slides"
        :key="slide.id"
        class="editor-content"
        draggable="true"
        @dragstart="$emit('dragStart', index)"
        @dragover.prevent
        @drop.stop="$emit('reorder', index)"
        @contextmenu="$emit('openContextMenu', $event, slide.id)"
      >
        <input
          type="checkbox"
          :checked="selected.has(slide.id)"
          :aria-label="`${slide.title}を選択`"
          @change="$emit('toggleSelected', slide.id, ($event.target as HTMLInputElement).checked)"
        >
        <span class="drag-handle" title="ドラッグして並び替え">⠿</span>

        <div v-if="slide.type !== 'question'" class="image-content">
          <img :src="slide.imageUrl" :alt="slide.title">
          <label>画像タイトル
            <input
              :value="slide.title"
              @input="$emit('updateSlideTitle', slide, ($event.target as HTMLInputElement).value)"
            >
          </label>
          <button class="button button--secondary" type="button" @click="$emit('replaceImage', slide.id)">画像を差し替える</button>
        </div>

        <AdminQuizEditor
          v-else-if="questionFor(slide)"
          :slide="slide"
          :question="questionFor(slide)!"
          :question-label="questionLabel(slide)"
          @choose-image="$emit('replaceImage', slide.id)"
          @remove-image="$emit('removeImage', slide)"
          @drop-image="$emit('dropImage', slide.id, $event)"
          @update-type="updateQuestionType(questionFor(slide)!, $event)"
          @update-text="updateQuestionText(questionFor(slide)!, $event)"
          @update-choice="(choice, text) => updateChoice(questionFor(slide)!, choice, text)"
          @focus-choice="$emit('focusChoice', $event)"
          @blur-choice="$emit('blurChoice', questionFor(slide)!, $event)"
          @set-correct="(choiceId, checked) => $emit('setCorrect', questionFor(slide)!, choiceId, checked)"
          @remove-choice="$emit('removeChoice', questionFor(slide)!, $event)"
          @add-choice="$emit('addChoice', questionFor(slide)!)"
          @update-time-limit="updateTimeLimit(questionFor(slide)!, $event)"
          @choose-audio="$emit('chooseAudio', questionFor(slide)!)"
          @remove-audio="$emit('removeAudio', questionFor(slide)!)"
        />
      </article>

      <div v-if="!room.slides.length" class="content-empty">
        <strong>ここに画像またはPDFをドロップ</strong>
        <span>またはダブルクリックしてクイズを追加</span>
      </div>

      <footer class="content-add-actions">
        <button
          class="button button--secondary"
          type="button"
          :disabled="convertingPdf"
          @click="$emit('add', '', 'image')"
        >
          {{ convertingPdf ? 'PDFを変換中…' : '画像/PDFの追加' }}
        </button>
        <button class="button button--secondary" type="button" @click="$emit('add', '', 'quiz')">クイズの追加</button>
      </footer>
    </div>
  </section>
</template>
