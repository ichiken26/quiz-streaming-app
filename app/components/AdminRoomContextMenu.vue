<script setup lang="ts">
import type { Slide } from '#shared/types/quiz'

defineProps<{
  x: number
  y: number
  slide?: Slide
  slideId: string
}>()

defineEmits<{
  add: [kind: 'image' | 'quiz']
  transform: [slide: Slide]
  remove: []
}>()
</script>

<template>
  <menu class="context-menu" :style="{ left: `${x}px`, top: `${y}px` }" @click.stop>
    <button type="button" @click="$emit('add', 'image')">画像/PDFを追加</button>
    <button type="button" @click="$emit('add', 'quiz')">クイズを追加</button>
    <button v-if="slide" type="button" @click="$emit('transform', slide)">
      {{ slide.type === 'question' ? '画像コンポーネントに変換' : 'クイズコンポーネントに変換' }}
    </button>
    <button v-if="slideId" class="danger" type="button" @click="$emit('remove')">このコンテンツを削除</button>
  </menu>
</template>
