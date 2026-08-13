<script setup lang="ts">
defineProps<{ open: boolean; resetting?: boolean }>()
defineEmits<{ close: []; confirm: [] }>()
</script>

<template>
  <div v-if="open" class="modal-backdrop session-reset-backdrop" role="presentation" @click.self="$emit('close')">
    <section class="session-reset-modal" role="dialog" aria-modal="true" aria-labelledby="session-reset-title">
      <p class="eyebrow">DELETE SESSION STATE</p>
      <h1 id="session-reset-title">セッションの状態を削除しますか？</h1>
      <p>現在の回答集計を終了し、参加者のニックネームと回答済み状態をリセットします。この操作は元に戻せません。</p>
      <div class="button-row">
        <button class="button button--secondary" type="button" :disabled="resetting" @click="$emit('close')">キャンセル</button>
        <button class="button button--danger" type="button" :disabled="resetting" @click="$emit('confirm')">
          {{ resetting ? '削除中…' : '削除する' }}
        </button>
      </div>
    </section>
  </div>
</template>
