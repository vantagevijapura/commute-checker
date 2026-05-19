import { HOWLOUD_KEY } from './config.js'

export async function fetchSoundscore(lat, lng) {
  const res = await fetch(
    `https://api.howloud.com/v2/score?lat=${lat}&lng=${lng}&x-api-key=${HOWLOUD_KEY}`
  )
  if (!res.ok) throw new Error('Soundscore fetch failed')
  const data = await res.json()
  const r = (data.result ?? [])[0] ?? data
  return {
    score:    r.score        ?? null,
    label:    r.scoretext    ?? null,
    traffic:  r.traffictext  ?? null,
    airports: r.airportstext ?? null,
    local:    r.localtext    ?? null,
  }
}

export function soundscoreColor(score) {
  if (score == null) return '#888'
  if (score >= 90) return '#3b82f6'  // calm  — blue
  if (score >= 75) return '#00b870'  // active — green
  if (score >= 60) return '#f5c518'  // busy  — yellow
  return '#ff4545'                   // loud  — red
}
