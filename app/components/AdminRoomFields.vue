<script setup lang="ts">
import { MAX_WINNER_RANK, ROOM_IDENTIFIER_PATTERN_SOURCE } from '#shared/constants/quiz'
import { formatWinnerRankRange } from '#shared/utils/winnerRanking'

defineProps<{
  author: string
  roomId: string
  title: string
  winnerLastRank: number
  authorValid: boolean
  roomIdValid: boolean
  titleValid: boolean
}>()

defineEmits<{
  'update:author': [value: string]
  'update:roomId': [value: string]
  'update:title': [value: string]
  'update:winnerLastRank': [value: number]
}>()
</script>

<template>
  <section class="editor-meta" aria-label="ルーム基本情報">
    <label>
      <span class="field-label-row">
        <span>作成者のニックネーム <b>必須</b></span>
        <em v-if="!authorValid" class="field-required-error">入力してください</em>
      </span>
      <input
        :value="author"
        required
        :pattern="ROOM_IDENTIFIER_PATTERN_SOURCE"
        placeholder="creator-name"
        :aria-invalid="!authorValid"
        @input="$emit('update:author', ($event.target as HTMLInputElement).value.trim())"
      >
      <small v-if="author && !authorValid">英数字と . _ ~ - のみ使用できます</small>
    </label>
    <label>
      <span class="field-label-row">
        <span>ルームID <b>必須</b></span>
        <em v-if="!roomIdValid" class="field-required-error">入力してください</em>
      </span>
      <input
        :value="roomId"
        required
        :pattern="ROOM_IDENTIFIER_PATTERN_SOURCE"
        placeholder="event-room-01"
        :aria-invalid="!roomIdValid"
        @input="$emit('update:roomId', ($event.target as HTMLInputElement).value.trim())"
      >
      <small v-if="roomId && !roomIdValid">英数字と . _ ~ - のみ使用できます</small>
    </label>
    <label>
      <span class="field-label-row">
        <span>ルーム名 <b>必須</b></span>
        <em v-if="!titleValid" class="field-required-error">入力してください</em>
      </span>
      <input
        :value="title"
        required
        placeholder="社内クイズ大会"
        :aria-invalid="!titleValid"
        @input="$emit('update:title', ($event.target as HTMLInputElement).value)"
      >
    </label>
    <label>
      <span class="field-label-row">
        <span>Winnerにする順位 <b>必須</b></span>
      </span>
      <select
        :value="winnerLastRank"
        @change="$emit('update:winnerLastRank', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="rank in MAX_WINNER_RANK" :key="rank" :value="rank">{{ formatWinnerRankRange(rank) }}</option>
      </select>
    </label>
  </section>
</template>
