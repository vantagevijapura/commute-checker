const KEY = 'commute-saved-addresses'
const MAX = 10

export function getSaved() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

export function saveAddress(entry) {
  const saved = getSaved()
  if (saved.length >= MAX) throw new Error('Max 10 saved — remove one to add more.')
  saved.unshift({ ...entry, id: crypto.randomUUID(), savedAt: new Date().toISOString() })
  localStorage.setItem(KEY, JSON.stringify(saved))
  return saved
}

export function removeAddress(id) {
  const saved = getSaved().filter(e => e.id !== id)
  localStorage.setItem(KEY, JSON.stringify(saved))
  return saved
}

export function exportCSV(saved) {
  const destNames = saved[0]?.results.map(r => r.name) || []
  const header = ['Address', 'Score', 'Avg (min)', 'Worst (min)', 'Saved At', ...destNames]

  const rows = saved.map(entry => [
    `"${entry.address}"`,
    entry.score,
    entry.avg,
    entry.max,
    new Date(entry.savedAt).toLocaleDateString(),
    ...entry.results.map(r => r.error ? 'N/A' : r.minutes),
  ])

  const csv = [header, ...rows].map(r => r.join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `commute-checker-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
