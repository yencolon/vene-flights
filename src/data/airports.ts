export interface Airport {
  icao: string
  iata: string
  name: string
  city: string
  lon: number
  lat: number
}

// Major commercial airports in Venezuela.
export const airports: ReadonlyArray<Airport> = [
  { icao: 'SVMI', iata: 'CCS', name: 'Simón Bolívar Intl.', city: 'Caracas (Maiquetía)', lon: -66.9912, lat: 10.6013 },
  { icao: 'SVMC', iata: 'MAR', name: 'La Chinita Intl.', city: 'Maracaibo', lon: -71.7278, lat: 10.5582 },
  { icao: 'SVVA', iata: 'VLN', name: 'Arturo Michelena Intl.', city: 'Valencia', lon: -67.9284, lat: 10.1497 },
  { icao: 'SVBM', iata: 'BRM', name: 'Jacinto Lara Intl.', city: 'Barquisimeto', lon: -69.3585, lat: 10.0427 },
  { icao: 'SVBC', iata: 'BLA', name: 'Gral. José Antonio Anzoátegui Intl.', city: 'Barcelona', lon: -64.6892, lat: 10.1071 },
  { icao: 'SVMG', iata: 'PMV', name: 'Santiago Mariño Intl.', city: 'Porlamar (Margarita)', lon: -63.9665, lat: 10.9100 },
  { icao: 'SVMT', iata: 'MUN', name: 'José Tadeo Monagas Intl.', city: 'Maturín', lon: -63.1473, lat: 9.7549 },
  { icao: 'SVPR', iata: 'PZO', name: 'Manuel Carlos Piar Intl.', city: 'Puerto Ordaz', lon: -62.7603, lat: 8.2885 },
  { icao: 'SVMD', iata: 'MRD', name: 'Alberto Carnevalli', city: 'Mérida', lon: -71.1611, lat: 8.5824 },
  { icao: 'SVSA', iata: 'SVZ', name: 'Juan Vicente Gómez Intl.', city: 'San Antonio del Táchira', lon: -72.4396, lat: 7.8408 },
  { icao: 'SVCR', iata: 'CZE', name: 'José Leonardo Chirino', city: 'Coro', lon: -69.6810, lat: 11.4149 },
  { icao: 'SVJC', iata: 'LSP', name: 'Josefa Camejo Intl.', city: 'Las Piedras (Paraguaná)', lon: -70.1514, lat: 11.7808 },
  { icao: 'SVCB', iata: 'CBL', name: 'Tomás de Heres', city: 'Ciudad Bolívar', lon: -63.5369, lat: 8.1222 },
  { icao: 'SVCU', iata: 'CUM', name: 'Antonio José de Sucre', city: 'Cumaná', lon: -64.1304, lat: 10.4503 },
  { icao: 'SVPA', iata: 'PYH', name: 'Cacique Aramare', city: 'Puerto Ayacucho', lon: -67.6061, lat: 5.6200 },
  { icao: 'SVBI', iata: 'BNS', name: 'Barinas', city: 'Barinas', lon: -70.2202, lat: 8.6195 },
  { icao: 'SVCN', iata: 'CAJ', name: 'Canaima', city: 'Canaima', lon: -62.8544, lat: 6.2319 },
  { icao: 'SVVG', iata: 'VIG', name: 'El Vigía', city: 'El Vigía', lon: -71.6728, lat: 8.6240 },
  { icao: 'SVLF', iata: 'LFR', name: 'La Fría', city: 'La Fría', lon: -72.2710, lat: 8.2391 },
  { icao: 'SVRS', iata: 'LRV', name: 'Los Roques', city: 'Los Roques', lon: -66.6755, lat: 11.7501 },
  { icao: 'SVSZ', iata: 'SBB', name: 'Miguel Urdaneta Fernández', city: 'Santa Bárbara del Zulia', lon: -71.9522, lat: 8.9745 },
  { icao: 'SVSO', iata: 'STD', name: 'Mayor Buenaventura Vivas', city: 'Santo Domingo del Táchira', lon: -70.7714, lat: 7.5694 },
  { icao: 'SVVL', iata: 'VLV', name: 'Dr. Antonio Nicolás Briceño', city: 'Valera', lon: -70.5841, lat: 9.3409 },
]
