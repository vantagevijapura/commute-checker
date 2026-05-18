import './style.css'
import { initMap, clearMarkers, clearRoute, addOriginMarker, addDestinationMarker, fitMapToBounds } from './src/map.js'
import { geocodeAddress, geocodeAllDestinations } from './src/geocode.js'
import { getAllTransitTimes } from './src/transit.js'
import { calculateScore, timeColor } from './src/score.js'
import { showSkeletons, showEmptyState, renderResults, setScore, showError, hideError, setLoading } from './src/ui.js'
import { DESTINATIONS } from './src/config.js'
import { trackMapbox, trackHere, initTokenDisplay } from './src/tokens.js'
import { initAutocomplete } from './src/autocomplete.js'

initMap()
initTokenDisplay()

let destCoords = new Array(DESTINATIONS.length).fill(null)
geocodeAllDestinations(DESTINATIONS).then(coords => {
  destCoords = coords
  trackMapbox(DESTINATIONS.length)
})

const addressInput = document.getElementById('address-input')

initAutocomplete(addressInput, () => runSearch())

addressInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') runSearch()
})
document.getElementById('search-btn').addEventListener('click', runSearch)

showEmptyState()

async function runSearch() {
  const address = document.getElementById('address-input').value.trim()
  if (!address) return

  setLoading(true)
  hideError()
  showSkeletons()
  clearMarkers()
  clearRoute()
  setScore(null)

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

  const [originLng, originLat] = originCoords
  addOriginMarker(originLng, originLat, address)

  if (destCoords.every(c => c === null)) {
    destCoords = await geocodeAllDestinations(DESTINATIONS)
    trackMapbox(DESTINATIONS.length)
  }

  const results = await getAllTransitTimes(originLng, originLat, destCoords)
  trackHere(destCoords.filter(Boolean).length)

  results.forEach((result, i) => {
    if (destCoords[i]) {
      const enriched = result && !result.error
        ? { ...result, color: timeColor(result.minutes) }
        : result
      addDestinationMarker(destCoords[i][0], destCoords[i][1], DESTINATIONS[i], enriched, i)
    }
  })

  fitMapToBounds(originCoords, destCoords)
  renderResults(results, destCoords)

  const scoreData = calculateScore(results)
  setScore(scoreData)

  setLoading(false)
}
