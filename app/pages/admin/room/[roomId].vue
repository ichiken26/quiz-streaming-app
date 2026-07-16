<script setup lang="ts">
import { getQuestionNumber } from '#shared/utils/quizSlides'

import type { RoomRuntimeState } from '#shared/types/quiz'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const roomId = computed(() => String(route.params.roomId))
const { room, error, status } = useRoomConfig(roomId)
const realtime = useRealtimeRoomState(roomId)
const controller = useRoomRuntimeState(
  room,
  realtime.state,
  realtime.publishState,
)
const timer = useSyncedQuestionTimer(
  computed(() => controller.currentQuestion.value),
  realtime.state,
)
const answerResults = useRealtimeAnswers(
  roomId,
  computed(() => controller.currentQuestion.value?.id),
  computed(() => realtime.state.sessionId),
)
const leaderboard = useRealtimeLeaderboard(
  roomId,
  computed(() => room.value?.questions ?? []),
  computed(() => realtime.state.sessionId),
)
const isFinalSlide = computed(() => Boolean(
  room.value?.slides.length
  && realtime.state.currentSlideIndex === room.value.slides.length - 1,
))
const currentQuestionNumber = computed(() => getQuestionNumber(
  room.value?.slides ?? [],
  controller.currentSlide.value?.id,
))
const currentSlideHeading = computed(() => currentQuestionNumber.value
  ? `Q${currentQuestionNumber.value}`
  : controller.currentSlide.value?.title)
const resettingSession = ref(false)

async function revealWinner() {
  if (!isFinalSlide.value || !leaderboard.winners.value.length) return
  await realtime.publishState({
    ...realtime.state,
    winnerReveal: {
      open: true,
      winners: [...leaderboard.winners.value],
      revealedAt: Date.now(),
    },
  })
}

async function closeWinner() {
  await realtime.publishState({ ...realtime.state, winnerReveal: undefined })
}

async function resetRoomSession() {
  if (!room.value || !window.confirm(
    '現在の回答集計を終了し、参加者のニックネームと回答済み状態をリセットします。続行しますか？',
  )) return
  resettingSession.value = true
  try {
    await realtime.resetSession({
      currentSlideIndex: room.value.initialSlideIndex,
      mode: 'slide',
      currentQuestionId: room.value.slides[room.value.initialSlideIndex]?.questionId,
      questionOpen: false,
    })
  }
  finally {
    resettingSession.value = false
  }
}

watch(
  room,
  async (config) => {
    if (!config) return
    const initialState: RoomRuntimeState = {
      currentSlideIndex: config.initialSlideIndex,
      mode: 'slide',
      currentQuestionId: config.slides[config.initialSlideIndex]?.questionId,
      questionOpen: false,
      winnerReveal: undefined,
    }
    try {
      await realtime.initializeState(initialState)
    }
    catch {
      // Connection details are exposed by the realtime composable.
    }
  },
  { immediate: true },
)

useHead({
  title: computed(() => room.value ? `Admin | ${room.value.title}` : 'Quiz Admin'),
})
</script>

<template>
  <main class="admin-page">
    <WinnerRevealModal :reveal="realtime.state.winnerReveal" admin @close="closeWinner" />
    <div v-if="status === 'pending' || status === 'idle'" class="page-message" role="status">
      <span class="loader" aria-hidden="true" />
      部屋情報を読み込んでいます
    </div>

    <div v-else-if="error || !room" class="page-message page-message--error" role="alert">
      <strong>部屋情報を読み込めませんでした</strong>
      <span>roomId: {{ roomId }}</span>
    </div>

    <template v-else>
      <header class="admin-header">
        <div>
          <p class="eyebrow">QUIZ CONTROL</p>
          <h1>{{ room.title }}</h1>
        </div>
        <dl class="admin-meta">
          <div><dt>ROOM ID</dt><dd>{{ room.roomId }}</dd></div>
          <div><dt>SLIDE</dt><dd>{{ realtime.state.currentSlideIndex + 1 }} / {{ room.slides.length }}</dd></div>
          <div><dt>ID</dt><dd>{{ controller.currentSlide.value?.id ?? '-' }}</dd></div>
        </dl>
      </header>

      <div class="admin-layout">
        <section class="admin-preview" aria-labelledby="preview-title">
          <div class="section-heading">
            <p class="eyebrow">PREVIEW</p>
            <h2 id="preview-title">{{ currentSlideHeading }}</h2>
          </div>
          <SlideViewer :slide="controller.currentSlide.value" />
        </section>

        <aside class="admin-sidebar">
          <AdminControls
            :state="realtime.state"
            :total="room.slides.length"
            :has-question="Boolean(controller.currentQuestion.value)"
            :is-final-slide="isFinalSlide"
            :has-winners="Boolean(leaderboard.winners.value.length)"
            :remaining-seconds="timer.remainingSeconds.value"
            :resetting="resettingSession"
            :disabled="realtime.connectionStatus.value !== 'connected'"
            @previous="controller.previous"
            @next="controller.next"
            @first="controller.first"
            @last="controller.last"
            @open-question="controller.openQuestion"
            @close-question="controller.closeQuestion"
            @show-answer="controller.showAnswer"
            @show-results="controller.showResults"
            @reveal-winner="revealWinner"
            @close-winner="closeWinner"
            @reset-session="resetRoomSession"
          />

          <AdminQuestionSummary
            v-if="controller.currentQuestion.value"
            :question="controller.currentQuestion.value"
            :question-number="currentQuestionNumber"
            :mode="realtime.state.mode"
          />

          <AnswerResults
            v-if="controller.currentQuestion.value"
            :question="controller.currentQuestion.value"
            :answers="answerResults.answers.value"
          />

          <AdminLeaderboard :entries="leaderboard.leaderboard.value" />

          <RealtimeStatusNotice
            :status="controller.operationError.value ? 'error' : realtime.connectionStatus.value"
            :error="realtime.connectionError.value ?? controller.operationError.value"
          />
          <RealtimeStatusNotice
            v-if="answerResults.connectionStatus.value === 'error'"
            status="error"
            :error="answerResults.connectionError.value"
          />
          <RealtimeStatusNotice
            v-if="leaderboard.connectionError.value"
            status="error"
            :error="leaderboard.connectionError.value"
          />
        </aside>
      </div>
    </template>
  </main>
</template>
