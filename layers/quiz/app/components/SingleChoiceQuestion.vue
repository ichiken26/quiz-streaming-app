<script setup lang="ts">
import type { Question } from '#shared/types/quiz'

const props = defineProps<{
  question: Question
  questionNumber?: number
  remainingSeconds: number
  expired: boolean
  answeredChoiceId?: string
  answeredChoiceIds?: readonly string[]
  answerState: 'waiting' | 'open' | 'closed'
  submitting?: boolean
  submissionError?: string
}>()

const emit = defineEmits<{
  answer: [choiceIds: string[], options?: { atDeadline?: boolean }]
}>()

const selectedChoiceIds = ref<string[]>([])
const submissionRequested = ref(false)
const hasAnswered = computed(() => Boolean(props.answeredChoiceId))
const isLocked = computed(
  () => props.answerState !== 'open' || props.expired || hasAnswered.value || props.submitting,
)

watch(
  [() => props.question.id, () => props.answeredChoiceId],
  () => {
    submissionRequested.value = false
    selectedChoiceIds.value = props.answeredChoiceIds?.length
      ? [...props.answeredChoiceIds]
      : props.answeredChoiceId ? [props.answeredChoiceId] : []
  },
  { immediate: true },
)

watch(() => props.submissionError, (error) => {
  if (error && !props.expired) submissionRequested.value = false
})

function submitAnswer() {
  if (!selectedChoiceIds.value.length || isLocked.value || submissionRequested.value) return
  submissionRequested.value = true
  emit('answer', [...selectedChoiceIds.value])
}

watch(
  [
    () => props.expired,
    () => props.answerState,
    () => props.submitting,
    () => props.answeredChoiceId,
  ],
  ([expired, answerState, submitting, answeredChoiceId]) => {
    if (
      !expired
      || answerState !== 'open'
      || submitting
      || answeredChoiceId
      || submissionRequested.value
      || !selectedChoiceIds.value.length
    ) return

    submissionRequested.value = true
    emit('answer', [...selectedChoiceIds.value], { atDeadline: true })
  },
)
</script>

<template>
  <section class="question-panel" aria-labelledby="question-title">
    <header class="question-panel__header">
      <p v-if="questionNumber" class="eyebrow">Q{{ questionNumber }}</p>
      <QuestionCountdown :visible="answerState === 'open'" :remaining-seconds="remainingSeconds" />
    </header>

    <h2 id="question-title">{{ question.text }}</h2>

    <fieldset class="choice-list" :disabled="isLocked">
      <legend class="visually-hidden">{{ question.type === 'single' ? '回答を1つ選択' : '回答を複数選択' }}</legend>
      <label
        v-for="choice in question.choices"
        :key="choice.id"
        class="choice"
        :class="{ 'choice--selected': selectedChoiceIds.includes(choice.id) }"
      >
        <input
          v-if="question.type === 'single'"
          :checked="selectedChoiceIds[0] === choice.id"
          type="radio"
          :value="choice.id"
          @change="selectedChoiceIds = [choice.id]"
        >
        <input v-else v-model="selectedChoiceIds" type="checkbox" :value="choice.id">
        <span class="choice__label">{{ choice.label }}</span>
        <span class="choice__text">{{ choice.text }}</span>
      </label>
    </fieldset>

    <p v-if="hasAnswered" class="notice notice--success" role="status">
      回答済み
    </p>
    <p v-else-if="submitting || submissionRequested" class="notice notice--info" role="status">
      回答を送信しています
    </p>
    <p v-else-if="expired && answerState === 'open'" class="notice notice--danger" role="status">
      回答時間が終了しました
    </p>
    <p v-else-if="answerState === 'waiting'" class="notice notice--info" role="status">
      回答受付を待っています
    </p>
    <p v-else-if="answerState === 'closed'" class="notice notice--danger" role="status">
      回答受付は終了しました
    </p>
    <button
      v-else
      class="button button--primary question-panel__submit"
      type="button"
      :disabled="!selectedChoiceIds.length || submitting || submissionRequested"
      @click="submitAnswer"
    >
      {{ submitting || submissionRequested ? '送信中' : '回答する' }}
    </button>
    <p v-if="submissionError" class="form-error" role="alert">{{ submissionError }}</p>
  </section>
</template>
