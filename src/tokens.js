const MAPBOX_LIMIT = 100_000
const HERE_LIMIT = 30_000
const HERE_PER_SEARCH = 8 // one call per destination

function monthKey() {
  const d = new Date()
  return `tokens_${d.getFullYear()}_${d.getMonth()}`
}

function load() {
  return JSON.parse(localStorage.getItem(monthKey()) || '{"mapbox":0,"here":0}')
}

function save(data) {
  localStorage.setItem(monthKey(), JSON.stringify(data))
}

function render() {
  const el = document.getElementById('token-usage')
  if (!el) return
  const { mapbox, here } = load()
  const searches = Math.floor(here / HERE_PER_SEARCH)
  const searchesLeft = Math.floor((HERE_LIMIT - here) / HERE_PER_SEARCH)
  const herePct = Math.min(100, (here / HERE_LIMIT) * 100)
  const mbPct = Math.min(100, (mapbox / MAPBOX_LIMIT) * 100)
  const mbColor = mbPct > 80 ? '#ff4545' : mbPct > 50 ? '#f5c518' : '#5a5a70'
  const hereColor = herePct > 80 ? '#ff4545' : herePct > 50 ? '#f5c518' : '#5a5a70'
  el.innerHTML =
    `<span title="${mapbox.toLocaleString()} geocode calls">MB <b style="color:${mbColor}">${mapbox.toLocaleString()}</b><span class="token-limit">/${(MAPBOX_LIMIT/1000).toFixed(0)}k</span></span>` +
    `<span title="${here} HERE transactions = ${searches} searches">HERE <b style="color:${hereColor}">${searches} searches</b><span class="token-limit"> · ${searchesLeft.toLocaleString()} left</span></span>`
}

export function trackMapbox(n = 1) {
  const d = load()
  d.mapbox += n
  save(d)
  render()
}

export function trackHere(n = 1) {
  const d = load()
  d.here += n
  save(d)
  render()
}

export function initTokenDisplay() {
  render()
}
