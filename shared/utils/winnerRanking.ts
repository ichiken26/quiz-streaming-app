export function formatWinnerRankRange(lastRank: number) {
  return lastRank === 1 ? '1位のみ' : `1位から${lastRank}位まで`
}
