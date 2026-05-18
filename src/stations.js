import { MAPBOX_TOKEN } from './config.js'

let stationsCache = null

export async function loadStations() {
  if (stationsCache) return stationsCache
  const res = await fetch('/data/stations.csv')
  const text = await res.text()
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

  stationsCache = lines.slice(1).map(line => {
    const cols = parseCSVLine(line)
    return {
      name: cols[headers.indexOf('Stop Name')]?.replace(/"/g, '').trim(),
      routes: cols[headers.indexOf('Daytime Routes')]?.replace(/"/g, '').trim().split(' ').filter(Boolean) ?? [],
      lat: parseFloat(cols[headers.indexOf('GTFS Latitude')]),
      lng: parseFloat(cols[headers.indexOf('GTFS Longitude')]),
    }
  }).filter(s => !isNaN(s.lat) && !isNaN(s.lng) && s.name)

  return stationsCache
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function findNearestStations(originLat, originLng, stations, count = 3) {
  return stations
    .map(s => ({ ...s, distKm: haversineKm(originLat, originLng, s.lat, s.lng) }))
    .sort((a, b) => a.distKm - b.distKm)
    .slice(0, count)
}

export async function getWalkTimesToStations(originLng, originLat, stations) {
  return Promise.all(
    stations.map(async (station) => {
      try {
        const url = `https://api.mapbox.com/directions/v5/mapbox/walking/` +
          `${originLng},${originLat};${station.lng},${station.lat}` +
          `?access_token=${MAPBOX_TOKEN}&overview=false`
        const res = await fetch(url)
        const data = await res.json()
        const durationSec = data.routes?.[0]?.duration
        return { ...station, walkMinutes: durationSec ? Math.round(durationSec / 60) : null }
      } catch {
        return { ...station, walkMinutes: null }
      }
    })
  )
}

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') { inQuotes = !inQuotes }
    else if (char === ',' && !inQuotes) { result.push(current); current = '' }
    else current += char
  }
  result.push(current)
  return result
}
