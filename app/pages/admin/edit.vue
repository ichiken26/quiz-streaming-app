<script setup lang="ts">
import type { Choice, Question, QuestionType, Slide } from '#shared/types/quiz'
import { ACCEPTED_SLIDE_MEDIA_ACCEPT } from '#shared/utils/slideMedia'

definePageMeta({ layout: 'admin' })

const { session, status: authStatus, verify: verifyAdminSession } = useAdminSession()
const editor = useRoomEditor()
const {
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
  activateChoice,
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
} = editor

let refreshShare = async () => {}
const persistence = useRoomEditorPersistence({
  room,
  changes,
  canSave,
  afterLoad: () => refreshShare(),
  afterSave: () => refreshShare(),
})
const {
  queryRoomId,
  loadedRoomId,
  savedOnce,
  initialized,
  saving,
  saveMessage,
  saveError,
  roomLoadError,
  saveState,
  saveStateLabel,
  showMessage,
  saveNow,
  start: startPersistence,
} = persistence

const share = useRoomEditorShare(room, savedOnce, showMessage)
const {
  participantUrl,
  controlUrl,
  participantQr,
  controlQr,
  copyUrl,
  downloadQr,
} = share
refreshShare = share.refreshQrCodes

const media = useRoomEditorMedia(room, {
  insertSlide,
  markChanged,
  closeContextMenu,
  setError: message => { saveError.value = message },
})
const {
  fileInput,
  convertingPdf,
  uploadFiles,
  chooseAddition,
  chooseReplacement,
  dropReplacement,
  deleteStoredImage,
  removeImage,
  onDropFiles,
} = media

startPersistence(authStatus)

function updateRoomField(field: 'author' | 'roomId' | 'title', value: string) {
  room[field] = value
  markChanged(`room:${field === 'roomId' ? 'id' : field}`)
}

function updateWinnerLastRank(value: number) {
  room.winnerLastRank = value
  markChanged('room:winnerLastRank')
}

function addContent(afterSlideId: string, kind: 'image' | 'quiz') {
  if (kind === 'quiz') addQuiz(afterSlideId)
  else chooseAddition(afterSlideId)
}

function updateQuestionType(question: Question, type: QuestionType) {
  question.type = type
  setQuestionType(question)
}

function updateQuestionText(question: Question, text: string) {
  question.text = text
  markChanged('quiz:question', question.id)
}

function updateChoice(question: Question, choice: Choice, text: string) {
  choice.text = text
  markChanged('quiz:choices', question.id)
}

function updateTimeLimit(question: Question, seconds: number) {
  question.timeLimitSeconds = seconds
  markChanged('quiz:time', question.id)
}

function updateSlideTitle(slide: Slide, title: string) {
  slide.title = title
  markChanged('image:title', slide.id)
}

function removeSelectedSlides() {
  void removeSlides(selected.value, deleteStoredImage)
}

function removeContextSlide() {
  void removeSlides(new Set([contextMenu.slideId]), deleteStoredImage)
}

useHead({ title: computed(() => `${savedOnce.value ? 'ルーム編集' : 'ルーム作成'} | Quiz Stream`) })
</script>

<template>
  <main class="room-editor" @click="closeContextMenu">
    <AdminAccessModal :open="authStatus === 'forbidden'" />
    <div
      v-if="authStatus === 'pending' || authStatus === 'idle' || (authStatus === 'authorized' && !initialized)"
      class="page-message"
    >
      <span class="loader" />{{ authStatus === 'authorized' ? 'ルーム情報を読み込んでいます' : '認証情報を確認しています' }}
    </div>
    <div v-else-if="authStatus === 'error'" class="page-message page-message--error" role="alert">
      <strong>管理APIに接続できませんでした</strong>
      <span>ローカルWorkerの起動状態を確認して、もう一度お試しください。</span>
      <button class="button button--secondary" type="button" @click="verifyAdminSession">再試行</button>
    </div>
    <div
      v-else-if="authStatus === 'authorized' && queryRoomId && loadedRoomId !== queryRoomId"
      class="page-message page-message--error"
      role="alert"
    >
      <strong>ルーム情報を読み込めませんでした</strong>
      <span>{{ roomLoadError || `roomId: ${queryRoomId}` }}</span>
    </div>
    <template v-else-if="authStatus === 'authorized'">
      <header class="editor-header">
        <div>
          <p class="eyebrow">{{ savedOnce ? 'EDIT ROOM' : 'CREATE ROOM' }}</p>
          <h1>{{ savedOnce ? 'ルームを編集する' : 'ルームを作る' }}</h1>
          <small>{{ session?.email }}</small>
        </div>
        <div class="save-area">
          <p v-if="saveMessage" class="save-toast" role="status">{{ saveMessage }}</p>
          <span class="save-state" :class="`save-state--${saveState}`" role="status">
            {{ saveStateLabel }}
          </span>
          <button
            class="button button--primary"
            type="button"
            :disabled="!canSave || saving"
            @click="saveNow"
          >保存する</button>
        </div>
      </header>

      <p v-if="saveError" class="notice notice--danger" role="alert">{{ saveError }}</p>

      <AdminRoomFields
        :author="room.author"
        :room-id="room.roomId"
        :title="room.title"
        :winner-last-rank="room.winnerLastRank"
        :author-valid="authorValid"
        :room-id-valid="roomIdValid"
        @update:author="updateRoomField('author', $event)"
        @update:room-id="updateRoomField('roomId', $event)"
        @update:title="updateRoomField('title', $event)"
        @update:winner-last-rank="updateWinnerLastRank"
      />

      <AdminRoomContentCanvas
        :room="room"
        :selected="selected"
        :converting-pdf="convertingPdf"
        :question-for="questionFor"
        :question-label="questionLabel"
        @add="addContent"
        @replace-image="chooseReplacement"
        @remove-image="removeImage"
        @drop-image="dropReplacement"
        @remove-selected="removeSelectedSlides"
        @toggle-selected="toggleSelected"
        @drag-start="dragStart"
        @reorder="reorder"
        @open-context-menu="openContextMenu"
        @update-slide-title="updateSlideTitle"
        @update-question-type="updateQuestionType"
        @update-question-text="updateQuestionText"
        @update-choice="updateChoice"
        @focus-choice="activateChoice"
        @blur-choice="removeEmptyChoiceOnBlur"
        @set-correct="setCorrect"
        @remove-choice="removeChoice"
        @add-choice="addChoice"
        @update-time-limit="updateTimeLimit"
        @drop-files="onDropFiles"
      />
      <input
        ref="fileInput"
        class="visually-hidden"
        type="file"
        :accept="ACCEPTED_SLIDE_MEDIA_ACCEPT"
        multiple
        @change="uploadFiles(($event.target as HTMLInputElement).files ?? [])"
      >

      <AdminRoomSharePanel
        v-if="savedOnce"
        :participant-url="participantUrl"
        :participant-qr="participantQr"
        :control-url="controlUrl"
        :control-qr="controlQr"
        @copy="copyUrl"
        @download="downloadQr"
      />

      <AdminRoomContextMenu
        v-if="contextMenu.open"
        :x="contextMenu.x"
        :y="contextMenu.y"
        :slide="contextSlide"
        :slide-id="contextMenu.slideId"
        @add="addContent(contextMenu.slideId, $event)"
        @transform="transformSlide"
        @remove="removeContextSlide"
      />
    </template>
  </main>
</template>
