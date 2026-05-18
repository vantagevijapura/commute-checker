import { MAPBOX_TOKEN } from './config.js'
import { trackMapbox } from './tokens.js'

let debounceTimer = null
let activeIndex = -1
let suggestions = []
let onSelectCallback = null

export function initAutocomplete(inputEl, onSelect) {
  onSelectCallback = onSelect

  const dropdown = document.createElement('div')
  dropdown.id = 'autocomplete-dropdown'
  dropdown.className = 'autocomplete-dropdown'
  inputEl.parentElement.style.position = 'relative'
  inputEl.parentElement.appendChild(dropdown)

  inputEl.addEventListener('input', () => {
    clearTimeout(debounceTimer)
    const q = inputEl.value.trim()
    if (q.length < 3) { close(dropdown); return }
    debounceTimer = setTimeout(() => fetchSuggestions(q, dropdown, inputEl), 250)
  })

  inputEl.addEventListener('keydown', e => {
    if (!dropdown.children.length) return
    if (e.key === 'ArrowDown') { e.preventDefault(); moveTo(dropdown, activeIndex + 1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); moveTo(dropdown, activeIndex - 1) }
    else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      select(suggestions[activeIndex], inputEl, dropdown)
    }
    else if (e.key === 'Escape') close(dropdown)
  })

  document.addEventListener('click', e => {
    if (!inputEl.contains(e.target) && !dropdown.contains(e.target)) close(dropdown)
  })
}

async function fetchSuggestions(query, dropdown, inputEl) {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`)
  url.searchParams.set('access_token', MAPBOX_TOKEN)
  url.searchParams.set('limit', '5')
  url.searchParams.set('bbox', '-74.25,40.49,-73.70,40.92')
  url.searchParams.set('types', 'address,poi,neighborhood')
  url.searchParams.set('country', 'US')

  try {
    const res = await fetch(url)
    if (!res.ok) return
    const data = await res.json()
    trackMapbox(1)
    suggestions = data.features || []
    render(suggestions, query, dropdown, inputEl)
  } catch { /* network error, silently ignore */ }
}

function render(features, query, dropdown, inputEl) {
  dropdown.innerHTML = ''
  activeIndex = -1

  if (!features.length) { close(dropdown); return }

  features.forEach((feature, i) => {
    const item = document.createElement('div')
    item.className = 'autocomplete-item'
    item.innerHTML = highlight(feature.place_name, query)
    item.addEventListener('mousedown', e => {
      e.preventDefault() // prevent input blur before select fires
      select(feature, inputEl, dropdown)
    })
    dropdown.appendChild(item)
  })

  dropdown.style.display = 'block'
}

function highlight(text, query) {
  const words = query.trim().split(/\s+/).filter(Boolean)
  let result = text
  words.forEach(word => {
    const re = new RegExp(`(${word})`, 'gi')
    result = result.replace(re, '<mark>$1</mark>')
  })
  return result
}

function moveTo(dropdown, index) {
  const items = dropdown.querySelectorAll('.autocomplete-item')
  if (!items.length) return
  activeIndex = Math.max(0, Math.min(items.length - 1, index))
  items.forEach((el, i) => el.classList.toggle('autocomplete-active', i === activeIndex))
}

function select(feature, inputEl, dropdown) {
  inputEl.value = feature.place_name
  close(dropdown)
  onSelectCallback?.(feature)
}

function close(dropdown) {
  dropdown.style.display = 'none'
  dropdown.innerHTML = ''
  activeIndex = -1
  suggestions = []
}
