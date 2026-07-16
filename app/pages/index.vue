<script setup lang="ts">
const roomId = ref('')
const menuOpen = ref(false)
const validRoomId = computed(() => /^[A-Za-z0-9._~-]+$/.test(roomId.value.trim()))

function enterRoom() {
  if (!validRoomId.value) return
  navigateTo(`/room/${encodeURIComponent(roomId.value.trim())}`)
}

useHead({ title: 'Quiz Stream' })
</script>

<template>
  <div class="landing-page">
    <header class="landing-header">
      <NuxtLink to="/" class="global-header__brand">QUIZ STREAM</NuxtLink>
      <div class="menu-wrap">
        <button
          class="menu-button"
          type="button"
          aria-label="メニューを開く"
          :aria-expanded="menuOpen"
          @click="menuOpen = !menuOpen"
        >
          <span /><span /><span />
        </button>
        <nav v-if="menuOpen" class="menu-popover" aria-label="管理メニュー">
          <NuxtLink to="/admin">既存ルームを管理する</NuxtLink>
          <NuxtLink to="/admin/edit">ルームを作る</NuxtLink>
        </nav>
      </div>
    </header>

    <main class="landing-main">
      <section class="join-panel">
        <p class="eyebrow">JOIN LIVE QUIZ</p>
        <h1>ルームに参加する</h1>
        <p>案内されたルームIDを入力してください。</p>
        <form @submit.prevent="enterRoom">
          <label for="room-id">ルームID</label>
          <div class="join-form-row">
            <input
              id="room-id"
              v-model="roomId"
              type="text"
              inputmode="text"
              autocomplete="off"
              placeholder="例: 2026_GD_welcomeParty"
              pattern="[A-Za-z0-9._~-]+"
              required
            >
            <button class="button button--primary" type="submit" :disabled="!validRoomId">
              参加する
            </button>
          </div>
          <small v-if="roomId && !validRoomId">英数字と . _ ~ - のみ使用できます</small>
        </form>
      </section>
    </main>
  </div>
</template>
