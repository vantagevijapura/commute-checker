import { DESTINATIONS } from './config.js'

const KEY = 'commute-pois'

function fromStorage() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function persist() {
  localStorage.setItem(KEY, JSON.stringify(POIS))
}

// Live mutable array — all importers share the same reference.
// Mutate in-place (push/splice) so consumers always see the latest state.
export const POIS = fromStorage() || DESTINATIONS.map(d => ({ ...d }))

export function addPOI(poi) {
  POIS.push({ ...poi, id: Date.now() })
  persist()
}

export function removePOI(id) {
  const i = POIS.findIndex(p => String(p.id) === String(id))
  if (i !== -1) POIS.splice(i, 1)
  persist()
}

export function resetPOIs() {
  POIS.splice(0, POIS.length, ...DESTINATIONS.map(d => ({ ...d })))
  localStorage.removeItem(KEY)
}
