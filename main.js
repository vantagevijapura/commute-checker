import './style.css'
import { initMap, clearMarkers, clearRoute, drawRoute, addOriginMarker, addDestinationMarker, fitMapToBounds, addIsochroneLayer, removeIsochroneLayer, toggleIsochrone, addStationMarkers, clearStationMarkers, MAPBOX_STYLES, setMapStyle, addSoundscoreLayer, removeSoundscoreLayer, toggleSoundscoreLayer, isSoundscoreLayerVisible, setPinTimesVisible, addCoverageLayer, removeCoverageLayer } from './src/map.js'
import { geocodeAddress, geocodeAllDestinations } from './src/geocode.js'
import { getAllTransitTimes } from './src/transit.js'
import { calculateScore, timeColor } from './src/score.js'
import { showSkeletons, showEmptyState, renderResults, setScore, showError, hideError, setLoading, renderNearestStations, renderSoundscore, showSaveBar, initSavedPanel, initSettingsPanel } from './src/ui.js'
import { POIS as DESTINATIONS, addPOI, removePOI, resetPOIs } from './src/pois.js'
import { trackMapbox, trackHere, initTokenDisplay } from './src/tokens.js'
import { initAutocomplete } from './src/autocomplete.js'
import { fetchIsochrone } from './src/isochrone.js'
import { fetchSoundscore } from './src/soundscore.js'
import { loadStations, findNearestStations, getWalkTimesToStations } from './src/stations.js'
import { getWalkTimesToDests } from './src/walks.js'
import { runCoverageScan } from './src/coverage.js'

const map = initMap()
initTokenDisplay()
map.on('load', () => {
  initTheme()
})

// Map overlay toggle buttons
const isochroneBtn = document.getElementById('isochrone-toggle-btn')
const soundscoreBtn = document.getElementById('soundscore-toggle-btn')
const coverageBtn = document.getElementById('coverage-scan-btn')

isochroneBtn.addEventListener('click', () => {
  syncIsochroneUI(toggleIsochrone())
})

soundscoreBtn.addEventListener('click', () => {
  syncSoundscoreUI(toggleSoundscoreLayer())
})

let lastOriginCoords = null
let coverageActive = false

coverageBtn?.addEventListener('click', async () => {
  if (!lastOriginCoords) return

  if (coverageActive) {
    removeCoverageLayer()
    coverageActive = false
    coverageBtn.textContent = '📡'
    coverageBtn.classList.remove('active')
    return
  }

  coverageBtn.disabled = true
  coverageBtn.textContent = '0/48'

  const [originLng, originLat] = lastOriginCoords
  await runCoverageScan(originLat, originLng, (points) => {
    addCoverageLayer(points)
    coverageBtn.textContent = `${points.length}/48`
  })

  trackHere(48)
  coverageActive = true
  coverageBtn.disabled = false
  coverageBtn.textContent = '📡'
  coverageBtn.classList.add('active')
})

initSavedPanel((address) => {
  document.getElementById('address-input').value = address
  runSearch()
})

initSettingsPanel({ addPOI, removePOI, resetPOIs, onChanged: onPOIsChanged })

let destCoords = new Array(DESTINATIONS.length).fill(null)
geocodeAllDestinations(DESTINATIONS).then(coords => {
  destCoords = coords
  trackMapbox(DESTINATIONS.length)
})

// Called by the settings panel after any POI add/remove
function onPOIsChanged() {
  destCoords = new Array(DESTINATIONS.length).fill(null)
  geocodeAllDestinations(DESTINATIONS).then(coords => {
    destCoords = coords
    trackMapbox(DESTINATIONS.length)
  })
}

const addressInput = document.getElementById('address-input')
initAutocomplete(addressInput, () => runSearch())
addressInput.addEventListener('keydown', e => { if (e.key === 'Enter') runSearch() })
document.getElementById('search-btn').addEventListener('click', runSearch)

showEmptyState()

// ── THEME & MAP STYLE ─────────────────────────────────────
let lastIsochrone = null
let lastRouteSections = null
let currentMapStyleName = 'dark'

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem('commute-theme', theme)
  document.querySelectorAll('#theme-btn-group .settings-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === theme)
  })
}

