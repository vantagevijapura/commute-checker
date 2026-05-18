import { MAPBOX_TOKEN } from './config.js'

export async function fetchIsochrone(lng, lat) {
  const url = `https://api.mapbox.com/isochrone/v1/mapbox/walking/${lng},${lat}` +
    `?contours_minutes=10,20,30&polygons=true&denoise=1&access_token=${MAPBOX_TOKEN}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Isochrone API error: ${res.status}`)
  return res.json()
}
