// Coordinates for destination airports referenced from flight data.
// Keyed by the `airport_code` field (IATA) used in src/data/flights/*.json.
// Add a new entry whenever you add a new destination to flight data.
import { airports } from './airports'

export interface DestCoord {
  lon: number
  lat: number
  country: string
}

const foreignCoords: Record<string, DestCoord> = {
  MAD: { lon: -3.5676, lat: 40.4983, country: 'Spain' },
  TFN: { lon: -16.3415, lat: 28.4827, country: 'Spain' },
  CUR: { lon: -68.9598, lat: 12.1889, country: 'Curaçao' },
  BOG: { lon: -74.1469, lat: 4.7016, country: 'Colombia' },
  MDE: { lon: -75.4231, lat: 6.1645, country: 'Colombia' },
  SDQ: { lon: -69.6689, lat: 18.4297, country: 'Dominican Republic' },
  JBQ: { lon: -69.9856, lat: 18.5725, country: 'Dominican Republic' },
  PUJ: { lon: -68.3634, lat: 18.5675, country: 'Dominican Republic' },
  POS: { lon: -61.3372, lat: 10.5953, country: 'Trinidad and Tobago' },
  VKO: { lon: 37.2615, lat: 55.5915, country: 'Russia' },
  CUN: { lon: -86.8771, lat: 21.0365, country: 'Mexico' },
  NLU: { lon: -99.0157, lat: 19.7372, country: 'Mexico' },
  BGI: { lon: -59.4925, lat: 13.0746, country: 'Barbados' },
  HAV: { lon: -82.4091, lat: 22.9892, country: 'Cuba' },
  CAN: { lon: 113.2988, lat: 23.3924, country: 'China' },
  MGA: { lon: -86.1682, lat: 12.1414, country: 'Nicaragua' },
  LIS: { lon: -9.1359, lat: 38.7813, country: 'Portugal' },
  // Note: source data uses "FCN" but the real IATA for Funchal is FNC. Keyed
  // here under FCN to match the data; coords are Madeira's airport.
  FCN: { lon: -16.7745, lat: 32.6979, country: 'Portugal' },
  GRU: { lon: -46.4731, lat: -23.4356, country: 'Brazil' },
  PTY: { lon: -79.3835, lat: 9.0714, country: 'Panama' },
  MIA: { lon: -80.2870, lat: 25.7959, country: 'United States' },
  BVB: { lon: -60.6906, lat: 2.8419, country: 'Brazil' },
  SCU: { lon: -75.8354, lat: 19.9698, country: 'Cuba' },
}

const venezuelanCoords: Record<string, DestCoord> = Object.fromEntries(
  airports.map((a) => [a.iata, { lon: a.lon, lat: a.lat, country: 'Venezuela' }]),
)

// Foreign destinations win on conflict (none today, but future-proof).
export const destinationCoords: Readonly<Record<string, DestCoord>> = {
  ...venezuelanCoords,
  ...foreignCoords,
}