function applyMapStyle(styleName) {
  currentMapStyleName = styleName
  localStorage.setItem('commute-map-style', styleName)
  document.querySelectorAll('#mapstyle-btn-group .settings-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mapstyle === styleName)
  })
  setMapStyle(MAPBOX_STYLES[styleName], () => {
    if (lastRouteSections) drawRoute(lastRouteSections)
    if (lastIsochrone) addIsochroneLayer(lastIsochrone)
    if (isSoundscoreLayerVisible()) addSoundscoreLayer()
  })
}

function syncIsochroneUI(visible) {
  document.getElementById('isochrone-toggle-btn')?.classList.toggle('active', visible)
  const cb = document.getElementById('setting-isochrone')
  if (cb) cb.checked = visible
}

function syncSoundscoreUI(visible) {
  document.getElementById('soundscore-toggle-btn')?.classList.toggle('active', visible)
  const cb = document.getElementById('setting-soundscore')
  if (cb) cb.checked = visible
}

function applyMarkerStyle(style) {
  const mapEl = document.getElementById('map')
  mapEl?.classList.toggle('markers-pill', style === 'pill')
  localStorage.setItem('commute-marker-style', style)
  document.querySelectorAll('#markerstyle-btn-group .settings-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.markerstyle === style)
  })
}

function applyCardMode(mode) {
  document.querySelector('.dest-list')?.classList.toggle('compact', mode === 'compact')
  localStorage.setItem('commute-card-mode', mode)
  document.querySelectorAll('#cardmode-btn-group .settings-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cardmode === mode)
  })
}

function initTheme() {
  const savedTheme = localStorage.getItem('commute-theme') || 'dark'
  const savedStyle = localStorage.getItem('commute-map-style') || 'dark'
  const savedPinTimes = localStorage.getItem('commute-pin-times') !== 'false'
  const savedMarkerStyle = localStorage.getItem('commute-marker-style') || 'dot'
  const savedCardMode = localStorage.getItem('commute-card-mode') || 'expanded'

  applyTheme(savedTheme)
  applyMarkerStyle(savedMarkerStyle)
  applyCardMode(savedCardMode)

  // Apply non-default map style (map starts as dark-v11 by default)
  if (savedStyle !== 'dark') {
    setMapStyle(MAPBOX_STYLES[savedStyle], () => {})
    currentMapStyleName = savedStyle
  }
  document.querySelectorAll('#mapstyle-btn-group .settings-opt-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mapstyle === savedStyle)
  })

  // Pin times
  const pinTimesEl = document.getElementById('setting-pin-times')
  if (pinTimesEl) pinTimesEl.checked = savedPinTimes
  setPinTimesVisible(savedPinTimes)

  // Wire theme buttons
  document.querySelectorAll('#theme-btn-group .settings-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme))
  })

  // Wire map style buttons
  document.querySelectorAll('#mapstyle-btn-group .settings-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => applyMapStyle(btn.dataset.mapstyle))
  })

  // Wire marker style buttons
  document.querySelectorAll('#markerstyle-btn-group .settings-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => applyMarkerStyle(btn.dataset.markerstyle))
  })

  // Wire card mode buttons
  document.querySelectorAll('#cardmode-btn-group .settings-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => applyCardMode(btn.dataset.cardmode))
  })

  // Wire pin times toggle
  if (pinTimesEl) {
    pinTimesEl.addEventListener('change', () => {
      localStorage.setItem('commute-pin-times', pinTimesEl.checked)
      setPinTimesVisible(pinTimesEl.checked)
    })
  }

  // Wire isochrone settings toggle
  document.getElementById('setting-isochrone')?.addEventListener('change', () => {
    const visible = toggleIsochrone()
    syncIsochroneUI(visible)
  })

  // Wire soundscore settings toggle
  document.getElementById('setting-soundscore')?.addEventListener('change', () => {
    const visible = toggleSoundscoreLayer()
    syncSoundscoreUI(visible)
  })
}

