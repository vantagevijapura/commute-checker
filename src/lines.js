const SVG_BASE = 'https://unpkg.com/mta-subway-bullets@1.1.0/dist/svg'

const SUBWAY_LINES = new Set([
  '1','2','3','4','5','6','6d','7','7d',
  'a','b','c','d','e','f','fd','g','h',
  'j','l','m','n','q','r','s','sf','sir','sr','t','w','z',
])

// Official MTA brand colors — used for GL polyline layers
const LINE_COLORS_HEX = {
  '1': '#EE352E', '2': '#EE352E', '3': '#EE352E',
  '4': '#00933C', '5': '#00933C', '6': '#00933C',
  '7': '#B933AD',
  'A': '#2850AD', 'C': '#2850AD', 'E': '#2850AD',
  'B': '#FF6319', 'D': '#FF6319', 'F': '#FF6319', 'M': '#FF6319',
  'G': '#6CBE45',
  'J': '#996633', 'Z': '#996633',
  'L': '#A7A9AC',
  'N': '#FCCC0A', 'Q': '#FCCC0A', 'R': '#FCCC0A', 'W': '#FCCC0A',
  'S': '#808183', 'SIR': '#0078C6',
}

function normalize(name) {
  if (!name) return null
  const m = name.trim().match(/^([A-Z0-9]+)/i)
  return m ? m[1] : null
}

export function lineColorHex(name) {
  const key = normalize(name)?.toUpperCase()
  return LINE_COLORS_HEX[key] || '#888888'
}

export function subwayBullet(name, size = 20) {
  const key = normalize(name)?.toLowerCase()

  if (key && SUBWAY_LINES.has(key)) {
    return `<img class="subway-bullet-svg" src="${SVG_BASE}/${key}.svg" alt="${key.toUpperCase()}" width="${size}" height="${size}" style="vertical-align:middle">`
  }

  // CSS fallback for buses and unrecognized routes
  const label = name?.trim().slice(0, 4) || '?'
  const fontSize = Math.round(size * 0.42)
  return `<span class="subway-bullet" style="background:#555;color:#fff;width:${size}px;height:${size}px;font-size:${fontSize}px">${label}</span>`
}
