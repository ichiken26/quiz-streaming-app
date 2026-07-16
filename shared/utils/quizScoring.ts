import type { LeaderboardEntry, Question, RealtimeAnswer } from '#shared/types/quiz'

export function getCorrectChoiceIds(question: Question): string[] {
  return question.correctChoiceIds?.length
    ? [...question.correctChoiceIds]
    : question.correctChoiceId ? [question.correctChoiceId] : []
}

export function isAnswerCorrect(question: Question, answer: RealtimeAnswer) {
  const correct = new Set(getCorrectChoiceIds(question))
  const selected = new Set(answer.choiceIds?.length ? answer.choiceIds : [answer.choiceId])
  return correct.size === selected.size && [...correct].every(id => selected.has(id))
}

export function buildLeaderboard(
  answersByQuestion: Record<string, Record<string, RealtimeAnswer>>,
  questions: Question[],
  sessionId?: string,
): LeaderboardEntry[] {
  const entries = new Map<string, { score: number; answered: Set<string> }>()
  const questionMap = new Map(questions.map(question => [question.id, question]))

  for (const [questionId, participantAnswers] of Object.entries(answersByQuestion)) {
    const question = questionMap.get(questionId)
    if (!question) continue
    for (const answer of Object.values(participantAnswers ?? {})) {
      if (sessionId && answer.sessionId !== sessionId) continue
      const nickname = answer.nickname?.trim()
      if (!nickname) continue
      const entry = entries.get(nickname) ?? { score: 0, answered: new Set<string>() }
      if (entry.answered.has(questionId)) continue
      entry.answered.add(questionId)
      if (isAnswerCorrect(question, answer)) entry.score += 1
      entries.set(nickname, entry)
    }
  }

  return [...entries.entries()]
    .map(([nickname, entry]) => ({
      nickname,
      score: entry.score,
      answeredQuestions: entry.answered.size,
      totalQuestions: questions.length,
    }))
    .sort((a, b) => (
      b.score - a.score
      || b.answeredQuestions - a.answeredQuestions
      || a.nickname.localeCompare(b.nickname, 'ja')
    ))
}
