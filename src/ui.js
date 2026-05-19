import { scoreColor, scoreLabel, timeColor } from './score.js'
import { POIS as DESTINATIONS } from './pois.js'
import { soundscoreColor } from './soundscore.js'

const CAT_ICONS = {
  work: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>`,
  park: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-7"/><polygon points="12,2 4,14 20,14"/></svg>`,
  social: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3"/><path d="M3 21c0-4 2.7-6 6-6s6 2 6 6"/><circle cx="18" cy="8" r="2"/><path d="M15 21c0-2.5 1.3-4 3-4s3 1.5 3 4"/></svg>`,
}
import { drawRoute, fitRouteBounds, openMarkerPopup } from './map.js'
import { subwayBullet } from './lines.js'
import { getSaved, saveAddress, removeAddress, exportCSV } from './storage.js'
import { initAutocomplete } from './autocomplete.js'

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
let _lastResults = null
let _lastDestCoords = null

export function renderResults(results, destCoords, onRouteClick) {
  _lastResults = results
  _lastDestCoords = destCoords

  // Switch to results tab if on saved view
  const resultsBtn = document.getElementById('toggle-results-btn')
  const savedBtn = document.getElementById('toggle-saved-btn')
  if (resultsBtn && savedBtn) {
    resultsBtn.classList.add('active')
    savedBtn.classList.remove('active')
  }

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
    card.dataset.category = dest.category || ''
    card.style.setProperty('--accent-color', dest.color)
    card.style.animationDelay = `${i * 55}ms`

    if (result && !result.error) {
      const tc = timeColor(result.minutes)
      const pct = Math.round((result.minutes / maxTime) * 100)

      const displayName = dest.nickname || dest.name
      const subtitle = dest.nickname
        ? `<div class="card-subtitle">${dest.name}</div>`
        : ''

      const catIcon = dest.category && CAT_ICONS[dest.category]
        ? `<span class="card-cat-icon card-cat-icon--${dest.category}" title="${dest.category}">${CAT_ICONS[dest.category]}</span>`
        : ''

      const alts = result.alternatives ?? []
      const altsHtml = alts.map((alt, ai) => {
        const altTc = timeColor(alt.minutes)
        const bullets = alt.lines?.map(l => subwayBullet(l.name)).join('') ?? ''
        const walk = alt.walkMinutes > 0 ? `<span class="alt-walk">🚶 ${alt.walkMinutes}m</span>` : ''
        const isBest = ai === 0
        return `
          <div class="alt-row${isBest ? ' alt-row--best' : ''}" data-alt-index="${ai}">
            <span class="alt-time" style="color:${isBest ? altTc : ''}">${alt.minutes}<span class="alt-unit"> min</span></span>
            <span class="alt-bullets">${bullets}</span>
            <span class="alt-xfer">${alt.transfers}x xfer</span>
            ${walk}
          </div>
        `
      }).join('')
      const extraAlts = alts.length > 1 ? alts.length - 1 : 0

      card.innerHTML = `
        <div class="card-header">
          ${catIcon}
          <div class="card-title-group">
            <div class="card-title">${displayName}</div>
            ${subtitle}
          </div>
        </div>
        <div class="card-alts">${altsHtml}</div>
        ${extraAlts > 0 ? `<div class="alts-hint">+${extraAlts} more route${extraAlts > 1 ? 's' : ''}</div>` : ''}
        <div class="progress-track">
          <div class="progress-bar" style="width:${pct}%;background:${tc}"></div>
        </div>
      `

      card.querySelectorAll('.alt-row').forEach((row, ai) => {
        row.addEventListener('click', (e) => {
          e.stopPropagation()
          if (activeCard) activeCard.classList.remove('card-active')
          card.classList.add('card-active')
          activeCard = card
          card.querySelectorAll('.alt-row').forEach(r => r.classList.remove('alt-selected'))
          row.classList.add('alt-selected')
          const alt = result.alternatives?.[ai]
          if (alt?.routeSections?.length) {
            drawRoute(alt.routeSections)
            fitRouteBounds(alt.routeSections)
            if (onRouteClick) onRouteClick(alt.routeSections)
          }
        })
      })
    } else {
      card.innerHTML = `
        <div class="card-header">
          <div class="card-title-group"><div class="card-title">${dest.name}</div></div>
          <div class="card-time" style="color:#444">N/A</div>
        </div>
        <div class="card-meta"><span style="color:#555">Route unavailable</span></div>
        <div class="progress-track"><div class="progress-bar" style="width:0%"></div></div>
      `
    }

    card.addEventListener('click', () => {
      if (activeCard) activeCard.classList.remove('card-active')
      card.classList.add('card-active')
      activeCard = card
      card.querySelectorAll('.alt-row').forEach(r => r.classList.remove('alt-selected'))
      card.querySelector('.alt-row--best')?.classList.add('alt-selected')
      const best = result?.alternatives?.[0] ?? result
      if (best && !result?.error && best.routeSections?.length) {
        drawRoute(best.routeSections)
        fitRouteBounds(best.routeSections)
        if (onRouteClick) onRouteClick(best.routeSections)
        setTimeout(() => openMarkerPopup(i), 950)
      }
    })

    list.appendChild(card)
  })
}

