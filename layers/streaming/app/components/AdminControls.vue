<script setup lang="ts">
import type { RoomRuntimeState } from '#shared/types/quiz'

defineProps<{
  state: RoomRuntimeState
  total: number
  hasQuestion: boolean
  isFinalSlide: boolean
  hasWinners: boolean
  remainingSeconds: number
  canJumpToLast: boolean
  resetting?: boolean
  disabled?: boolean
}>()

defineEmits<{
  previous: []
  next: []
  first: []
  last: []
  openQuestion: []
  closeQuestion: []
  showAnswer: []
  showResults: []
  revealWinner: []
  closeWinner: []
  resetSession: []
}>()
</script>

<template>
  <section class="admin-controls" aria-label="管理者操作">
    <div class="runtime-status">
      <div><span>MODE</span><strong>{{ state.mode }}</strong></div>
      <div>
        <span>回答受付</span>
        <strong :class="state.questionOpen ? 'text-open' : 'text-closed'">
          {{ state.questionOpen ? '受付中' : '停止中' }}
        </strong>
      </div>
      <div><span>QUESTION</span><strong>{{ state.currentQuestionId ?? '-' }}</strong></div>
    </div>

    <QuestionCountdown
      class="admin-countdown"
      :visible="state.questionOpen"
      :remaining-seconds="remainingSeconds"
    />

    <div class="control-group">
      <p>スライド</p>
      <div class="button-row slide-navigation">
        <button class="button button--slide-first" type="button" :disabled="disabled || state.currentSlideIndex === 0" @click="$emit('first')">最初へ</button>
        <button
          class="button button--slide-last"
          type="button"
          :disabled="disabled || !canJumpToLast || state.currentSlideIndex >= total - 1"
          :title="!canJumpToLast ? '最終スライドを一度表示すると使用できます' : undefined"
          @click="$emit('last')"
        >最後へ</button>
        <button class="button button--slide-previous" type="button" :disabled="disabled || state.currentSlideIndex === 0" @click="$emit('previous')">←前へ</button>
        <button class="button button--slide-next" type="button" :disabled="disabled || state.currentSlideIndex >= total - 1" @click="$emit('next')">→次へ</button>
      </div>
    </div>

    <div class="control-group">
      <p>進行</p>
      <div class="button-row">
        <button class="button button--primary" type="button" :disabled="disabled || !hasQuestion" @click="$emit('openQuestion')">回答受付開始</button>
        <button class="button button--warning" type="button" :disabled="disabled || state.mode !== 'question'" @click="$emit('closeQuestion')">回答締切</button>
        <button class="button button--secondary" type="button" :disabled="disabled || !hasQuestion" @click="$emit('showAnswer')">正解表示</button>
        <button class="button button--secondary" type="button" :disabled="disabled || !hasQuestion" @click="$emit('showResults')">集計表示</button>
      </div>
    </div>

    <div v-if="isFinalSlide" class="control-group winner-control">
      <p>優勝者発表</p>
      <button
        v-if="!state.winnerReveal?.open"
        class="button button--go"
        type="button"
        :disabled="disabled || !hasWinners"
        @click="$emit('revealWinner')"
      >GO</button>
      <button v-else class="button button--warning" type="button" :disabled="disabled" @click="$emit('closeWinner')">
        発表を終了
      </button>
    </div>

    <div class="control-group session-reset-control">
      <p>ルームセッション</p>
      <button
        class="button button--danger"
        type="button"
        :disabled="disabled || resetting"
        @click="$emit('resetSession')"
      >{{ resetting ? 'リセット中…' : '回答状況・参加者セッションをリセット' }}</button>
    </div>
  </section>
</template>
