<script setup lang="ts">
import type { LeaderboardEntry } from '#shared/types/quiz'

defineProps<{ entries: readonly LeaderboardEntry[] }>()
</script>

<template>
  <section class="admin-leaderboard">
    <header>
      <div><p class="eyebrow">LEADERBOARD</p><h2>ニックネーム別成績</h2></div>
      <strong>{{ entries.length }}<span>人</span></strong>
    </header>
    <ol v-if="entries.length">
      <li v-for="(entry, index) in entries" :key="entry.nickname">
        <b>{{ index + 1 }}</b>
        <span>{{ entry.nickname }}</span>
        <strong>{{ entry.score }} / {{ entry.totalQuestions }}</strong>
      </li>
    </ol>
    <p v-else>回答はまだありません</p>
  </section>
</template>
