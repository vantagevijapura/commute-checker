import { HERE_KEY, DEPARTURE_TIME } from './config.js'

export async function getTransitTime(originLat, originLng, destLat, destLng) {
  const params = new URLSearchParams({
    apiKey: HERE_KEY,
    origin: `${originLat},${originLng}`,
    destination: `${destLat},${destLng}`,
    departureTime: DEPARTURE_TIME,
    return: 'travelSummary,intermediate,polyline',
    alternatives: '2',
  })

  const res = await fetch(`/here-transit/v8/routes?${params}`)

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`HERE API ${res.status}: ${body}`)
  }

  const data = await res.json()

  if (!data.routes || data.routes.length === 0) {
    throw new Error('No transit route found')
  }

  // Parse the best route (index 0) for timing, walk, polyline, and transfers
  const { minutes, walkMinutes, transfers, modes, routeSections } = parseSections(data.routes[0].sections)

  // Collect unique line names across ALL alternatives so we surface e.g. "2 3" not just "3"
  const linesSeen = new Set()
  const lines = []

  for (const route of data.routes) {
    for (const section of route.sections) {
      if (section.type !== 'transit') continue
      const name = section.transport?.name
      const mode = section.transport?.mode
      const stops = (section.intermediateStops?.length ?? 0) + 1
      if (name && !linesSeen.has(name)) {
        linesSeen.add(name)
        lines.push({ name, mode, stops })
      }
    }
  }

  return { minutes, walkMinutes, transfers, modes, lines, routeSections }
}

function parseSections(sections) {
  let totalSeconds = 0
  let walkSeconds = 0
  let transitSections = 0
  const modes = []
  const routeSections = []

  for (const section of sections) {
    const duration = section.travelSummary?.duration || 0
    totalSeconds += duration

    if (section.type === 'transit') {
      transitSections++
      const mode = section.transport?.mode
      const name = section.transport?.name
      if (mode && !modes.includes(mode)) modes.push(mode)
      routeSections.push({ type: 'transit', lineName: name, mode, polyline: section.polyline })
    } else if (section.type === 'pedestrian') {
      walkSeconds += duration
      routeSections.push({ type: 'walk', polyline: section.polyline, minutes: Math.round(duration / 60) })
    }
  }

  return {
    minutes: Math.round(totalSeconds / 60),
    walkMinutes: Math.round(walkSeconds / 60),
    transfers: Math.max(0, transitSections - 1),
    modes,
    routeSections,
  }
}

export async function getAllTransitTimes(originLng, originLat, destCoords) {
  return Promise.all(
    destCoords.map(async (coords) => {
      if (!coords) return { error: 'Destination coordinates unavailable' }
      try {
        return await getTransitTime(originLat, originLng, coords[1], coords[0])
      } catch (e) {
        return { error: e.message }
      }
    })
  )
}
