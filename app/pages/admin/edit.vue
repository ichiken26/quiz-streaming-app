<script setup lang="ts">
import QRCode from 'qrcode'
import type { Choice, Question, RoomChange, RoomConfig, Slide } from '#shared/types/quiz'
import { getCorrectChoiceIds } from '#shared/utils/quizScoring'
import { getQuestionNumber } from '#shared/utils/quizSlides'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const router = useRouter()
const { session, status: authStatus } = useAdminSession()
const queryRoomId = computed(() => String(route.query.roomId ?? route.query.q ?? '').trim())
const originalRoomId = ref('')
const loadedRoomId = ref('')
const loadingRoomId = ref('')
const savedOnce = ref(false)
const initialized = ref(false)
const saving = ref(false)
const saveMessage = ref('')
const saveError = ref('')
const roomLoadError = ref('')
const selected = ref(new Set<string>())
const activeChoiceIds = ref(new Set<string>())
const changes = ref<RoomChange[]>([])
const draggedIndex = ref<number>()
const fileInput = ref<HTMLInputElement>()
const replaceSlideId = ref('')
const contextMenu = reactive({ open: false, x: 0, y: 0, slideId: '' })
let saveTimer: ReturnType<typeof setTimeout> | undefined
let messageTimer: ReturnType<typeof setTimeout> | undefined

const room = reactive<RoomConfig>({
  roomId: '',
  title: '',
  description: '',
  initialSlideIndex: 0,
  slides: [],
  questions: [],
})

const roomIdValid = computed(() => /^[A-Za-z0-9._~-]+$/.test(room.roomId))
const canCreate = computed(() => roomIdValid.value && Boolean(room.title.trim()) && contentValid.value)
const contentValid = computed(() => room.slides.every((slide) => {
  if (slide.type !== 'question') return Boolean(slide.imageUrl)
  const question = questionFor(slide)
  if (!question || !question.text.trim() || question.timeLimitSeconds <= 0) return false
  if (question.choices.length < 2 || question.choices.some(choice => !choice.text.trim())) return false
  const answers = getCorrectChoiceIds(question)
  return question.type === 'single' ? answers.length === 1 : answers.length >= 1
}))
const saveState = computed<'unsaved' | 'saving' | 'saved'>(() => {
  if (saving.value) return 'saving'
  if (!savedOnce.value || changes.value.length) return 'unsaved'
  return 'saved'
})
const saveStateLabel = computed(() => ({
  unsaved: '未保存',
  saving: '保存中',
  saved: '保存済',
})[saveState.value])

const participantUrl = computed(() => import.meta.client && savedOnce.value
  ? `${location.origin}/room/${encodeURIComponent(room.roomId)}`
  : '')
const controlUrl = computed(() => import.meta.client && savedOnce.value
  ? `${location.origin}/admin/room/${encodeURIComponent(room.roomId)}`
  : '')
const participantQr = ref('')
const controlQr = ref('')

