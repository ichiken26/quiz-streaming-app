<script setup lang="ts">
const route = useRoute()
const roomId = computed(() => String(route.params.roomId ?? '-'))
</script>

<template>
  <div class="room-shell room-shell--admin">
    <header class="global-header global-header--admin">
      <NuxtLink class="global-header__brand" to="/admin">
        QUIZ CONTROL
        <span>ADMIN</span>
      </NuxtLink>
      <div class="global-header__room">
        <span>ROOM ID</span>
        <strong>{{ roomId }}</strong>
      </div>
    </header>
    <slot />
  </div>
</template>
