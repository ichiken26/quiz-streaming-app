<script setup lang="ts">
import type { AdminRoomSummary } from '#shared/types/quiz'

definePageMeta({ layout: 'admin' })
const { session, status } = useAdminSession()
const rooms = ref<AdminRoomSummary[]>([])
const loadError = ref('')

watch(status, async (value) => {
  if (value !== 'authorized') return
  try {
    const result = await $fetch<{ rooms: AdminRoomSummary[] }>('/api/admin/rooms')
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
    <template v-else-if="status === 'authorized'">
      <header class="admin-hub__header">
        <div>
          <p class="eyebrow">ROOM MANAGEMENT</p>
          <h1>既存ルームを管理する</h1>
          <p>{{ session?.email }}<span v-if="session?.systemAdmin"> · システム管理者</span></p>
        </div>
        <NuxtLink class="button button--primary" to="/admin/edit">ルームを作る</NuxtLink>
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
            <NuxtLink class="button button--secondary" :to="`/admin/room/${room.roomId}`">配信</NuxtLink>
            <NuxtLink class="button button--primary" :to="`/admin/edit?q=${encodeURIComponent(room.roomId)}`">編集</NuxtLink>
          </div>
        </article>
      </section>
      <section v-else class="empty-state">
        <strong>管理しているルームはまだありません</strong>
        <p>最初のルームを作成して、参加URLを発行しましょう。</p>
        <NuxtLink class="button button--primary" to="/admin/edit">ルームを作る</NuxtLink>
      </section>
    </template>
  </main>
</template>
