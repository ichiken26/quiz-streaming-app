<script setup lang="ts">
import { participantRoomPath } from '#shared/utils/roomRoutes'

const route = useRoute()
const author = computed(() => String(route.params.author ?? '-'))
const roomId = computed(() => String(route.params.roomId ?? '-'))
</script>

<template>
  <div class="room-shell room-shell--participant">
    <header class="global-header">
      <NuxtLink class="global-header__brand" :to="participantRoomPath(author, roomId)">
        QUIZ STREAM
      </NuxtLink>
      <div class="global-header__room">
        <span>ROOM ID</span>
        <strong>{{ roomId }}</strong>
      </div>
    </header>
    <slot />
  </div>
</template>
