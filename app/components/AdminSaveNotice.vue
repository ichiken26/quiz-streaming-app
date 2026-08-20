<script setup lang="ts">
defineProps<{
  message: string
  tone?: 'success' | 'error'
}>()
</script>

<template>
  <p
    v-if="message"
    class="save-toast"
    :class="tone === 'error' ? 'save-toast--error' : 'save-toast--success'"
    :role="tone === 'error' ? 'alert' : 'status'"
  >
    {{ message }}
  </p>
</template>
