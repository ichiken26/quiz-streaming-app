<script setup lang="ts">
import type { Slide } from '#shared/types/quiz'

const props = defineProps<{
  slide?: Slide
}>()

const imageFailed = ref(false)

watch(
  () => props.slide?.imageUrl,
  () => {
    imageFailed.value = false
  },
)
</script>

<template>
  <figure class="slide-viewer">
    <img
      v-if="slide && !imageFailed"
      class="slide-viewer__image"
      :src="slide.imageUrl"
      :alt="slide.title"
      @error="imageFailed = true"
    >
    <div v-else class="slide-viewer__fallback" role="img" :aria-label="slide?.title">
      <span class="slide-viewer__fallback-label">SLIDE</span>
      <strong>{{ slide?.title ?? 'スライドがありません' }}</strong>
      <small v-if="slide">画像を読み込めませんでした</small>
    </div>
  </figure>
</template>
