type StoredIdentity = { nickname: string; sessionId?: string }

export function useParticipantIdentity(
  roomId: MaybeRefOrGetter<string>,
  sessionId: MaybeRefOrGetter<string | undefined>,
) {
  const nickname = ref('')
  const loaded = ref(false)

  const nicknameKey = computed(() => `quiz-nickname:${toValue(roomId)}`)

  function load() {
    if (!import.meta.client) return
    const stored = localStorage.getItem(nicknameKey.value)
    nickname.value = ''
    if (stored) {
      try {
        const identity = JSON.parse(stored) as StoredIdentity
        if (!toValue(sessionId) || identity.sessionId === toValue(sessionId)) {
          nickname.value = identity.nickname?.trim() ?? ''
        }
      }
      catch {
        // Legacy values belong to the session before reset support.
        if (!toValue(sessionId)) nickname.value = stored.trim()
      }
    }
    loaded.value = true
  }

  function save(value: string) {
    const normalized = value.trim().replace(/\s+/g, ' ').slice(0, 30)
    if (!normalized) return false
    localStorage.setItem(nicknameKey.value, JSON.stringify({
      nickname: normalized,
      sessionId: toValue(sessionId),
    } satisfies StoredIdentity))
    nickname.value = normalized
    return true
  }

  function clear() {
    localStorage.removeItem(nicknameKey.value)
    localStorage.removeItem(`quiz-participant:${toValue(roomId)}`)
    const answerPrefix = `quiz-answer:${toValue(roomId)}:`
    for (let index = localStorage.length - 1; index >= 0; index--) {
      const key = localStorage.key(index)
      if (key?.startsWith(answerPrefix)) localStorage.removeItem(key)
    }
    nickname.value = ''
  }

  onMounted(load)
  watch(nicknameKey, load)
  watch(() => toValue(sessionId), (next, previous) => {
    if (!loaded.value || !next || next === previous) return
    clear()
    load()
  })

  return {
    nickname: readonly(nickname),
    loaded: readonly(loaded),
    hasNickname: computed(() => Boolean(nickname.value)),
    save,
    clear,
  }
}
