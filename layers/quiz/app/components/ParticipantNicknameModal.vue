<script setup lang="ts">
const props = defineProps<{
  open: boolean
  roomTitle?: string
  currentNickname?: string
}>()

const emit = defineEmits<{ save: [nickname: string] }>()
const value = ref('')
const normalized = computed(() => value.value.trim().replace(/\s+/g, ' ').slice(0, 30))

watch(() => props.open, (open) => {
  if (open) value.value = props.currentNickname ?? ''
}, { immediate: true })

function submit() {
  if (normalized.value) emit('save', normalized.value)
}
</script>

<template>
  <div v-if="open" class="modal-backdrop nickname-backdrop">
    <form class="nickname-modal" role="dialog" aria-modal="true" aria-labelledby="nickname-title" @submit.prevent="submit">
      <p class="eyebrow">PARTICIPANT</p>
      <h1 id="nickname-title">ニックネームを入力</h1>
      <p v-if="roomTitle">{{ roomTitle }}に表示する名前です。</p>
      <label for="participant-nickname">ニックネーム</label>
      <input
        id="participant-nickname"
        v-model="value"
        maxlength="30"
        autocomplete="nickname"
        autofocus
        placeholder="例: クイズ太郎"
        required
      >
      <small>{{ normalized.length }} / 30文字</small>
      <button class="button button--primary" type="submit" :disabled="!normalized">この名前で参加する</button>
    </form>
  </div>
</template>
