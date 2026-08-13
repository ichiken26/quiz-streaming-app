import { onValue, ref as databaseRef } from 'firebase/database'
import type { Question, RealtimeAnswer } from '#shared/types/quiz'
import { buildLeaderboard, selectWinnersThroughRank } from '#shared/utils/quizScoring'

export function useRealtimeLeaderboard(
  roomId: MaybeRefOrGetter<string>,
  questions: MaybeRefOrGetter<Question[]>,
  sessionId: MaybeRefOrGetter<string | undefined>,
) {
  const rawAnswers = ref<Record<string, Record<string, RealtimeAnswer>>>({})
  const connectionError = ref<string>()
  let unsubscribers: Array<() => void> = []

  const leaderboard = computed(() => buildLeaderboard(
    rawAnswers.value,
    toValue(questions),
    toValue(sessionId),
  ))

  const winners = computed(() => selectWinnersThroughRank(leaderboard.value, 1))

  function winnersThroughRank(lastRank: number) {
    return selectWinnersThroughRank(leaderboard.value, lastRank)
  }

  function unsubscribeAll() {
    unsubscribers.forEach(unsubscribe => unsubscribe())
    unsubscribers = []
  }

  function subscribe() {
    unsubscribeAll()
    rawAnswers.value = {}
    connectionError.value = undefined
    if (!import.meta.client || !isFirebaseConfigured()) return

    for (const question of toValue(questions)) {
      const target = databaseRef(
        useFirebaseDatabase(),
        `rooms/${toValue(roomId)}/answers/${question.id}`,
      )
      unsubscribers.push(onValue(target, (snapshot) => {
        rawAnswers.value = {
          ...rawAnswers.value,
          [question.id]: snapshot.val() ?? {},
        }
      }, (error) => {
        connectionError.value = error.message
      }))
    }
  }

  onMounted(subscribe)
  watch(
    [() => toValue(roomId), () => toValue(questions).map(question => question.id).join('|')],
    subscribe,
  )
  onScopeDispose(unsubscribeAll)

  return {
    leaderboard: readonly(leaderboard),
    winners: readonly(winners),
    winnersThroughRank,
    connectionError: readonly(connectionError),
  }
}
