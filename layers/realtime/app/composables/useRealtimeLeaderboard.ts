import { onValue, ref as databaseRef } from 'firebase/database'
import type { Question, RealtimeAnswer } from '#shared/types/quiz'
import { buildLeaderboard } from '#shared/utils/quizScoring'

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

  const winners = computed(() => {
    const topScore = leaderboard.value[0]?.score
    if (topScore === undefined) return []
    return leaderboard.value
      .filter(entry => entry.score === topScore)
      .map(({ nickname, score, totalQuestions }) => ({ nickname, score, totalQuestions }))
  })

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
    connectionError: readonly(connectionError),
  }
}
