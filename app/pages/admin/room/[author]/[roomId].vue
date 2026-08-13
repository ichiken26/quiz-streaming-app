<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const {
  roomId,
  room,
  error,
  status,
  realtime,
  controller,
  timer,
  answerResults,
  leaderboard,
  isFinalSlide,
  currentQuestionNumber,
  currentSlideHeading,
  resettingSession,
  resetConfirmOpen,
  winnerLastRank,
  canGoNext,
  canGoPrevious,
  canGoFirst,
  canGoLast,
  slideNavigation,
  revealWinner,
  closeWinner,
  resetRoomSession,
} = useAdminQuizRoom()

useHead({
  title: computed(() => room.value ? `Admin | ${room.value.title}` : 'Quiz Admin'),
})
</script>

<template>
  <main class="admin-page">
    <WinnerRevealModal :reveal="realtime.state.winnerReveal" admin @close="closeWinner" />
    <SessionResetConfirmModal
      :open="resetConfirmOpen"
      :resetting="resettingSession"
      @close="resetConfirmOpen = false"
      @confirm="resetRoomSession"
    />
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
            :has-winners="Boolean(leaderboard.winnersThroughRank(winnerLastRank).length)"
            :winner-last-rank="winnerLastRank"
            :remaining-seconds="timer.remainingSeconds.value"
            :can-go-first="canGoFirst"
            :can-go-previous="canGoPrevious"
            :can-go-next="canGoNext"
            :can-go-last="canGoLast"
            :resetting="resettingSession"
            :disabled="realtime.connectionStatus.value !== 'connected'"
            @previous="slideNavigation.previous"
            @next="slideNavigation.next"
            @first="slideNavigation.first"
            @last="slideNavigation.last"
            @open-question="controller.openQuestion"
            @close-question="controller.closeQuestion"
            @show-answer="controller.showAnswer"
            @show-results="controller.showResults"
            @reveal-winner="revealWinner"
            @close-winner="closeWinner"
            @reset-session="resetConfirmOpen = true"
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
