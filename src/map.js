import mapboxgl from 'mapbox-gl'
import { decode } from '@here/flexpolyline'
import { MAPBOX_TOKEN, HOWLOUD_KEY } from './config.js'
import { subwayBullet, lineColorHex } from './lines.js'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = MAPBOX_TOKEN

const SOUNDSCORE_TILE = `https://api.howloud.com/v2/tiles/score/{z}/{x}/{y}.png?x-api-key=${HOWLOUD_KEY}`

let map
let markers = []
let originMarker = null
let routeLayerIds = []
let stationMarkers = []
let isochroneVisible = false
let soundscoreVisible = false

export function initMap() {
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/dark-v11',
    center: [-73.98, 40.72],
    zoom: 11.5,
  })
  map.addControl(new mapboxgl.NavigationControl(), 'bottom-right')
  return map
}

export function clearMarkers() {
  markers.forEach(m => m.remove())
  markers = []
  if (originMarker) {
    originMarker.remove()
    originMarker = null
  }
}

export function addOriginMarker(lng, lat, label) {
  const el = document.createElement('div')
  el.className = 'origin-marker'

  originMarker = new mapboxgl.Marker({ element: el })
    .setLngLat([lng, lat])
    .setPopup(
      new mapboxgl.Popup({ offset: 16, closeButton: false })
        .setHTML(`<div class="popup-label">📍 ${label}</div>`)
    )
    .addTo(map)
}

export function addDestinationMarker(lng, lat, dest, result, index) {
  const el = document.createElement('div')
  el.style.setProperty('--dest-color', dest.color)

  if (result && !result.error) {
    el.className = 'dest-marker'
    el.textContent = result.minutes
  } else {
    el.className = 'dest-marker dest-marker--error'
  }

  const walkStr = result && !result.error && result.walkMinutes > 0
    ? `<div class="popup-walk">🚶 ${result.walkMinutes} min walk</div>`
    : ''

  const timeStr = result && !result.error
    ? `<div class="popup-time" style="color:${result.color}">${result.minutes} min</div>
       <div class="popup-bullets">${result.lines?.map(l => subwayBullet(l.name, 18)).join('') || ''}</div>
       ${walkStr}
       <div class="popup-meta">${result.transfers} xfer${result.transfers !== 1 ? 's' : ''} · ${result.lines?.reduce((s, l) => s + l.stops, 0) ?? 0} stops</div>`
    : `<div class="popup-meta" style="color:#666">Route unavailable</div>`

  const popup = new mapboxgl.Popup({ offset: 18, closeButton: false })
    .setHTML(`<div class="popup-label">${dest.name}</div>${timeStr}`)

  const marker = new mapboxgl.Marker({ element: el })
    .setLngLat([lng, lat])
    .setPopup(popup)
    .addTo(map)

  markers.push(marker)
  return marker
}

export function clearRoute() {
  // Layers must all be removed before any source removal —
  // Mapbox throws if you remove a source that still has a dependent layer.
  routeLayerIds.forEach(id => { if (map.getLayer(id)) map.removeLayer(id) })
  routeLayerIds.forEach(id => { if (map.getSource(id)) map.removeSource(id) })
  routeLayerIds = []
}

export function drawRoute(routeSections) {
  clearRoute()
  if (!routeSections?.length) return

  const draw = () => {
    routeSections.forEach((section, i) => {
      if (!section.polyline) return

      let coords
      if (section.coordinates) {
        coords = section.coordinates
      } else if (section.polyline) {
        try {
          const decoded = decode(section.polyline)
          coords = decoded.polyline.map(([lat, lng]) => [lng, lat])
        } catch {
          return
        }
      } else {
        return
      }

      if (coords.length < 2) return

      const id = `route-${i}`
      const isWalk = section.type === 'walk'
      const color = isWalk ? '#aaaaaa' : lineColorHex(section.lineName)

      map.addSource(id, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: coords } },
      })

      // Casing layer for contrast on dark map
      map.addLayer({
        id: `${id}-casing`,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#000',
          'line-width': isWalk ? 4 : 8,
          'line-opacity': 0.4,
        },
      })

      map.addLayer({
        id,
        type: 'line',
        source: id,
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': color,
          'line-width': isWalk ? 2 : 5,
          'line-dasharray': isWalk ? [2, 3] : [1],
          'line-opacity': 0.95,
        },
      })

      routeLayerIds.push(id, `${id}-casing`)
    })
  }

  if (map.isStyleLoaded()) {
    draw()
  } else {
    map.once('style.load', draw)
  }
}