export function setScore(scoreData) {
  const numEl = document.getElementById('score-num')
  const fillEl = document.getElementById('score-fill')

  if (!scoreData || scoreData.score === 0) {
    numEl.textContent = '—'
    numEl.style.color = '#444'
    fillEl.style.width = '0%'
    fillEl.style.background = '#444'
    return
  }

  const { score } = scoreData
  const color = scoreColor(score)

  numEl.textContent = score
  numEl.style.color = color
  fillEl.style.width = `${score}%`
  fillEl.style.background = color

  if (window.innerWidth < 768) {
    const panel = document.querySelector('.score-panel')
    panel.onclick = () => panel.classList.toggle('expanded')
  }
}

export function renderNearestStations(stations) {
  const el = document.getElementById('nearest-stations')
  if (!el) return
  if (!stations || stations.length === 0) { el.style.display = 'none'; return }

  el.style.display = 'block'
  el.innerHTML = `
    <div class="stations-label">NEAREST SUBWAY</div>
    ${stations.map(s => {
      const shown = s.routes.slice(0, 3)
      const extra = s.routes.length > 3 ? s.routes.length - 3 : 0
      const badges = shown.map(r => `<span class="route-badge route-${r}">${r}</span>`).join('')
      const extraBadge = extra > 0 ? `<span class="route-badge">+${extra}</span>` : ''
      return `
        <div class="station-row">
          <div class="station-info">
            <span class="station-name">${s.name}</span>
            <div class="route-badges">${badges}${extraBadge}</div>
          </div>
          <div class="station-walk">
            ${s.walkMinutes !== null ? `${s.walkMinutes}<span class="walk-unit"> min</span>` : '—'}
          </div>
        </div>
      `
    }).join('')}
  `
}

export function renderSoundscore(data) {
  const numEl = document.getElementById('soundscore-num')
  const fillEl = document.getElementById('soundscore-fill')
  if (!numEl) return

  if (!data || data.score == null) {
    numEl.textContent = '—'
    numEl.style.color = '#444'
    if (fillEl) { fillEl.style.width = '0%'; fillEl.style.background = '' }
    return
  }

  const color = soundscoreColor(data.score)
  numEl.textContent = data.score
  numEl.style.color = color
  if (fillEl) { fillEl.style.width = `${data.score}%`; fillEl.style.background = color }
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

let _onLoadSaved = null

export function initSavedPanel(onLoad) {
  _onLoadSaved = onLoad

  const resultsBtn = document.getElementById('toggle-results-btn')
  const savedBtn = document.getElementById('toggle-saved-btn')
  const destList = document.getElementById('dest-list')

  resultsBtn.addEventListener('click', () => {
    resultsBtn.classList.add('active')
    savedBtn.classList.remove('active')
    destList.dataset.view = 'results'
    _restoreResultsView()
  })

  savedBtn.addEventListener('click', () => {
    savedBtn.classList.add('active')
    resultsBtn.classList.remove('active')
    destList.dataset.view = 'saved'
    renderSavedList()
  })

  document.getElementById('compare-close-btn').addEventListener('click', () => {
    document.getElementById('compare-modal').style.display = 'none'
  })

  updateSavedCount()
}

function _restoreResultsView() {
  if (_lastResults) renderResults(_lastResults, _lastDestCoords)
}

function updateSavedCount() {
  const el = document.getElementById('saved-count')
  if (el) el.textContent = getSaved().length
}

export function showSaveBar(address, scoreData, results) {
  const bar = document.getElementById('save-bar')
  const btn = document.getElementById('save-btn')
  bar.style.display = 'block'

  const saved = getSaved()
  const alreadySaved = saved.some(s => s.address === address)

  if (alreadySaved) {
    btn.textContent = '✓ Already saved'
    btn.disabled = true
    btn.style.color = 'var(--accent)'
    return
  }

  btn.textContent = '＋ Save this address'
  btn.disabled = false
  btn.style.color = ''

  btn.onclick = () => {
    try {
      saveAddress({
        address,
        score: scoreData.score,
        avg: scoreData.avg,
        max: scoreData.max,
        results: results.map((r, i) => ({
          destId: i,
          name: DESTINATIONS[i].name,
          minutes: r?.minutes ?? null,
          transfers: r?.transfers ?? null,
          error: r?.error ?? null,
        })),
      })
      btn.textContent = '✓ Saved'
      btn.disabled = true
      btn.style.color = 'var(--accent)'
      updateSavedCount()
    } catch (e) {
      btn.textContent = e.message
    }
  }
}

function renderSavedList() {
  const list = document.getElementById('dest-list')
  const saved = getSaved()

  if (saved.length === 0) {
    list.innerHTML = `<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-title">No saved addresses</div><div class="empty-sub">Run a search and click<br>"＋ Save this address"</div></div>`
    return
  }

  const showCompare = saved.length >= 2
  list.innerHTML = `
    <div class="saved-actions-row">
      ${showCompare ? `<button id="compare-btn" class="compare-btn">⊞ Compare</button>` : ''}
      <button id="export-btn" class="export-btn">↓ Export CSV</button>
    </div>
    ${saved.map(entry => {
      const color = scoreColor(entry.score)
      return `
        <div class="saved-card" data-id="${entry.id}">
          <div class="saved-card-main">
            <div class="saved-address">${entry.address}</div>
            <div class="saved-meta">avg ${entry.avg} min · ${new Date(entry.savedAt).toLocaleDateString()}</div>
          </div>
          <div class="saved-card-right">
            <span class="saved-score" style="color:${color}">${entry.score.toFixed(1)}</span>
            <div class="saved-card-btns">
              <button class="load-btn" data-id="${entry.id}">Load</button>
              <button class="remove-btn" data-id="${entry.id}">✕</button>
            </div>
          </div>
        </div>
      `
    }).join('')}
  `

  list.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      removeAddress(btn.dataset.id)
      updateSavedCount()
      renderSavedList()
    })
  })

  list.querySelectorAll('.load-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const entry = getSaved().find(s => s.id === btn.dataset.id)
      if (entry && _onLoadSaved) _onLoadSaved(entry.address)
    })
  })

  const exportBtn = document.getElementById('export-btn')
  if (exportBtn) exportBtn.addEventListener('click', () => exportCSV(getSaved()))

  const compareBtn = document.getElementById('compare-btn')
  if (compareBtn) compareBtn.addEventListener('click', () => renderCompareModal(getSaved()))
}

