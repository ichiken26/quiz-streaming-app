<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { formatAudioDuration } from '#shared/utils/questionAudio'

const props = defineProps<{
  audioUrl?: string
  questionId?: string
  slideKey?: string
}>()

const audioRef = ref<HTMLAudioElement>()
const playing = ref(false)
const currentTime = ref(0)
const duration = ref(0)

const progress = computed(() => duration.value > 0
  ? Math.min(100, (currentTime.value / duration.value) * 100)
  : 0)

const timeLabel = computed(() => `${formatAudioDuration(currentTime.value)} / ${formatAudioDuration(duration.value)}`)

function stopPlayback(reset = true) {
  const audio = audioRef.value
  if (!audio) return
  audio.pause()
  if (reset) audio.currentTime = 0
  playing.value = false
  currentTime.value = reset ? 0 : audio.currentTime
}

function syncTime() {
  const audio = audioRef.value
  if (!audio) return
  currentTime.value = audio.currentTime
  duration.value = Number.isFinite(audio.duration) ? audio.duration : 0
}

async function togglePlay() {
  const audio = audioRef.value
  if (!audio) return
  if (audio.paused) {
    await audio.play()
    playing.value = true
  }
  else {
    audio.pause()
    playing.value = false
  }
}

function seek(event: Event) {
  const audio = audioRef.value
  if (!audio || !duration.value) return
  const value = Number((event.target as HTMLInputElement).value)
  audio.currentTime = (value / 100) * duration.value
  currentTime.value = audio.currentTime
}

watch(
  () => [props.audioUrl, props.questionId, props.slideKey] as const,
  () => stopPlayback(true),
)

onBeforeUnmount(() => stopPlayback(true))
</script>

<template>
  <section v-if="audioUrl" class="admin-audio-player" aria-label="問題音声">
    <p class="eyebrow">AUDIO</p>
    <audio
      ref="audioRef"
      :key="audioUrl"
      :src="audioUrl"
      preload="metadata"
      @loadedmetadata="syncTime"
      @timeupdate="syncTime"
      @ended="stopPlayback(true)"
      @pause="playing = false"
      @play="playing = true"
    />
    <div class="admin-audio-player__controls">
      <button class="button button--secondary" type="button" @click="togglePlay">
        {{ playing ? '⏸ 一時停止' : '▶ 再生' }}
      </button>
      <button class="button button--secondary" type="button" @click="stopPlayback(true)">
        ■ 停止
      </button>
    </div>
    <label class="admin-audio-player__seek">
      <span class="visually-hidden">再生位置</span>
      <input
        type="range"
        min="0"
        max="100"
        step="0.1"
        :value="progress"
        @input="seek"
      >
    </label>
    <p class="admin-audio-player__time">{{ timeLabel }}</p>
  </section>
</template>
