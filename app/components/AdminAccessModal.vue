<script setup lang="ts">
const props = defineProps<{ open: boolean }>()
let redirectTimer: ReturnType<typeof setTimeout> | undefined

watch(() => props.open, (open) => {
  clearTimeout(redirectTimer)
  if (open) redirectTimer = setTimeout(() => navigateTo('/'), 3000)
}, { immediate: true })

onBeforeUnmount(() => clearTimeout(redirectTimer))

function returnHome() {
  navigateTo('/')
}
</script>

<template>
  <div v-if="open" class="modal-backdrop" role="presentation">
    <section class="access-modal" role="alertdialog" aria-modal="true" aria-labelledby="access-title">
      <p class="eyebrow">403 FORBIDDEN</p>
      <h1 id="access-title">アクセス権限がありません</h1>
      <p>この管理画面を利用できるGoogleアカウントでログインしてください。</p>
      <button class="button button--primary" type="button" @click="returnHome">ルートに戻る</button>
    </section>
  </div>
</template>
