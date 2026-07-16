<script setup lang="ts">
import type { WinnerReveal } from '#shared/types/quiz'

defineProps<{ reveal?: WinnerReveal; admin?: boolean }>()
defineEmits<{ close: [] }>()
</script>

<template>
  <div v-if="reveal?.open" class="modal-backdrop winner-backdrop" role="presentation">
    <section class="winner-modal" role="dialog" aria-modal="true" aria-labelledby="winner-title">
      <p class="winner-modal__label">QUIZ CHAMPION</p>
      <div class="winner-modal__trophy" aria-hidden="true">★</div>
      <h1 id="winner-title">{{ reveal.winners.length > 1 ? '同率優勝！' : '優勝！' }}</h1>
      <ul>
        <li v-for="winner in reveal.winners" :key="winner.nickname">
          <strong>{{ winner.nickname }}</strong>
          <span>{{ winner.score }} / {{ winner.totalQuestions }} 問正解</span>
        </li>
      </ul>
      <p>おめでとうございます！</p>
      <button v-if="admin" class="button button--secondary" type="button" @click="$emit('close')">発表を終了する</button>
    </section>
  </div>
</template>
