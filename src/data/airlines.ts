// Aggregates the per-airline JSON files in ./airlines/ into a single
// FlatRoute[] matching the schema the rest of the app already speaks
// (origin/destination as "IATA City" strings).
//
// The eight source files use four different endpoint formats:
//   "CCS"                          (aeropostal, venezolana)
//   "CCS Caracas"                  (avior)
//   "Caracas"                      (estelar, laser, rutaca, turpial)
//   "Caracas (CCS), VENEZUELA"     (conviasa)
// Anything that can be resolved to an IATA we know about is kept.

import aeropostal from './airlines/aeropostal_flights.json'
import avior from './airlines/avior_flights.json'
import conviasa from './airlines/conviasa_flights.json'
import estelar from './airlines/estelar_flights.json'
import laser from './airlines/laser_flights.json'
import rutaca from './airlines/rutaca_flights.json'
import turpial from './airlines/turpial_flights.json'
import venezolana from './airlines/venezolana_flights.json'

export interface FlatRoute {
  origin: string
  destination: string
  type?: string
  weekly_frequency: number | string
  operator: string
  notes?: string
}

interface RawRoute {
  origin: string
  destination: string
  operator: string
  weekly_frequency: number | string
  type?: string
  notes?: string
}

const stripAccents = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '')

const normCity = (s: string): string =>
  stripAccents(s).toLowerCase().replace(/[\s.,]+/g, ' ').trim()

// Display name we want to show in the UI for each IATA. Keeps Spanish
// accents even though the lookup tables are accent-insensitive.
const cityForIata: Readonly<Record<string, string>> = {
  // Venezuela
  CCS: 'Caracas', MAR: 'Maracaibo', VLN: 'Valencia', BRM: 'Barquisimeto',
  BLA: 'Barcelona', PMV: 'Porlamar', MUN: 'Maturín', PZO: 'Puerto Ordaz',
  MRD: 'Mérida', SVZ: 'San Antonio del Táchira', CZE: 'Coro',
  LSP: 'Las Piedras', CBL: 'Ciudad Bolívar', CUM: 'Cumaná',
  PYH: 'Puerto Ayacucho', BNS: 'Barinas', CAJ: 'Canaima',
  VIG: 'El Vigía', LFR: 'La Fría', LRV: 'Los Roques',
  SBB: 'Santa Bárbara del Zulia', STD: 'Santo Domingo del Táchira',
  VLV: 'Valera',
  // Foreign
  BOG: 'Bogotá', MDE: 'Medellín', MAD: 'Madrid', CUR: 'Curaçao',
  BGI: 'Bridgetown', CUN: 'Cancún', HAV: 'La Habana', MGA: 'Managua',
  NLU: 'AIFA-Ciudad de México', PTY: 'Panamá', PUJ: 'Punta Cana',
  SDQ: 'Santo Domingo', SCU: 'Santiago de Cuba', POS: 'Puerto España',
  TFN: 'Tenerife', JBQ: 'La Isabela RD', VKO: 'Vnúkovo-Moscú',
  CAN: 'Guangzhou', LIS: 'Lisboa', FCN: 'Funchal', GRU: 'São Paulo',
  MIA: 'Miami', BVB: 'Boa Vista',
}

// City name (normalized: lowercased, accents stripped) -> IATA.
const cityToIata: Readonly<Record<string, string>> = {
  // Venezuela
  caracas: 'CCS', maracaibo: 'MAR', valencia: 'VLN', barquisimeto: 'BRM',
  barqusimeto: 'BRM', // typo seen in conviasa data
  barcelona: 'BLA', porlamar: 'PMV', maturin: 'MUN', 'puerto ordaz': 'PZO',
  merida: 'MRD', 'san antonio': 'SVZ', 'san antonio del tachira': 'SVZ',
  coro: 'CZE', 'las piedras': 'LSP', 'ciudad bolivar': 'CBL',
  cumana: 'CUM', 'puerto ayacucho': 'PYH', barinas: 'BNS', canaima: 'CAJ',
  'el vigia': 'VIG', 'la fria': 'LFR', 'los roques': 'LRV',
  'santa barbara del zulia': 'SBB', 'santo domingo del tachira': 'STD',
  valera: 'VLV',
  // Foreign — multiple aliases per destination
  bogota: 'BOG', medellin: 'MDE', madrid: 'MAD',
  curacao: 'CUR', curazao: 'CUR',
  bridgetown: 'BGI', cancun: 'CUN',
  habana: 'HAV', 'la habana': 'HAV',
  managua: 'MGA', 'santa lucia': 'NLU',
  panama: 'PTY', 'ciudad de panama': 'PTY',
  'punta cana': 'PUJ',
  'santo domingo': 'SDQ',
  'santiago de cuba': 'SCU',
  'puerto espana': 'POS',
  tenerife: 'TFN',
  miami: 'MIA',
}

// Endpoints we recognise but explicitly want to drop (not a real airport).
const skipNorm = new Set(['conexion posterior'])

interface Endpoint { code: string; city: string }

const parseEndpoint = (raw: string): Endpoint | null => {
  // "Caracas (CCS),VENEZUELA" or "Caracas (CCS), VENEZUELA"
  const paren = raw.match(/^\s*([^()]+?)\s*\(([A-Z]{3})\)/)
  if (paren) {
    const code = paren[2]
    return { code, city: cityForIata[code] ?? paren[1].trim() }
  }
  // "CCS Caracas" or just "CCS"
  const lead = raw.match(/^\s*([A-Z]{3})(?:\s+(.+))?\s*$/)
  if (lead) {
    const code = lead[1]
    const tail = lead[2]?.trim()
    return { code, city: cityForIata[code] ?? tail ?? code }
  }
  // Bare city
  const norm = normCity(raw)
  if (skipNorm.has(norm)) return null
  const code = cityToIata[norm]
  if (!code) return null
  return { code, city: cityForIata[code] ?? raw.trim() }
}

const normalizeOperator = (op: string): string => {
  // Strip trailing flight number / code in parentheses ("Conviasa (3702)",
  // "Laser (QL 902)"), then alias the few short forms used by the new data
  // to the longer names that already exist elsewhere.
  const stripped = op.replace(/\s*\([^)]*\)\s*$/, '').trim()
  const lc = stripped.toLowerCase()
  if (lc === 'rutaca') return 'Rutaca'
  if (lc === 'laser') return 'LASER Airlines'
  if (lc === 'avior') return 'Avior Airlines'
  return stripped
}

const allRaw: ReadonlyArray<RawRoute> = [
  ...(aeropostal as RawRoute[]),
  ...(avior as RawRoute[]),
  ...(conviasa as RawRoute[]),
  ...(estelar as RawRoute[]),
  ...(laser as RawRoute[]),
  ...(rutaca as RawRoute[]),
  ...(turpial as RawRoute[]),
  ...(venezolana as RawRoute[]),
]

export const routes: ReadonlyArray<FlatRoute> = allRaw.flatMap((r) => {
  const o = parseEndpoint(r.origin)
  const d = parseEndpoint(r.destination)
  if (!o || !d) return []
  if (o.code === d.code) return []
  const out: FlatRoute = {
    origin: `${o.code} ${o.city}`,
    destination: `${d.code} ${d.city}`,
    operator: normalizeOperator(r.operator),
    weekly_frequency: r.weekly_frequency,
  }
  if (r.type) out.type = r.type
  if (r.notes) out.notes = r.notes
  return [out]
})
