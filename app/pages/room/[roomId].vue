<script setup lang="ts">
import { getQuestionNumber } from '#shared/utils/quizSlides'

definePageMeta({ layout: 'room' })

const route = useRoute()
const roomId = computed(() => String(route.params.roomId))
const { room, error, status } = useRoomConfig(roomId)
const realtime = useRealtimeRoomState(roomId)
const identity = useParticipantIdentity(roomId, computed(() => realtime.state.sessionId))

const currentSlide = computed(() => {
  const slides = room.value?.slides
  if (!slides?.length) return undefined
  const index = Math.min(
    Math.max(realtime.state.currentSlideIndex, 0),
    slides.length - 1,
  )
  return slides[index]
})
const currentQuestion = computed(() => {
  const slide = currentSlide.value
  if (slide?.type !== 'question' || !slide.questionId) return undefined
  return room.value?.questions.find(question => question.id === slide.questionId)
})
const currentQuestionNumber = computed(() => getQuestionNumber(
  room.value?.slides ?? [],
  currentSlide.value?.id,
))
const answerState = computed<'waiting' | 'open' | 'closed'>(() => {
  if (realtime.state.questionOpen && realtime.state.mode === 'question') return 'open'
  if (['closed', 'answer', 'result'].includes(realtime.state.mode)) return 'closed'
  return 'waiting'
})

const timer = useSyncedQuestionTimer(currentQuestion, realtime.state)
const localAnswer = useLocalAnswer(
  roomId,
  computed(() => currentQuestion.value?.id),
  computed(() => realtime.state.sessionId),
)
const answerSubmission = useRealtimeAnswerSubmission(
  roomId,
  computed(() => currentQuestion.value?.id),
)

async function answerQuestion(
  choiceIds: string[],
  options: { atDeadline?: boolean } = {},
) {
  if (
    answerState.value !== 'open'
    || (timer.isExpired.value && !options.atDeadline)
    || localAnswer.hasAnswered.value
  ) return

  try {
    await answerSubmission.submitAnswer(
      choiceIds,
      identity.nickname.value,
      realtime.state.sessionId,
    )
    localAnswer.saveAnswer(choiceIds)
  }
  catch {
    // The submission composable exposes the user-facing error state.
  }
}

function saveNickname(nickname: string) {
  identity.save(nickname)
}

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
      @save="saveNickname"
    />
    <WinnerRevealModal :reveal="realtime.state.winnerReveal" />
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