// ── CATEGORY FILTERS ──────────────────────────────────────
const activeFilters = new Set()

document.querySelectorAll('.cat-filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const cat = btn.dataset.cat
    if (activeFilters.has(cat)) {
      activeFilters.delete(cat)
      btn.classList.remove(`active-${cat}`)
    } else {
      activeFilters.add(cat)
      btn.classList.add(`active-${cat}`)
    }
    applyCardFilter()
  })
})

function applyCardFilter() {
  document.querySelectorAll('.dest-card[data-category]').forEach(card => {
    const show = activeFilters.size === 0 || activeFilters.has(card.dataset.category)
    card.style.display = show ? '' : 'none'
  })
}

// ── SEARCH ────────────────────────────────────────────────
async function runSearch() {
  const address = document.getElementById('address-input').value.trim()
  if (!address) return

  setLoading(true)
  hideError()
  showSkeletons()
  clearMarkers()
  clearStationMarkers()
  clearRoute()
  removeIsochroneLayer()
  removeCoverageLayer()
  coverageActive = false
  if (coverageBtn) { coverageBtn.textContent = '📡'; coverageBtn.classList.remove('active') }
  renderNearestStations(null)
  renderSoundscore(null)
  setScore(null)
  lastIsochrone = null
  lastRouteSections = null

  let originCoords
  try {
    originCoords = await geocodeAddress(address)
    trackMapbox(1)
  } catch (e) {
    showError(e.message)
    setLoading(false)
    showEmptyState()
    return
  }

  lastOriginCoords = originCoords
  const [originLng, originLat] = originCoords
  addOriginMarker(originLng, originLat, address)

  if (destCoords.every(c => c === null)) {
    destCoords = await geocodeAllDestinations(DESTINATIONS)
    trackMapbox(DESTINATIONS.length)
  }

  const [results, stationsData, walkTimes] = await Promise.all([
    getAllTransitTimes(originLng, originLat, destCoords),
    loadStations()
      .then(stations => {
        const nearest = findNearestStations(originLat, originLng, stations, 3)
        return getWalkTimesToStations(originLng, originLat, nearest)
      })
      .catch(() => []),
    getWalkTimesToDests(originLng, originLat, destCoords),
  ])
  trackHere(destCoords.filter(Boolean).length)
  trackMapbox(3 + destCoords.filter(Boolean).length)

  // Merge walk-only routes as final alternative on each result
  walkTimes.forEach((walk, i) => {
    if (!walk || !results[i] || results[i].error) return
    if (walk.minutes > 45) return
    const walkAlt = {
      minutes: walk.minutes,
      walkMinutes: walk.minutes,
      transfers: 0,
      lines: [],
      modes: ['pedestrian'],
      routeSections: walk.coordinates.length > 1
        ? [{ type: 'walk', coordinates: walk.coordinates }]
        : [],
      journey: [{ type: 'walk', minutes: walk.minutes }],
      isWalkOnly: true,
    }
    results[i] = { ...results[i], alternatives: [...(results[i].alternatives ?? []), walkAlt] }
  })

  results.forEach((result, i) => {
    if (destCoords[i]) {
      const enriched = result && !result.error
        ? { ...result, color: timeColor(result.minutes) }
        : result
      addDestinationMarker(destCoords[i][0], destCoords[i][1], DESTINATIONS[i], enriched, i)
    }
  })

  if (stationsData.length) addStationMarkers(stationsData)

  fitMapToBounds(originCoords, destCoords)

  fetchIsochrone(originLng, originLat)
    .then(geojson => { lastIsochrone = geojson; addIsochroneLayer(geojson) })
    .catch(e => console.warn('Isochrone:', e.message))

  fetchSoundscore(originLat, originLng)
    .then(data => renderSoundscore(data))
    .catch(e => console.warn('Soundscore:', e.message))

  renderResults(results, destCoords, (sections) => { lastRouteSections = sections })

  const scoreData = calculateScore(results)
  setScore(scoreData)
  renderNearestStations(stationsData)
  showSaveBar(address, scoreData, results)

  applyCardFilter()
  setLoading(false)
}
