export function useQuestionTimer(timeLimitSeconds: MaybeRefOrGetter<number>) {
  const remainingSeconds = ref(Math.max(0, toValue(timeLimitSeconds)))
  const isRunning = ref(false)
  const isExpired = computed(() => isRunning.value && remainingSeconds.value <= 0)

  let intervalId: ReturnType<typeof setInterval> | undefined
  let deadline = 0

  function clearTimer() {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = undefined
    }
  }

  function syncIdleRemaining() {
    if (!isRunning.value) {
      remainingSeconds.value = Math.max(0, toValue(timeLimitSeconds))
    }
  }

  function updateRemaining() {
    remainingSeconds.value = Math.max(
      0,
      Math.ceil((deadline - Date.now()) / 1000),
    )

    if (remainingSeconds.value === 0) {
      isRunning.value = false
      clearTimer()
    }
  }

  function start(startedAt = Date.now()) {
    clearTimer()
    const duration = Math.max(0, toValue(timeLimitSeconds))
    remainingSeconds.value = duration

    if (!import.meta.client || duration === 0) {
      isRunning.value = false
      return
    }

    deadline = startedAt + duration * 1000
    isRunning.value = true
    updateRemaining()
    if (remainingSeconds.value === 0) {
      isRunning.value = false
      return
    }
    intervalId = setInterval(updateRemaining, 250)
  }

  function stop() {
    if (deadline) updateRemaining()
    isRunning.value = false
    clearTimer()
    syncIdleRemaining()
  }

  function reset() {
    stop()
    remainingSeconds.value = Math.max(0, toValue(timeLimitSeconds))
  }

  watch(() => toValue(timeLimitSeconds), syncIdleRemaining)

  onScopeDispose(clearTimer)

  return {
    remainingSeconds: readonly(remainingSeconds),
    isExpired,
    isRunning: readonly(isRunning),
    start,
    stop,
    reset,
  }
}
