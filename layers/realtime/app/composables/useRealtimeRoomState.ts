import { get, onValue, ref as databaseRef, serverTimestamp, set } from 'firebase/database'
import type {
  RealtimeConnectionStatus,
  RoomRuntimeState,
} from '#shared/types/quiz'

type PublishOptions = {
  useServerQuestionStart?: boolean
}

export function useRealtimeRoomState(roomId: MaybeRefOrGetter<string>) {
  const state = reactive<RoomRuntimeState>({
    sessionId: undefined,
    currentSlideIndex: 0,
    mode: 'slide',
    currentQuestionId: undefined,
    questionOpen: false,
    questionStartedAt: undefined,
    winnerReveal: undefined,
  })
  const connectionStatus = ref<RealtimeConnectionStatus>('idle')
  const connectionError = ref<string>()
  let unsubscribe: (() => void) | undefined

  function runtimePath() {
    return `rooms/${toValue(roomId)}/runtime`
  }

  function applyRemoteState(value: RoomRuntimeState) {
    state.sessionId = value.sessionId
    state.currentSlideIndex = value.currentSlideIndex
    state.mode = value.mode
    state.currentQuestionId = value.currentQuestionId
    state.questionOpen = value.questionOpen
    state.questionStartedAt = value.questionStartedAt
    state.winnerReveal = value.winnerReveal
  }

  function subscribe() {
    if (!import.meta.client) return
    if (!isFirebaseConfigured()) {
      connectionStatus.value = 'unconfigured'
      connectionError.value = 'Firebaseの環境変数が設定されていません'
      return
    }

    connectionStatus.value = 'connecting'
    try {
      const target = databaseRef(useFirebaseDatabase(), runtimePath())
      unsubscribe = onValue(
        target,
        (snapshot) => {
          if (snapshot.exists()) {
            applyRemoteState(snapshot.val() as RoomRuntimeState)
          }
          connectionStatus.value = 'connected'
          connectionError.value = undefined
        },
        (error) => {
          connectionStatus.value = 'error'
          connectionError.value = error.message
        },
      )
    }
    catch (error) {
      connectionStatus.value = 'error'
      connectionError.value = error instanceof Error ? error.message : String(error)
    }
  }

  async function publishState(
    nextState: RoomRuntimeState,
    options: PublishOptions = {},
  ) {
    const payload = {
      sessionId: nextState.sessionId ?? null,
      currentSlideIndex: nextState.currentSlideIndex,
      mode: nextState.mode,
      currentQuestionId: nextState.currentQuestionId ?? null,
      questionOpen: nextState.questionOpen,
      questionStartedAt: options.useServerQuestionStart
        ? serverTimestamp()
        : nextState.questionStartedAt ?? null,
      winnerReveal: nextState.winnerReveal ?? null,
    }
    await set(
      databaseRef(useFirebaseDatabase(), runtimePath()),
      payload,
    )
  }

  async function resetSession(initialState: RoomRuntimeState) {
    const sessionId = crypto.randomUUID()
    const payload = {
      sessionId,
      currentSlideIndex: initialState.currentSlideIndex,
      mode: initialState.mode,
      currentQuestionId: initialState.currentQuestionId ?? null,
      questionOpen: false,
      questionStartedAt: null,
      winnerReveal: null,
    }
    await set(databaseRef(useFirebaseDatabase(), runtimePath()), payload)
  }

  async function initializeState(initialState: RoomRuntimeState) {
    if (!import.meta.client || !isFirebaseConfigured()) return
    const target = databaseRef(useFirebaseDatabase(), runtimePath())
    const snapshot = await get(target)
    if (!snapshot.exists()) await publishState(initialState)
  }

  onMounted(subscribe)
  onScopeDispose(() => unsubscribe?.())

  return {
    state,
    connectionStatus: readonly(connectionStatus),
    connectionError: readonly(connectionError),
    publishState,
    resetSession,
    initializeState,
  }
}
