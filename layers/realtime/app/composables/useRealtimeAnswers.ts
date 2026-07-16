import { onValue, ref as databaseRef } from 'firebase/database'
import type {
  RealtimeAnswer,
  RealtimeConnectionStatus,
} from '#shared/types/quiz'

export function useRealtimeAnswers(
  roomId: MaybeRefOrGetter<string>,
  questionId: MaybeRefOrGetter<string | undefined>,
  sessionId?: MaybeRefOrGetter<string | undefined>,
) {
  const answers = ref<RealtimeAnswer[]>([])
  const connectionStatus = ref<RealtimeConnectionStatus>('idle')
  const connectionError = ref<string>()
  let unsubscribe: (() => void) | undefined

  function answersPath(question: string) {
    return `rooms/${toValue(roomId)}/answers/${question}`
  }

  function subscribe(question: string | undefined) {
    unsubscribe?.()
    unsubscribe = undefined
    answers.value = []
    if (!import.meta.client || !question) {
      connectionStatus.value = 'idle'
      return
    }
    if (!isFirebaseConfigured()) {
      connectionStatus.value = 'unconfigured'
      connectionError.value = 'Firebaseの環境変数が設定されていません'
      return
    }

    connectionStatus.value = 'connecting'
    const target = databaseRef(useFirebaseDatabase(), answersPath(question))
    unsubscribe = onValue(
      target,
      (snapshot) => {
        const value = snapshot.val() as Record<string, RealtimeAnswer> | null
        answers.value = value
          ? Object.values(value).filter(answer => !toValue(sessionId) || answer.sessionId === toValue(sessionId))
          : []
        connectionStatus.value = 'connected'
        connectionError.value = undefined
      },
      (error) => {
        connectionStatus.value = 'error'
        connectionError.value = error.message
      },
    )
  }

  watch([() => toValue(questionId), () => toValue(sessionId)], ([question]) => subscribe(question), { immediate: true })
  onScopeDispose(() => unsubscribe?.())

  return {
    answers: readonly(answers),
    connectionStatus: readonly(connectionStatus),
    connectionError: readonly(connectionError),
  }
}
