<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const closeButton = ref<HTMLButtonElement>()

watch(() => props.open, async (open) => {
  if (!open) return
  await nextTick()
  closeButton.value?.focus()
})

function close() {
  emit('close')
}
</script>

<template>
  <div
    v-if="open"
    class="modal-backdrop question-close-backdrop"
    role="presentation"
    @click.self="close"
  >
    <section
      class="question-close-modal"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="question-close-title"
      aria-describedby="question-close-description"
      @keydown.esc="close"
    >
      <p class="eyebrow">SLIDE LOCKED</p>
      <h1 id="question-close-title">回答を締め切ってください</h1>
      <p id="question-close-description">
        クイズの回答を開始後、締め切ってから次のスライドに進んでください
      </p>
      <button
        ref="closeButton"
        class="button button--warning"
        type="button"
        @click="close"
      >閉じる</button>
    </section>
  </div>
</template>
