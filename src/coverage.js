import { HERE_KEY, DEPARTURE_TIME } from './config.js'

const BATCH_SIZE = 8

// ~49 curated probe points across all 5 boroughs — on land, transit-accessible
const NYC_PROBE_POINTS = [
  // Manhattan — north to south
  { lat: 40.8679, lng: -73.9283 }, // Inwood
  { lat: 40.8448, lng: -73.9348 }, // Washington Heights
  { lat: 40.8204, lng: -73.9490 }, // Harlem
  { lat: 40.8000, lng: -73.9526 }, // Upper Manhattan
  { lat: 40.7831, lng: -73.9712 }, // Upper West Side
  { lat: 40.7736, lng: -73.9566 }, // Upper East Side
  { lat: 40.7580, lng: -73.9855 }, // Midtown West
  { lat: 40.7549, lng: -73.9700 }, // Midtown East
  { lat: 40.7282, lng: -74.0076 }, // West Village
  { lat: 40.7209, lng: -73.9981 }, // Lower East Side
  { lat: 40.7074, lng: -74.0113 }, // Financial District
  // Brooklyn — northwest to southeast
  { lat: 40.6959, lng: -73.9990 }, // Brooklyn Heights
  { lat: 40.6782, lng: -73.9442 }, // Crown Heights
  { lat: 40.6501, lng: -73.9496 }, // Flatbush
  { lat: 40.6892, lng: -73.9820 }, // Park Slope
  { lat: 40.7081, lng: -73.9571 }, // Williamsburg
  { lat: 40.6826, lng: -74.0060 }, // Red Hook
  { lat: 40.6630, lng: -73.9796 }, // Kensington
  { lat: 40.6350, lng: -74.0140 }, // Bay Ridge
  { lat: 40.6250, lng: -73.9630 }, // Bensonhurst
  { lat: 40.6081, lng: -73.9571 }, // Borough Park / Gravesend
  { lat: 40.5900, lng: -73.9430 }, // Coney Island
  { lat: 40.6680, lng: -73.8890 }, // East New York / Brownsville
  { lat: 40.6370, lng: -73.8720 }, // Canarsie
  // Queens — northwest to southeast
  { lat: 40.7282, lng: -73.9498 }, // Long Island City
  { lat: 40.7440, lng: -73.9235 }, // Astoria
  { lat: 40.7614, lng: -73.9776 }, // Jackson Heights
  { lat: 40.7282, lng: -73.8766 }, // Elmhurst / Forest Hills
  { lat: 40.7580, lng: -73.8301 }, // Flushing
  { lat: 40.7143, lng: -73.8310 }, // Jamaica
  { lat: 40.6974, lng: -73.8071 }, // Far Rockaway area
  { lat: 40.7650, lng: -73.9048 }, // Corona
  { lat: 40.7395, lng: -73.8963 }, // Woodside / Maspeth
  // Bronx — south to north
  { lat: 40.8080, lng: -73.9272 }, // South Bronx / Mott Haven
  { lat: 40.8284, lng: -73.9184 }, // Morrisania
  { lat: 40.8501, lng: -73.8662 }, // Fordham
  { lat: 40.8676, lng: -73.8827 }, // Bedford Park / Norwood
  { lat: 40.8793, lng: -73.8491 }, // Pelham Parkway
  { lat: 40.9001, lng: -73.8602 }, // Wakefield / Co-op City
  { lat: 40.8448, lng: -73.9298 }, // Highbridge
  { lat: 40.8620, lng: -73.9078 }, // Tremont
  // Staten Island — north to south
  { lat: 40.6430, lng: -74.0776 }, // St. George
  { lat: 40.6080, lng: -74.1020 }, // New Brighton / Stapleton
  { lat: 40.5730, lng: -74.1140 }, // Eltingville
  { lat: 40.5400, lng: -74.1760 }, // Tottenville
  { lat: 40.6040, lng: -74.1480 }, // New Springville
  // Additional Manhattan / crosstown points
  { lat: 40.7128, lng: -74.0059 }, // Tribeca
  { lat: 40.7193, lng: -73.9435 }, // Bushwick / Ridgewood border
]

function generateGrid() {
  return NYC_PROBE_POINTS
}

async function fetchTransitMinutes(originLat, originLng, destLat, destLng) {
  const params = new URLSearchParams({
    apiKey: HERE_KEY,
    origin: `${originLat},${originLng}`,
    destination: `${destLat},${destLng}`,
    departureTime: DEPARTURE_TIME,
    return: 'travelSummary',
  })
  try {
    const res = await fetch(`/here-transit/v8/routes?${params}`)
    if (!res.ok) return null
    const data = await res.json()
    const route = data.routes?.[0]
    if (!route) return null
    const secs = route.sections.reduce((s, sec) => s + (sec.travelSummary?.duration ?? 0), 0)
    return Math.round(secs / 60)
  } catch {
    return null
  }
}

export async function runCoverageScan(originLat, originLng, onBatch) {
  const grid = generateGrid()
  const results = []

  for (let i = 0; i < grid.length; i += BATCH_SIZE) {
    const batch = grid.slice(i, i + BATCH_SIZE)
    const batchResults = await Promise.all(
      batch.map(async pt => ({
        ...pt,
        minutes: await fetchTransitMinutes(originLat, originLng, pt.lat, pt.lng),
      }))
    )
    results.push(...batchResults)
    if (onBatch) onBatch(results)
  }

  return results
}
