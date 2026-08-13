<script setup lang="ts">
defineProps<{
  participantUrl: string
  participantQr: string
  controlUrl: string
  controlQr: string
}>()

defineEmits<{
  copy: [url: string]
  download: [dataUrl: string, kind: 'participant' | 'admin']
}>()
</script>

<template>
  <section class="share-panel">
    <header><p class="eyebrow">SHARE</p><h2>発行済みURL</h2></header>
    <div class="share-grid">
      <article>
        <h3>参加者用</h3><img :src="participantQr" alt="参加者用URLのQRコード">
        <code>{{ participantUrl }}</code>
        <div>
          <button class="button button--secondary" @click="$emit('copy', participantUrl)">URLをコピー</button>
          <button class="button button--primary" @click="$emit('download', participantQr, 'participant')">QRを保存</button>
        </div>
      </article>
      <article>
        <h3>管理者用配信画面</h3><img :src="controlQr" alt="管理者用URLのQRコード">
        <code>{{ controlUrl }}</code>
        <div>
          <button class="button button--secondary" @click="$emit('copy', controlUrl)">URLをコピー</button>
          <button class="button button--primary" @click="$emit('download', controlQr, 'admin')">QRを保存</button>
        </div>
      </article>
    </div>
  </section>
</template>
