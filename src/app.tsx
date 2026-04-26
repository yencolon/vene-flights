import { useState } from 'preact/hooks'
import { VenezuelaMap } from './components/VenezuelaMap'
import { Sidebar } from './components/Sidebar'
import './app.css'

export function App() {
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null)
  const [hiddenOperators, setHiddenOperators] = useState<Set<string>>(new Set())
  const [hiddenDests, setHiddenDests] = useState<Set<string>>(new Set())
  const [showLabels, setShowLabels] = useState(true)
  const [destQuery, setDestQuery] = useState('')

  return (
    <div id="page">
      <Sidebar
        selectedIcao={selectedIcao}
        hiddenOperators={hiddenOperators}
        setHiddenOperators={setHiddenOperators}
        hiddenDests={hiddenDests}
        setHiddenDests={setHiddenDests}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        destQuery={destQuery}
        setDestQuery={setDestQuery}
      />
      <main class="page-main">
        <header class="page-header">
          <h1>Vene Flights</h1>
          <p>
            Click an airport to see its routes. The map zooms out to fit
            international destinations.
          </p>
        </header>
        <div class="map-container">
          <VenezuelaMap
            selectedIcao={selectedIcao}
            onSelect={setSelectedIcao}
            hiddenOperators={hiddenOperators}
            hiddenDests={hiddenDests}
            showLabels={showLabels}
          />
        </div>
      </main>
    </div>
  )
}