export function fitRouteBounds(routeSections) {
  const bounds = new mapboxgl.LngLatBounds()
  let hasPoints = false

  routeSections?.forEach(section => {
    if (section.coordinates) {
      section.coordinates.forEach(([lng, lat]) => { bounds.extend([lng, lat]); hasPoints = true })
    } else if (section.polyline) {
      try {
        const decoded = decode(section.polyline)
        decoded.polyline.forEach(([lat, lng]) => { bounds.extend([lng, lat]); hasPoints = true })
      } catch { /* skip */ }
    }
  })

  if (hasPoints) {
    map.fitBounds(bounds, { padding: 80, maxZoom: 14, duration: 900 })
  }
}

export function fitMapToBounds(originCoords, destCoords) {
  const bounds = new mapboxgl.LngLatBounds()
  bounds.extend(originCoords)
  destCoords.forEach(c => { if (c) bounds.extend(c) })
  map.fitBounds(bounds, { padding: 70, maxZoom: 13, duration: 1200 })
}

export const MAPBOX_STYLES = {
  dark: 'mapbox://styles/mapbox/dark-v11',
  light: 'mapbox://styles/mapbox/light-v11',
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
}

export function setPinTimesVisible(visible) {
  document.getElementById('map')?.classList.toggle('hide-pin-times', !visible)
}

export function setMapStyle(styleUrl, onReady) {
  map.setStyle(styleUrl)
  map.once('style.load', onReady)
}

export function flyTo(coords, zoom = 14) {
  map.flyTo({ center: coords, zoom, duration: 800 })
}

export function openMarkerPopup(index) {
  if (markers[index]) markers[index].togglePopup()
}

export function addStationMarkers(stations) {
  stations.forEach(station => {
    const el = document.createElement('div')
    el.className = 'station-marker'
    el.title = station.name
    const marker = new mapboxgl.Marker({ element: el })
      .setLngLat([station.lng, station.lat])
      .addTo(map)
    stationMarkers.push(marker)
  })
}

export function clearStationMarkers() {
  stationMarkers.forEach(m => m.remove())
  stationMarkers = []
}

export function addIsochroneLayer(geojson) {
  removeIsochroneLayer()

  const draw = () => {
    map.addSource('isochrone', { type: 'geojson', data: geojson })

    const configs = [
      { filter: ['==', ['get', 'contour'], 30], color: '#3b82f6', fillOpacity: 0.08, lineOpacity: 0.6 },
      { filter: ['==', ['get', 'contour'], 20], color: '#8b5cf6', fillOpacity: 0.12, lineOpacity: 0.6 },
      { filter: ['==', ['get', 'contour'], 10], color: '#00e5a0', fillOpacity: 0.18, lineOpacity: 0.6 },
    ]

    configs.forEach((cfg, i) => {
      map.addLayer({
        id: `isochrone-fill-${i}`,
        type: 'fill',
        source: 'isochrone',
        filter: cfg.filter,
        paint: { 'fill-color': cfg.color, 'fill-opacity': cfg.fillOpacity },
      })
      map.addLayer({
        id: `isochrone-line-${i}`,
        type: 'line',
        source: 'isochrone',
        filter: cfg.filter,
        paint: { 'line-color': cfg.color, 'line-width': 1.5, 'line-opacity': cfg.lineOpacity },
      })
    })

    isochroneVisible = true
    const legend = document.getElementById('isochrone-legend')
    if (legend) legend.style.display = 'block'
  }

  if (map.isStyleLoaded()) draw()
  else map.once('style.load', draw)
}

export function removeIsochroneLayer() {
  // Two-pass: layers first, then source
  for (let i = 0; i < 3; i++) {
    if (map.getLayer(`isochrone-fill-${i}`)) map.removeLayer(`isochrone-fill-${i}`)
    if (map.getLayer(`isochrone-line-${i}`)) map.removeLayer(`isochrone-line-${i}`)
  }
  if (map.getSource('isochrone')) map.removeSource('isochrone')
  isochroneVisible = false
  const legend = document.getElementById('isochrone-legend')
  if (legend) legend.style.display = 'none'
}

