<script setup lang="ts">
import type { RealtimeConnectionStatus } from '#shared/types/quiz'

defineProps<{
  status: RealtimeConnectionStatus
  error?: string
}>()
</script>

<template>
  <p
    v-if="status === 'unconfigured' || status === 'error'"
    class="notice notice--danger realtime-notice"
    role="alert"
  >
    <strong>リアルタイム同期に接続できません</strong>
    <span>{{ error }}</span>
  </p>
</template>
