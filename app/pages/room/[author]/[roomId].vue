<script setup lang="ts">
definePageMeta({ layout: 'room' })

const {
  roomId,
  room,
  error,
  status,
  realtime,
  identity,
  currentSlide,
  currentQuestion,
  currentQuestionNumber,
  answerState,
  timer,
  localAnswer,
  answerSubmission,
  answerQuestion,
} = useParticipantQuizRoom()

useHead({
  title: computed(() => room.value ? `${room.value.title} | Quiz` : 'Quiz Room'),
})
</script>

<template>
  <main class="participant-page">
    <ParticipantNicknameModal
      :open="identity.loaded.value && !identity.hasNickname.value"
      :room-title="room?.title"
      :current-nickname="identity.nickname.value"
      @save="identity.save"
    />
    <WinnerRevealModal
      :reveal="realtime.state.winnerReveal"
      :participant-nickname="identity.nickname.value"
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
      <header class="participant-header page-title-header">
        <div>
          <p class="eyebrow">LIVE QUIZ</p>
          <h1>{{ room.title }}</h1>
        </div>
        <div class="participant-identity">
          <span class="room-id">roomId: {{ room.roomId }}</span>
          <strong>{{ identity.nickname.value || 'ニックネーム未設定' }}</strong>
        </div>
      </header>

      <div
        class="participant-content"
        :class="{ 'participant-content--question': currentQuestion }"
      >
        <SlideViewer :slide="currentSlide" />

        <PlaybackStatus
          :state="realtime.state"
          :total="room.slides.length"
          :slide-id="currentSlide?.id"
          :connection-status="realtime.connectionStatus.value"
        />

        <SingleChoiceQuestion
          v-if="currentQuestion"
          :key="currentQuestion.id"
          :question="currentQuestion"
          :question-number="currentQuestionNumber"
          :remaining-seconds="timer.remainingSeconds.value"
          :expired="timer.isExpired.value"
          :answer-state="answerState"
          :answered-choice-id="localAnswer.answer.value?.choiceId"
          :answered-choice-ids="localAnswer.answer.value?.choiceIds"
          :submitting="answerSubmission.isSubmitting.value"
          :submission-error="answerSubmission.submissionError.value"
          @answer="answerQuestion"
        />

        <RealtimeStatusNotice
          :status="realtime.connectionStatus.value"
          :error="realtime.connectionError.value"
        />
      </div>
    </template>
  </main>
</template>