export function toggleIsochrone() {
  const newVisible = !isochroneVisible
  const vis = newVisible ? 'visible' : 'none'
  for (let i = 0; i < 3; i++) {
    if (map.getLayer(`isochrone-fill-${i}`)) map.setLayoutProperty(`isochrone-fill-${i}`, 'visibility', vis)
    if (map.getLayer(`isochrone-line-${i}`)) map.setLayoutProperty(`isochrone-line-${i}`, 'visibility', vis)
  }
  isochroneVisible = newVisible
  const legend = document.getElementById('isochrone-legend')
  if (legend) legend.style.display = newVisible ? 'block' : 'none'
  return isochroneVisible
}

export function addIsochroneControl() {
  // Button is now a plain HTML element in index.html — no map.addControl needed
}

// ── SOUNDSCORE TILE LAYER ─────────────────────────────
function firstSymbolLayerId() {
  return map.getStyle()?.layers?.find(l => l.type === 'symbol')?.id
}

export function addSoundscoreLayer() {
  removeSoundscoreLayer()
  const draw = () => {
    map.addSource('soundscore-tiles', {
      type: 'raster',
      tiles: [SOUNDSCORE_TILE],
      tileSize: 256,
      attribution: '© HowLoud',
    })
    map.addLayer({
      id: 'soundscore-layer',
      type: 'raster',
      source: 'soundscore-tiles',
      paint: { 'raster-opacity': 0.55 },
    }, firstSymbolLayerId())
    soundscoreVisible = true
  }
  if (map.isStyleLoaded()) draw()
  else map.once('style.load', draw)
}

export function removeSoundscoreLayer() {
  if (map.getLayer('soundscore-layer')) map.removeLayer('soundscore-layer')
  if (map.getSource('soundscore-tiles')) map.removeSource('soundscore-tiles')
  soundscoreVisible = false
}

export function toggleSoundscoreLayer() {
  soundscoreVisible ? removeSoundscoreLayer() : addSoundscoreLayer()
  return soundscoreVisible
}

export function isSoundscoreLayerVisible() { return soundscoreVisible }

// ── TRANSIT COVERAGE SCAN ─────────────────────────────
export function addCoverageLayer(points) {
  const features = points
    .filter(p => p.minutes !== null)
    .map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: { minutes: p.minutes },
    }))
  const geojson = { type: 'FeatureCollection', features }

  const existing = map.getSource('coverage')
  if (existing) { existing.setData(geojson); return }

  const draw = () => {
    map.addSource('coverage', { type: 'geojson', data: geojson })
    map.addLayer({
      id: 'coverage-circles',
      type: 'circle',
      source: 'coverage',
      paint: {
        'circle-radius': 22,
        'circle-blur': 0.6,
        'circle-opacity': 0.72,
        'circle-color': [
          'step', ['get', 'minutes'],
          '#00e5a0', 15,
          '#4ade80', 20,
          '#a3e635', 25,
          '#facc15', 30,
          '#fb923c', 38,
          '#f87171', 999, '#9ca3af',
        ],
      },
    })
    map.addLayer({
      id: 'coverage-labels',
      type: 'symbol',
      source: 'coverage',
      layout: {
        'text-field': ['concat', ['to-string', ['get', 'minutes']], 'm'],
        'text-size': 10,
        'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
      },
      paint: { 'text-color': '#fff', 'text-halo-color': 'rgba(0,0,0,0.4)', 'text-halo-width': 1 },
    })
  }

  if (map.isStyleLoaded()) draw()
  else map.once('style.load', draw)
}

export function removeCoverageLayer() {
  if (map.getLayer('coverage-labels')) map.removeLayer('coverage-labels')
  if (map.getLayer('coverage-circles')) map.removeLayer('coverage-circles')
  if (map.getSource('coverage')) map.removeSource('coverage')
}

export function addSoundscoreControl() {
  // Button is now a plain HTML element in index.html — no map.addControl needed
}