function renderCompareModal(saved) {
  const shown = saved.slice(0, 5)
  const destinations = shown[0]?.results ?? []

  const headerCols = shown.map(s => {
    const color = scoreColor(s.score)
    return `<th><div class="cmp-addr">${s.address}</div><span class="cmp-score" style="color:${color}">${s.score.toFixed(1)}</span></th>`
  }).join('')

  const rows = destinations.map((_, i) => {
    const destName = DESTINATIONS[i]?.name ?? `Dest ${i + 1}`
    const cells = shown.map(s => {
      const r = s.results[i]
      if (!r || r.error) return `<td class="cmp-na">N/A</td>`
      const color = timeColor(r.minutes)
      return `<td style="color:${color}">${r.minutes}<span style="font-size:9px;color:#666"> min</span></td>`
    }).join('')
    return `<tr><td class="cmp-dest">${destName}</td>${cells}</tr>`
  }).join('')

  document.getElementById('compare-table-wrap').innerHTML = `
    <table class="compare-table">
      <thead><tr><th>Destination</th>${headerCols}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `
  document.getElementById('compare-modal').style.display = 'flex'
}

export function setLoading(isLoading) {
  const btn = document.getElementById('search-btn')
  const input = document.getElementById('address-input')
  btn.disabled = isLoading
  btn.textContent = isLoading ? '...' : 'GO'
  input.disabled = isLoading
}

export function initSettingsPanel({ addPOI, removePOI, resetPOIs, onChanged }) {
  const modal = document.getElementById('settings-modal')
  const openBtn = document.getElementById('settings-btn')
  const closeBtn = document.getElementById('settings-close-btn')

  // Wire address autocomplete for the CMS add form
  const poiAddressEl = document.getElementById('poi-address')
  if (poiAddressEl) initAutocomplete(poiAddressEl, () => {})

  openBtn.addEventListener('click', () => { renderPOIList(); modal.style.display = 'flex' })
  closeBtn.addEventListener('click', () => { modal.style.display = 'none' })
  modal.addEventListener('click', e => { if (e.target === modal) modal.style.display = 'none' })

  document.getElementById('poi-add-btn').addEventListener('click', () => {
    const name = document.getElementById('poi-name').value.trim()
    const address = document.getElementById('poi-address').value.trim()
    const category = document.getElementById('poi-category').value
    const color = document.getElementById('poi-color').value
    const nickname = document.getElementById('poi-nickname')?.value.trim() || undefined

    if (!name || !address) return

    addPOI({ name, address, category, color, nickname })
    onChanged()
    document.getElementById('poi-name').value = ''
    document.getElementById('poi-address').value = ''
    if (document.getElementById('poi-nickname')) document.getElementById('poi-nickname').value = ''
    renderPOIList()
  })

  document.getElementById('poi-reset-btn').addEventListener('click', () => {
    if (!confirm('Reset all destinations to defaults?')) return
    resetPOIs()
    onChanged()
    renderPOIList()
  })

  function renderPOIList() {
    const container = document.getElementById('settings-poi-list')
    container.innerHTML = DESTINATIONS.map(p => `
      <div class="settings-poi-row">
        <div class="poi-color-dot" style="background:${p.color}"></div>
        <div class="poi-row-name">${p.nickname ? `<em>${p.nickname}</em> — ` : ''}${p.name}</div>
        <div class="poi-row-cat">${p.category || ''}</div>
        <button class="poi-delete-btn" data-id="${p.id}">Remove</button>
      </div>
    `).join('')

    container.querySelectorAll('.poi-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (DESTINATIONS.length <= 1) return
        removePOI(btn.dataset.id)
        onChanged()
        renderPOIList()
      })
    })
  }
}
