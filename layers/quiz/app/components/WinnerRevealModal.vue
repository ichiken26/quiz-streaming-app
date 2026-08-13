<script setup lang="ts">
import type { WinnerReveal } from '#shared/types/quiz'

const props = defineProps<{ reveal?: WinnerReveal; admin?: boolean; participantNickname?: string }>()
defineEmits<{ close: [] }>()

const participantWinner = computed(() => props.reveal?.winners.find(
  winner => winner.nickname === props.participantNickname,
))
</script>

<template>
  <div v-if="reveal?.open" class="modal-backdrop winner-backdrop" role="presentation">
    <section class="winner-modal" role="dialog" aria-modal="true" aria-labelledby="winner-title">
      <p class="winner-modal__label">QUIZ CHAMPION</p>
      <div class="winner-modal__trophy" aria-hidden="true">★</div>
      <h1 id="winner-title">{{ reveal.winners.length > 1 ? 'Winner発表！' : '優勝！' }}</h1>
      <p
        v-if="participantWinner"
        class="winner-modal__personal-rank"
      >
        あなたは{{ participantWinner.rank ?? reveal.winners.indexOf(participantWinner) + 1 }}位です！
      </p>
      <ul>
        <li v-for="(winner, index) in reveal.winners" :key="winner.nickname">
          <strong>{{ winner.rank ?? index + 1 }}位 · {{ winner.nickname }}</strong>
          <span>{{ winner.score }} / {{ winner.totalQuestions }} 問正解</span>
        </li>
      </ul>
      <p>おめでとうございます！</p>
      <button v-if="admin" class="button button--secondary" type="button" @click="$emit('close')">発表を終了する</button>
    </section>
  </div>
</template>
