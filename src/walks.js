import { MAPBOX_TOKEN } from './config.js'

export async function getWalkTimesToDests(originLng, originLat, destCoords) {
  return Promise.all(
    destCoords.map(async (coords) => {
      if (!coords) return null
      try {
        const url =
          `https://api.mapbox.com/directions/v5/mapbox/walking/` +
          `${originLng},${originLat};${coords[0]},${coords[1]}` +
          `?access_token=${MAPBOX_TOKEN}&geometries=geojson&overview=simplified`
        const res = await fetch(url)
        if (!res.ok) return null
        const data = await res.json()
        const route = data.routes?.[0]
        if (!route) return null
        return {
          minutes: Math.round(route.duration / 60),
          coordinates: route.geometry?.coordinates ?? [],
        }
      } catch {
        return null
      }
    })
  )
}
