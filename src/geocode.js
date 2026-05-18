import { MAPBOX_TOKEN } from './config.js'

export async function geocodeAddress(address) {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json`)
  url.searchParams.set('access_token', MAPBOX_TOKEN)
  url.searchParams.set('limit', '1')
  url.searchParams.set('bbox', '-74.25,40.49,-73.70,40.92')

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`)
  const data = await res.json()

  if (!data.features || data.features.length === 0) {
    throw new Error('Address not found. Try adding "New York, NY" to your search.')
  }

  return data.features[0].center // [lng, lat]
}

export async function geocodeAllDestinations(destinations) {
  return Promise.all(
    destinations.map(async (dest) => {
      try {
        return await geocodeAddress(dest.address)
      } catch {
        console.warn(`Could not geocode destination: ${dest.name}`)
        return null
      }
    })
  )
}
