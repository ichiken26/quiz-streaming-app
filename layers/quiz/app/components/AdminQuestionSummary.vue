<script setup lang="ts">
import type { Question, RoomMode } from '#shared/types/quiz'
import { getCorrectChoiceIds } from '#shared/utils/quizScoring'

const props = defineProps<{
  question: Question
  questionNumber?: number
  mode: RoomMode
}>()

const correctChoices = computed(() => {
  const ids = getCorrectChoiceIds(props.question)
  return props.question.choices.filter(choice => ids.includes(choice.id))
})
</script>

<template>
  <section class="admin-question">
    <p v-if="questionNumber" class="eyebrow">Q{{ questionNumber }}</p>
    <h2>{{ question.text }}</h2>
    <ul>
      <li v-for="choice in question.choices" :key="choice.id">
        <strong>{{ choice.label }}</strong><span>{{ choice.text }}</span>
      </li>
    </ul>
    <p v-if="mode === 'answer'" class="answer-reveal" role="status">
      正解:
      <strong>{{ correctChoices.length ? correctChoices.map(choice => `${choice.label} ${choice.text}`).join('、') : '-' }}</strong>
    </p>
  </section>
</template>
