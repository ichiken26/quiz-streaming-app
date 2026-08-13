import { computed, onMounted, ref, watch } from 'vue'
import {
  ADMIN_AUTHOR_STORAGE_KEY,
  isValidRoomIdentifier,
} from '#shared/constants/quiz'

export function useAdminAuthor() {
  const author = ref('')
  const valid = computed(() => isValidRoomIdentifier(author.value))
  const createRoomRoute = computed(() => ({
    path: '/admin/edit',
    query: valid.value ? { author: author.value.trim() } : undefined,
  }))

  onMounted(() => {
    author.value = localStorage.getItem(ADMIN_AUTHOR_STORAGE_KEY) ?? ''
  })

  watch(author, (value) => {
    if (!import.meta.client) return
    const normalized = value.trim()
    if (normalized) localStorage.setItem(ADMIN_AUTHOR_STORAGE_KEY, normalized)
    else localStorage.removeItem(ADMIN_AUTHOR_STORAGE_KEY)
  })

  return { author, valid, createRoomRoute }
}
