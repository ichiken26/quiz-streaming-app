<script setup lang="ts">
defineProps<{
  remainingSeconds: number
  visible?: boolean
}>()
</script>

<template>
  <div
    v-if="visible !== false"
    class="timer"
    :class="{
      'timer--urgent': remainingSeconds > 0 && remainingSeconds <= 5,
      'timer--ended': remainingSeconds <= 0,
    }"
    aria-live="polite"
  >
    <span>残り</span>
    <strong>{{ remainingSeconds }}</strong>
    <span>秒</span>
  </div>
</template>
