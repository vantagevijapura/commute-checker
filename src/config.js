export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN
export const HERE_KEY = import.meta.env.VITE_HERE_KEY
export const HOWLOUD_KEY = 'hT2hJGfRIJ3uZyFGVFfAL3jzETYRJaaK4yeePomy'

export const DESTINATIONS = [
  { id: 1,  name: 'Penn Station',       address: '1 Pennsylvania Plaza, New York, NY 10119',        color: '#ff6b35', category: 'work'   },
  { id: 2,  name: 'Union Square',       address: 'Union Square, New York, NY',                      color: '#f5c518', category: 'park'   },
  { id: 3,  name: '1322 2nd Ave',       address: '1322 2nd Ave, New York, NY 10021',                color: '#a78bfa', category: 'social' },
  { id: 4,  name: '33 Bond St, BK',     address: '33 Bond St, Brooklyn, NY 11201',                  color: '#34d399', category: 'social' },
  { id: 5,  name: '774 Lafayette, BK',  address: '774 Lafayette Ave, Brooklyn, NY 11221',           color: '#60a5fa', category: 'social' },
  { id: 6,  name: 'Grand Central',      address: '89 E 42nd St, New York, NY 10017',                color: '#f472b6', category: 'work'   },
  { id: 7,  name: '9 W 31st St',        address: '9 W 31st St, New York, NY 10001',                 color: '#fb923c', category: 'social' },
  { id: 8,  name: '61 Bergen St, BK',   address: '61 Bergen St, Brooklyn, NY 11201',                color: '#4ade80', category: 'social' },
  { id: 9,  name: 'Bryant Park',        address: '1095 6th Ave, New York, NY 10036',                color: '#86efac', category: 'park'   },
  { id: 10, name: '113 St Marks Pl',    address: '113 St Marks Pl, New York, NY 10009',             color: '#fda4af', category: 'social' },
  { id: 11, name: 'Washington Sq Park', address: '52 Washington Square S, New York, NY 10012',      color: '#6ee7b7', category: 'park'   },
  { id: 12, name: '175 Greenwich St',   address: '175 Greenwich St, New York, NY 10007',            color: '#93c5fd', category: 'work'   },
]

// Fixed departure: next weekday Monday at 9:30 AM ET
export const DEPARTURE_TIME = (() => {
  const d = new Date()
  const day = d.getDay()
  const daysToMonday = day === 0 ? 1 : day === 1 ? 7 : 8 - day
  d.setDate(d.getDate() + daysToMonday)
  d.setHours(9, 30, 0, 0)
  return d.toISOString().slice(0, 19) + '-05:00'
})()
