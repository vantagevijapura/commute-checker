import mapboxgl from 'mapbox-gl'
import { decode } from '@here/flexpolyline'
import { MAPBOX_TOKEN } from './config.js'
import { subwayBullet, lineColorHex } from './lines.js'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = MAPBOX_TOKEN

let map
let markers = []
let originMarker = null
let routeLayerIds = []

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
  el.className = 'dest-marker'
  el.style.setProperty('--dest-color', dest.color)

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
      try {
        const decoded = decode(section.polyline)
        coords = decoded.polyline.map(([lat, lng]) => [lng, lat])
      } catch {
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
    if (!section.polyline) return
    try {
      const decoded = decode(section.polyline)
      decoded.polyline.forEach(([lat, lng]) => {
        bounds.extend([lng, lat])
        hasPoints = true
      })
    } catch { /* skip */ }
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

export function flyTo(coords, zoom = 14) {
  map.flyTo({ center: coords, zoom, duration: 800 })
}

export function openMarkerPopup(index) {
  if (markers[index]) markers[index].togglePopup()
}
