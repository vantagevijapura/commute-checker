import { scoreColor, scoreLabel, timeColor } from './score.js'
import { DESTINATIONS } from './config.js'
import { drawRoute, fitRouteBounds, openMarkerPopup } from './map.js'
import { subwayBullet } from './lines.js'

export function showSkeletons() {
  const list = document.getElementById('dest-list')
  list.innerHTML = DESTINATIONS.map((_, i) => `
    <div class="dest-card skeleton-card" style="animation-delay:${i * 50}ms">
      <div class="skeleton" style="width:55%;height:13px;margin-bottom:10px"></div>
      <div style="display:flex;justify-content:space-between">
        <div class="skeleton" style="width:30%;height:10px"></div>
        <div class="skeleton" style="width:20%;height:20px"></div>
      </div>
      <div class="skeleton" style="width:100%;height:3px;margin-top:10px"></div>
    </div>
  `).join('')
}

export function showEmptyState() {
  document.getElementById('dest-list').innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🗺️</div>
      <div class="empty-title">Check any NYC address</div>
      <div class="empty-sub">Real transit times to 8 destinations<br>simulated at 9:30 AM weekday</div>
    </div>
  `
  setScore(null)
}

let activeCard = null

export function renderResults(results, destCoords) {
  const list = document.getElementById('dest-list')
  list.innerHTML = ''
  activeCard = null

  const maxTime = Math.max(
    ...results.filter(r => r && !r.error).map(r => r.minutes),
    1
  )

  results.forEach((result, i) => {
    const dest = DESTINATIONS[i]
    const card = document.createElement('div')
    card.className = 'dest-card'
    card.style.setProperty('--accent-color', dest.color)
    card.style.animationDelay = `${i * 55}ms`

    if (result && !result.error) {
      const tc = timeColor(result.minutes)
      const pct = Math.round((result.minutes / maxTime) * 100)
      const totalStops = result.lines?.reduce((s, l) => s + l.stops, 0) ?? 0
      const bulletsHtml = result.lines?.length
        ? result.lines.map(l => subwayBullet(l.name)).join('')
        : ''
      const walkHtml = result.walkMinutes > 0
        ? `<span class="card-walk">🚶 ${result.walkMinutes}m</span>`
        : ''

      card.innerHTML = `
        <div class="card-header">
          <div class="card-title">${dest.name}</div>
          <div class="card-time" style="color:${tc}">${result.minutes}<span class="card-unit"> min</span></div>
        </div>
        <div class="card-meta">
          <span class="card-bullets">${bulletsHtml}</span>
          <span>${result.transfers} xfer${result.transfers !== 1 ? 's' : ''}</span>
          ${totalStops ? `<span>${totalStops} stop${totalStops !== 1 ? 's' : ''}</span>` : ''}
          ${walkHtml}
        </div>
        <div class="progress-track">
          <div class="progress-bar" style="width:${pct}%;background:${tc}"></div>
        </div>
      `
    } else {
      card.innerHTML = `
        <div class="card-header">
          <div class="card-title">${dest.name}</div>
          <div class="card-time" style="color:#444">N/A</div>
        </div>
        <div class="card-meta"><span style="color:#555">Route unavailable</span></div>
        <div class="progress-track"><div class="progress-bar" style="width:0%"></div></div>
      `
    }

    card.addEventListener('click', () => {
      // Deactivate previous
      if (activeCard) activeCard.classList.remove('card-active')
      card.classList.add('card-active')
      activeCard = card

      if (result && !result.error && result.routeSections?.length) {
        drawRoute(result.routeSections)
        fitRouteBounds(result.routeSections)
        setTimeout(() => openMarkerPopup(i), 950)
      }
    })

    list.appendChild(card)
  })
}

export function setScore(scoreData) {
  const numEl = document.getElementById('score-num')
  const fillEl = document.getElementById('score-fill')
  const descEl = document.getElementById('score-desc')

  if (!scoreData || scoreData.score === 0) {
    numEl.textContent = '—'
    numEl.style.color = '#444'
    fillEl.style.width = '0%'
    fillEl.style.background = '#444'
    descEl.textContent = 'Enter an address to calculate'
    return
  }

  const { score, avg, max, validCount } = scoreData
  const color = scoreColor(score)

  numEl.textContent = score.toFixed(1)
  numEl.style.color = color
  fillEl.style.width = `${score * 10}%`
  fillEl.style.background = color
  descEl.textContent = `${scoreLabel(score)} · avg ${avg} min · worst ${max} min · ${validCount}/8 routes`
}

export function showError(message) {
  const el = document.getElementById('error-banner')
  el.textContent = message
  el.style.display = 'block'
  setTimeout(() => el.style.display = 'none', 7000)
}

export function hideError() {
  document.getElementById('error-banner').style.display = 'none'
}

export function setLoading(isLoading) {
  const btn = document.getElementById('search-btn')
  const input = document.getElementById('address-input')
  btn.disabled = isLoading
  btn.textContent = isLoading ? '...' : 'GO'
  input.disabled = isLoading
}
