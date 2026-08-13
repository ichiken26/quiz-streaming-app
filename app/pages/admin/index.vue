<script setup lang="ts">
import type { AdminRoomSummary } from '#shared/types/quiz'
import { adminRoomApiPath, adminRoomPath } from '#shared/utils/roomRoutes'
import { ROOM_IDENTIFIER_PATTERN_SOURCE } from '#shared/constants/quiz'

definePageMeta({ layout: 'admin' })
const { session, status, verify } = useAdminSession()
const { author, valid: authorValid, createRoomRoute } = useAdminAuthor()
const rooms = ref<AdminRoomSummary[]>([])
const loadError = ref('')

watch(status, async (value) => {
  if (value !== 'authorized') return
  try {
    const result = await $fetch<{ rooms: AdminRoomSummary[] }>(adminRoomApiPath())
    rooms.value = result.rooms
  }
  catch {
    loadError.value = 'ルーム一覧を読み込めませんでした'
  }
})

useHead({ title: 'ルーム管理 | Quiz Stream' })
</script>

<template>
  <main class="admin-hub">
    <AdminAccessModal :open="status === 'forbidden'" />
    <div v-if="status === 'pending' || status === 'idle'" class="page-message">
      <span class="loader" />認証情報を確認しています
    </div>
    <div v-else-if="status === 'error'" class="page-message page-message--error" role="alert">
      <strong>管理APIに接続できませんでした</strong>
      <span>ローカルWorkerの起動状態を確認して、もう一度お試しください。</span>
      <button class="button button--secondary" type="button" @click="verify">再試行</button>
    </div>
    <template v-else-if="status === 'authorized'">
      <header class="admin-hub__header">
        <div>
          <p class="eyebrow">ROOM MANAGEMENT</p>
          <h1>既存ルームを管理する</h1>
          <div class="admin-identity-row">
            <p class="admin-session-email">{{ session?.email }}<span v-if="session?.systemAdmin"> · システム管理者</span></p>
            <label class="admin-author-field">
              <span>AUTHOR</span>
              <input
                v-model="author"
                type="text"
                autocomplete="off"
                :pattern="ROOM_IDENTIFIER_PATTERN_SOURCE"
                placeholder="例: kokage"
              >
            </label>
          </div>
          <small v-if="author && !authorValid" class="admin-author-error">英数字と . _ ~ - のみ使用できます</small>
        </div>
        <NuxtLink class="button button--primary" :to="createRoomRoute">ルームを作る</NuxtLink>
      </header>
      <p v-if="loadError" class="notice notice--danger">{{ loadError }}</p>
      <section v-else-if="rooms.length" class="room-list" aria-label="管理ルーム一覧">
        <article v-for="room in rooms" :key="room.roomId" class="room-list__item">
          <div>
            <p class="eyebrow">{{ room.roomId }}</p>
            <h2>{{ room.title }}</h2>
            <small>更新: {{ new Date(room.updatedAt).toLocaleString('ja-JP') }}</small>
          </div>
          <div class="room-list__actions">
            <NuxtLink class="button button--secondary" :to="adminRoomPath(room.author, room.roomId)">配信</NuxtLink>
            <NuxtLink class="button button--primary" :to="`/admin/edit?q=${encodeURIComponent(room.roomId)}`">編集</NuxtLink>
          </div>
        </article>
      </section>
      <section v-else class="empty-state">
        <strong>管理しているルームはまだありません</strong>
        <p>最初のルームを作成して、参加URLを発行しましょう。</p>
        <NuxtLink class="button button--primary" :to="createRoomRoute">ルームを作る</NuxtLink>
      </section>
    </template>
  </main>
</template>
