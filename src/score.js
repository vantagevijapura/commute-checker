export function calculateScore(results) {
  const validTimes = results.filter(r => r && !r.error).map(r => r.minutes)

  if (validTimes.length === 0) return { score: 0, avg: 0, max: 0, validCount: 0 }

  const avg = Math.round(validTimes.reduce((a, b) => a + b, 0) / validTimes.length)
  const max = Math.max(...validTimes)

  // Linear scale: 15min=10, 65min=1
  let score = 10 - ((avg - 15) / 50) * 9
  score = Math.max(1, Math.min(10, score))

  if (max > 60) score = Math.max(1, score - 0.5)

  return {
    score: Math.round(score * 10) / 10,
    avg,
    max,
    validCount: validTimes.length,
  }
}

export function scoreLabel(score) {
  if (score >= 9) return 'Exceptional transit access'
  if (score >= 7.5) return 'Great transit access'
  if (score >= 6) return 'Good transit access'
  if (score >= 4.5) return 'Decent — some longer commutes'
  if (score >= 3) return 'Limited transit access'
  return 'Poor transit access'
}

export function scoreColor(score) {
  if (score >= 7) return '#00e5a0'
  if (score >= 5) return '#f5c518'
  return '#ff4545'
}

export function timeColor(minutes) {
  if (minutes <= 20) return '#00e5a0'
  if (minutes <= 35) return '#a3e635'
  if (minutes <= 50) return '#f5c518'
  return '#ff4545'
}
