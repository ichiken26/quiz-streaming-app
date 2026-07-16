<script setup lang="ts">
import type { Question, RealtimeAnswer } from '#shared/types/quiz'

const props = defineProps<{
  question: Question
  answers: readonly RealtimeAnswer[]
}>()

const nicknameAnswers = computed(() => {
  const grouped = new Map<string, RealtimeAnswer>()
  for (const answer of props.answers) {
    const nickname = answer.nickname?.trim() || '名前未設定'
    const existing = grouped.get(nickname)
    if (!existing || answer.answeredAt >= existing.answeredAt) grouped.set(nickname, answer)
  }
  return grouped
})
const total = computed(() => nicknameAnswers.value.size)
const resultRows = computed(() => props.question.choices.map((choice) => {
  const count = [...nicknameAnswers.value.values()]
    .filter(answer => (answer.choiceIds?.length ? answer.choiceIds : [answer.choiceId]).includes(choice.id)).length
  return {
    ...choice,
    count,
    percentage: total.value ? Math.round((count / total.value) * 100) : 0,
  }
}))
const participantRows = computed(() => [...nicknameAnswers.value.entries()].map(([nickname, answer]) => {
  const ids = answer.choiceIds?.length ? answer.choiceIds : [answer.choiceId]
  const labels = props.question.choices.filter(choice => ids.includes(choice.id)).map(choice => choice.label).join('・')
  return { nickname, labels }
}).sort((a, b) => a.nickname.localeCompare(b.nickname, 'ja')))
</script>

<template>
  <section class="answer-results" aria-labelledby="answer-results-title">
    <header>
      <div>
        <p class="eyebrow">LIVE ANSWERS</p>
        <h2 id="answer-results-title">回答結果</h2>
      </div>
      <strong class="answer-results__total">{{ total }}<span>件</span></strong>
    </header>
    <ol>
      <li v-for="row in resultRows" :key="row.id">
        <div class="answer-results__label">
          <strong>{{ row.label }}</strong>
          <span>{{ row.text }}</span>
          <b>{{ row.count }}</b>
        </div>
        <div class="answer-results__track" aria-hidden="true">
          <span :style="{ width: `${row.percentage}%` }" />
        </div>
      </li>
    </ol>
    <div class="nickname-answers">
      <p class="eyebrow">BY NICKNAME</p>
      <ul>
        <li v-for="row in participantRows" :key="row.nickname">
          <span>{{ row.nickname }}</span><strong>{{ row.labels || '-' }}</strong>
        </li>
      </ul>
    </div>
  </section>
</template>
