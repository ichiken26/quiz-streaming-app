<script setup lang="ts">
import type { RealtimeConnectionStatus, RoomRuntimeState } from '#shared/types/quiz'

defineProps<{
  state: RoomRuntimeState
  total: number
  slideId?: string
  connectionStatus: RealtimeConnectionStatus
}>()
</script>

<template>
  <div class="playback-status" aria-live="polite">
    <div>
      <span>SLIDE</span>
      <strong>{{ total ? state.currentSlideIndex + 1 : 0 }} / {{ total }}</strong>
    </div>
    <div>
      <span>ID</span>
      <strong>{{ slideId ?? '-' }}</strong>
    </div>
    <div>
      <span>MODE</span>
      <strong>{{ state.mode }}</strong>
    </div>
    <div class="sync-indicator" :class="`sync-indicator--${connectionStatus}`">
      <span>SYNC</span>
      <strong>{{ connectionStatus === 'connected' ? '接続中' : connectionStatus }}</strong>
    </div>
  </div>
</template>