function questionFor(slide: Slide) {
  return room.questions.find(question => question.id === slide.questionId)
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

function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8)}`
}

function labels(index: number) {
  return String.fromCharCode(65 + index)
}

function addQuiz() {
  const questionId = generateId('question')
  const choices: Choice[] = [0, 1].map(index => ({
    id: generateId('choice'),
    label: labels(index),
    text: '',
  }))
  room.questions.push({
    id: questionId,
    type: 'single',
    text: '',
    choices,
    correctChoiceId: undefined,
    correctChoiceIds: [],
    timeLimitSeconds: 20,
  })
  room.slides.push({
    id: generateId('content'),
    type: 'question',
    title: '新しいクイズ',
    imageUrl: '',
    questionId,
  })
  markChanged('content:add', questionId)
  closeContextMenu()
}

function addChoice(question: Question) {
  if (question.choices.length >= 6) return
  question.choices.push({ id: generateId('choice'), label: labels(question.choices.length), text: '' })
  markChanged('quiz:choices', question.id)
}

function activateChoice(choiceId: string) {
  const next = new Set(activeChoiceIds.value)
  next.add(choiceId)
  activeChoiceIds.value = next
}

function deactivateChoice(choiceId: string) {
  const next = new Set(activeChoiceIds.value)
  next.delete(choiceId)
  activeChoiceIds.value = next
}

function removeChoice(question: Question, choiceId: string) {
  if (question.choices.length <= 2) return
  const choiceIndex = question.choices.findIndex(choice => choice.id === choiceId)
  if (choiceIndex < 0) return

  question.choices.splice(choiceIndex, 1)
  question.choices = question.choices
    .slice(0, 6)
    .map((choice, index) => ({ ...choice, label: labels(index) }))
  const available = new Set(question.choices.map(choice => choice.id))
  question.correctChoiceIds = getCorrectChoiceIds(question).filter(id => available.has(id))
  question.correctChoiceId = question.type === 'single' ? question.correctChoiceIds[0] : undefined
  deactivateChoice(choiceId)
  markChanged('quiz:choices', question.id)
}

function removeEmptyChoiceOnBlur(question: Question, choice: Choice) {
  if (!activeChoiceIds.value.has(choice.id)) return
  deactivateChoice(choice.id)
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

async function uploadFiles(files: FileList | File[]) {
  if (!roomIdValid.value) {
    saveError.value = '画像を追加する前に、有効なルームIDを入力してください'
    return
  }
  const targets = replaceSlideId.value ? Array.from(files).slice(0, 1) : Array.from(files)
  for (const file of targets) {
    if (!file.type.startsWith('image/')) continue
    try {
      const result = await $fetch<{ imageUrl: string }>(`/api/admin/images/${encodeURIComponent(room.roomId)}`, {
        method: 'POST',
        body: file,
        headers: { 'content-type': file.type },
      })
      const replacing = room.slides.find(slide => slide.id === replaceSlideId.value)
      if (replacing) {
        const previousImageUrl = replacing.imageUrl
        replacing.imageUrl = result.imageUrl
        if (replacing.type !== 'question') {
          replacing.title = file.name.replace(/\.[^.]+$/, '')
        }
        markChanged('image:update', replacing.id)
        if (previousImageUrl && previousImageUrl !== result.imageUrl) {
          await deleteStoredImage(previousImageUrl)
        }
      }
      else {
        room.slides.push({
          id: generateId('content'),
          type: 'slide',
          title: file.name.replace(/\.[^.]+$/, ''),
          imageUrl: result.imageUrl,
        })
        markChanged('image:add', result.imageUrl)
      }
    }
    catch (error: unknown) {
      saveError.value = (error as { data?: { error?: string } }).data?.error ?? '画像を追加できませんでした'
    }
  }
  replaceSlideId.value = ''
  if (fileInput.value) fileInput.value.value = ''
}

function chooseReplacement(slideId: string) {
  replaceSlideId.value = slideId
  fileInput.value?.click()
}

function dropReplacement(slideId: string, files: FileList | undefined) {
  if (!files?.length) return
  replaceSlideId.value = slideId
  void uploadFiles(files)
}

async function deleteStoredImage(imageUrl: string) {
  const prefix = `/slides/${room.roomId}/`
  if (!imageUrl.startsWith(prefix)) return
  const objectName = imageUrl.slice(prefix.length)
  await $fetch(
    `/api/admin/images/${encodeURIComponent(room.roomId)}/${encodeURIComponent(objectName)}`,
    { method: 'DELETE' },
  ).catch(() => undefined)
}

async function removeImage(slide: Slide) {
  if (!slide.imageUrl) return
  await deleteStoredImage(slide.imageUrl)
  slide.imageUrl = ''
  markChanged('image:delete', slide.id)
}

function onDropFiles(event: DragEvent) {
  if (event.dataTransfer?.files.length) uploadFiles(event.dataTransfer.files)
}

function toggleSelected(id: string, checked: boolean) {
  const next = new Set(selected.value)
  if (checked) next.add(id)
  else next.delete(id)
  selected.value = next
}

async function removeSlides(ids: Set<string>) {
  const removed = room.slides.filter(slide => ids.has(slide.id))
  await Promise.all(removed.map(slide => deleteStoredImage(slide.imageUrl)))
  const questionIds = new Set(
    removed.filter(slide => slide.type === 'question').map(slide => slide.questionId).filter(Boolean),
  )
  room.slides = room.slides.filter(slide => !ids.has(slide.id))
  const referencedQuestionIds = new Set(room.slides.map(slide => slide.questionId).filter(Boolean))
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

function normalizedRoom(): RoomConfig {
  return JSON.parse(JSON.stringify({ ...room, initialSlideIndex: 0 })) as RoomConfig
}

async function persist(create = false) {
  if (!canCreate.value || saving.value) return
  saving.value = true
  saveError.value = ''
  const submittedChanges = [...changes.value]
  const submittedRoom = normalizedRoom()
  const endpoint = create
    ? '/api/admin/rooms'
    : `/api/admin/rooms/${encodeURIComponent(originalRoomId.value)}`
  let lastError: unknown

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const result = await $fetch<{ roomId: string }>(endpoint, {
        method: create ? 'POST' : 'PATCH',
        body: { room: submittedRoom, changes: submittedChanges },
      })
      originalRoomId.value = result.roomId
      loadedRoomId.value = result.roomId
      savedOnce.value = true
      const submitted = new Set(submittedChanges.map(change => `${change.field}:${change.contentId ?? ''}:${change.changedAt}`))
      changes.value = changes.value.filter(
        change => !submitted.has(`${change.field}:${change.contentId ?? ''}:${change.changedAt}`),
      )
      saveMessage.value = 'ルームを保存しました'
      clearTimeout(messageTimer)
      messageTimer = setTimeout(() => { saveMessage.value = '' }, 2800)
      await router.replace({ path: '/admin/edit', query: { q: result.roomId } })
      await refreshQrCodes()
      saving.value = false
      if (changes.value.length) {
        clearTimeout(saveTimer)
        saveTimer = setTimeout(() => persist(false), 1000)
      }
      return
    }
    catch (error) {
      lastError = error
    }
  }

  saveError.value = (lastError as { data?: { error?: string } }).data?.error
    ?? '保存に失敗しました。しばらくしてもう一度保存してください'
  saving.value = false
}

function saveNow() {
  clearTimeout(saveTimer)
  void persist(!savedOnce.value)
}

async function refreshQrCodes() {
  if (!participantUrl.value) return
  participantQr.value = await QRCode.toDataURL(participantUrl.value, { width: 320, margin: 2 })
  controlQr.value = await QRCode.toDataURL(controlUrl.value, { width: 320, margin: 2 })
}

async function copyUrl(value: string) {
  await navigator.clipboard.writeText(value)
  saveMessage.value = 'URLをコピーしました'
}

function downloadQr(dataUrl: string, kind: string) {
  const anchor = document.createElement('a')
  anchor.href = dataUrl
  anchor.download = `${room.roomId}-${kind}-qr.png`
  anchor.click()
}

async function loadRoom(roomId: string) {
  if (!roomId) {
    originalRoomId.value = ''
    loadedRoomId.value = ''
    initialized.value = true
    return
  }
  if (loadedRoomId.value === roomId || loadingRoomId.value === roomId) return

  originalRoomId.value = roomId
  loadingRoomId.value = roomId
  roomLoadError.value = ''
  initialized.value = false
  try {
    const loaded = await $fetch<RoomConfig>(`/api/admin/rooms/${encodeURIComponent(roomId)}`)
    if (queryRoomId.value !== roomId) return
    Object.assign(room, loaded)
    changes.value = []
    loadedRoomId.value = roomId
    savedOnce.value = true
    initialized.value = true
    await nextTick()
    await refreshQrCodes()
  }
  catch (error: unknown) {
    if (queryRoomId.value !== roomId) return
    roomLoadError.value = (error as { data?: { error?: string } }).data?.error ?? 'ルームを読み込めませんでした'
    initialized.value = true
  }
  finally {
    if (loadingRoomId.value === roomId) loadingRoomId.value = ''
  }
}

watch(
  [authStatus, queryRoomId],
  ([status, roomId]) => {
    if (status !== 'authorized') return
    void loadRoom(roomId)
  },
  { immediate: true },
)

watch(room, () => {
  if (!initialized.value || !savedOnce.value || !changes.value.length) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => persist(false), 1000)
}, { deep: true })

onBeforeUnmount(() => {
  clearTimeout(saveTimer)
  clearTimeout(messageTimer)
})

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
            :disabled="!canCreate || saving"
            @click="saveNow"
          >保存する</button>
        </div>
      </header>

      <p v-if="saveError" class="notice notice--danger" role="alert">{{ saveError }}</p>

      <section class="editor-meta" aria-label="ルーム基本情報">
        <label>
          <span>ルームID <b>必須</b></span>
          <input
            v-model.trim="room.roomId"
            required
            pattern="[A-Za-z0-9._~-]+"
            placeholder="event-room-01"
            @input="markChanged('room:id')"
          >
          <small v-if="room.roomId && !roomIdValid">英数字と . _ ~ - のみ使用できます</small>
        </label>
        <label>
          <span>ルーム名 <b>必須</b></span>
          <input v-model="room.title" required placeholder="社内クイズ大会" @input="markChanged('room:title')">
        </label>
      </section>

      <section class="content-editor" aria-labelledby="content-title">
        <header class="content-editor__header">
          <div><p class="eyebrow">CONTENT</p><h2 id="content-title">コンテンツ追加スペース</h2></div>
          <button
            v-if="selected.size"
            class="button button--danger"
            type="button"
            @click="removeSlides(selected)"
          >選択された全てのコンテンツを削除する（{{ selected.size }}）</button>
        </header>

        <div
          class="content-canvas"
          @dragover.prevent
          @drop.prevent="onDropFiles"
          @dblclick.self="addQuiz"
          @contextmenu.self="openContextMenu($event)"
        >
          <article
            v-for="(slide, index) in room.slides"
            :key="slide.id"
            class="editor-content"
            draggable="true"
            @dragstart="dragStart(index)"
            @dragover.prevent
            @drop.stop="reorder(index)"
            @contextmenu="openContextMenu($event, slide.id)"
          >
            <input
              type="checkbox"
              :checked="selected.has(slide.id)"
              :aria-label="`${slide.title}を選択`"
              @change="toggleSelected(slide.id, ($event.target as HTMLInputElement).checked)"
            >
            <span class="drag-handle" title="ドラッグして並び替え">⠿</span>

            <div v-if="slide.type !== 'question'" class="image-content">
              <img :src="slide.imageUrl" :alt="slide.title">
              <label>画像タイトル<input v-model="slide.title" @input="markChanged('image:title', slide.id)"></label>
              <button class="button button--secondary" type="button" @click="chooseReplacement(slide.id)">画像を差し替える</button>
            </div>

            <div v-else-if="questionFor(slide)" class="quiz-content">
              <div class="quiz-content__heading">
                <strong>{{ questionLabel(slide) }}</strong>
                <select v-model="questionFor(slide)!.type" @change="setQuestionType(questionFor(slide)!)">
                  <option value="single">単一選択</option>
                  <option value="multiple">複数選択</option>
                </select>
              </div>
              <div
                class="quiz-image-editor"
                @dragover.prevent
                @drop.prevent.stop="dropReplacement(slide.id, $event.dataTransfer?.files)"
              >
                <img v-if="slide.imageUrl" :src="slide.imageUrl" :alt="`${slide.title}のクイズ画像`">
                <div v-else class="quiz-image-editor__empty">
                  <strong>クイズ画像</strong>
                  <span>画像をドロップ、またはファイルを選択</span>
                </div>
                <div class="quiz-image-editor__actions">
                  <button class="button button--secondary" type="button" @click="chooseReplacement(slide.id)">
                    {{ slide.imageUrl ? '画像を差し替える' : '画像を選択する' }}
                  </button>
                  <button v-if="slide.imageUrl" class="button button--danger" type="button" @click="removeImage(slide)">
                    画像を削除
                  </button>
                </div>
              </div>
              <label>問題 <b>必須</b>
                <textarea
                  v-model="questionFor(slide)!.text"
                  rows="2"
                  @input="markChanged('quiz:question', questionFor(slide)!.id)"
                />
              </label>
              <fieldset class="choice-editor">
                <legend>選択肢と解答 <b>必須</b></legend>
                <div v-for="choice in questionFor(slide)!.choices" :key="choice.id" class="choice-editor__row">
                  <input
                    :type="questionFor(slide)!.type === 'single' ? 'radio' : 'checkbox'"
                    :name="`answer-${questionFor(slide)!.id}`"
                    :checked="getCorrectChoiceIds(questionFor(slide)!).includes(choice.id)"
                    :aria-label="`${choice.label}を正解に設定`"
                    @change="setCorrect(questionFor(slide)!, choice.id, ($event.target as HTMLInputElement).checked)"
                  >
                  <span>{{ choice.label }}</span>
                  <input
                    v-model="choice.text"
                    :placeholder="`選択肢 ${choice.label}`"
                    :aria-label="`選択肢 ${choice.label}`"
                    @focus="activateChoice(choice.id)"
                    @blur="removeEmptyChoiceOnBlur(questionFor(slide)!, choice)"
                    @input="markChanged('quiz:choices', questionFor(slide)!.id)"
                  >
                  <button
                    class="choice-editor__delete"
                    type="button"
                    :disabled="questionFor(slide)!.choices.length <= 2"
                    :aria-label="`選択肢 ${choice.label}を削除`"
                    :title="questionFor(slide)!.choices.length <= 2 ? '選択肢は2件以上必要です' : `選択肢 ${choice.label}を削除`"
                    @click="removeChoice(questionFor(slide)!, choice.id)"
                  >
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
                      <path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" />
                    </svg>
                  </button>
                </div>
                <button
                  class="button button--secondary"
                  type="button"
                  :disabled="questionFor(slide)!.choices.length >= 6"
                  @click="addChoice(questionFor(slide)!)"
                >選択肢を追加（最大6件）</button>
              </fieldset>
              <label class="time-limit">制限時間 <b>必須</b>
                <span><input v-model.number="questionFor(slide)!.timeLimitSeconds" type="number" min="1" @input="markChanged('quiz:time', questionFor(slide)!.id)"> 秒</span>
              </label>
            </div>
          </article>

          <div v-if="!room.slides.length" class="content-empty">
            <strong>ここに画像をドロップ</strong>
            <span>またはダブルクリックしてクイズを追加</span>
          </div>

          <footer class="content-add-actions">
            <button class="button button--secondary" type="button" @click="fileInput?.click()">画像の追加</button>
            <button class="button button--secondary" type="button" @click="addQuiz">クイズの追加</button>
          </footer>
          <input ref="fileInput" class="visually-hidden" type="file" accept="image/*" multiple @change="uploadFiles(($event.target as HTMLInputElement).files ?? [])">
        </div>
      </section>

      <section v-if="savedOnce" class="share-panel">
        <header><p class="eyebrow">SHARE</p><h2>発行済みURL</h2></header>
        <div class="share-grid">
          <article>
            <h3>参加者用</h3><img :src="participantQr" alt="参加者用URLのQRコード">
            <code>{{ participantUrl }}</code>
            <div><button class="button button--secondary" @click="copyUrl(participantUrl)">URLをコピー</button><button class="button button--primary" @click="downloadQr(participantQr, 'participant')">QRを保存</button></div>
          </article>
          <article>
            <h3>管理者用配信画面</h3><img :src="controlQr" alt="管理者用URLのQRコード">
            <code>{{ controlUrl }}</code>
            <div><button class="button button--secondary" @click="copyUrl(controlUrl)">URLをコピー</button><button class="button button--primary" @click="downloadQr(controlQr, 'admin')">QRを保存</button></div>
          </article>
        </div>
      </section>

      <menu
        v-if="contextMenu.open"
        class="context-menu"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        @click.stop
      >
        <button type="button" @click="fileInput?.click(); closeContextMenu()">画像の追加</button>
        <button type="button" @click="addQuiz">クイズの追加</button>
        <button v-if="contextMenu.slideId" class="danger" type="button" @click="removeSlides(new Set([contextMenu.slideId]))">このコンテンツを削除</button>
      </menu>
    </template>
  </main>
</template>
