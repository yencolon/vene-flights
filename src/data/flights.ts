// Note: ./flights.json is intentionally retained for archival use, but the
// app now sources routes from ./airlines.ts (the per-airline JSONs in
// ./airlines/). Repoint the import to bring back the old dataset.
import { routes as combinedRoutes, type FlatRoute } from './airlines'
import { airports } from './airports'

export interface FlightLeg {
  operator: string
  // Usually a number; some routes use codes like "01Q" (e.g. Conviasa Moscow).
  weekly_frequency: number | string
  notes?: string
}

export interface Destination {
  city: string
  airport_code: string
  flights: FlightLeg[]
}

export interface AirportFlights {
  airport: string
  title: string
  statistics: {
    total_weekly_flights: number
    flights_to_start: number
  }
  destinations: Destination[]
}

const venezuelanIataToIcao: Readonly<Record<string, string>> = Object.fromEntries(
  airports.map((a) => [a.iata, a.icao]),
)

const splitCode = (s: string): { code: string; city: string } => {
  const idx = s.indexOf(' ')
  return idx === -1
    ? { code: s, city: s }
    : { code: s.slice(0, idx), city: s.slice(idx + 1) }
}

// Tiny normalization for variants of the same airline so colors and HUD pills
// don't fragment ("RUTACA"/"Rutaca", "AirCentury"/"Air Century", etc.).
const normalizeOperator = (op: string): string => {
  const t = op.trim()
  if (t.toLowerCase() === 'rutaca') return 'Rutaca'
  if (t === 'AirCentury') return 'Air Century'
  if (t.startsWith('Envoy Air')) return 'Envoy Air'
  return t
}

const buildNotes = (r: FlatRoute): string | undefined => {
  const parts: string[] = []
  if (r.type && r.type !== 'Regular') parts.push(r.type)
  if (r.notes) parts.push(r.notes)
  return parts.length ? parts.join(' · ') : undefined
}

const flatRoutes: ReadonlyArray<FlatRoute> = combinedRoutes.map((r) => ({
  ...r,
  operator: normalizeOperator(r.operator),
}))

const aggregate = (): Record<string, AirportFlights> => {
  const out: Record<string, AirportFlights> = {}
  for (const route of flatRoutes) {
    const o = splitCode(route.origin)
    const d = splitCode(route.destination)
    let venIcao: string | undefined
    let foreign: { code: string; city: string }
    if (venezuelanIataToIcao[o.code]) {
      venIcao = venezuelanIataToIcao[o.code]
      foreign = d
    } else if (venezuelanIataToIcao[d.code]) {
      venIcao = venezuelanIataToIcao[d.code]
      foreign = o
    } else {
      continue
    }
    const airport = (out[venIcao] ??= {
      airport: venIcao,
      title: '',
      statistics: { total_weekly_flights: 0, flights_to_start: 0 },
      destinations: [],
    })
    let dest = airport.destinations.find((x) => x.airport_code === foreign.code)
    if (!dest) {
      dest = { city: foreign.city, airport_code: foreign.code, flights: [] }
      airport.destinations.push(dest)
    }
    dest.flights.push({
      operator: route.operator,
      weekly_frequency: route.weekly_frequency,
      notes: buildNotes(route),
    })
  }
  for (const a of Object.values(out)) {
    let total = 0
    let toStart = 0
    for (const dest of a.destinations) {
      for (const leg of dest.flights) {
        if (typeof leg.weekly_frequency === 'number') total += leg.weekly_frequency
        if (leg.notes && /Inicia|Espera autorización/i.test(leg.notes)) toStart += 1
      }
    }
    a.statistics = { total_weekly_flights: total, flights_to_start: toStart }
  }
  return out
}

export const flightsByIcao: Readonly<Record<string, AirportFlights>> = aggregate()

// ---------- Operator colors ----------
// Stable hue per operator via golden-angle spacing. Sorted alphabetically so
// adding new operators doesn't reshuffle the existing palette.

const allOperators: string[] = (() => {
  const set = new Set<string>()
  for (const af of Object.values(flightsByIcao)) {
    for (const d of af.destinations) {
      for (const leg of d.flights) set.add(leg.operator)
    }
  }
  return [...set].sort()
})()

const operatorIndex = new Map(allOperators.map((op, i) => [op, i]))

export const operators: ReadonlyArray<string> = allOperators

export const colorForOperator = (op: string): string => {
  const i = operatorIndex.get(op) ?? 0
  const h = (i * 137.508) % 360
  return `hsl(${h.toFixed(1)}, 70%, 55%)`
}
