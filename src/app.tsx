import { useState } from "preact/hooks";
import { VenezuelaMap } from "./components/VenezuelaMap";
import { Sidebar } from "./components/Sidebar";

export function App() {
  const [selectedIcaos, setSelectedIcaos] = useState<Set<string>>(new Set());
  const [hiddenOperators, setHiddenOperators] = useState<Set<string>>(
    new Set(),
  );
  const [hiddenDests, setHiddenDests] = useState<Set<string>>(new Set());
  const [showLabels, setShowLabels] = useState(true);
  const [destQuery, setDestQuery] = useState("");
  const [originQuery, setOriginQuery] = useState("");

  return (
    <div class="flex h-screen w-screen overflow-hidden">
      <Sidebar
        selectedIcaos={selectedIcaos}
        setSelectedIcaos={setSelectedIcaos}
        hiddenOperators={hiddenOperators}
        setHiddenOperators={setHiddenOperators}
        hiddenDests={hiddenDests}
        setHiddenDests={setHiddenDests}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        destQuery={destQuery}
        setDestQuery={setDestQuery}
        originQuery={originQuery}
        setOriginQuery={setOriginQuery}
      />
      <main class="flex-1 flex flex-col">
        <header class="shrink-0 text-center py-6 px-4">
          <h1 class="text-4xl font-medium mb-2" style="color: var(--text-h)">
            Vene Flights
          </h1>
          <p class="text-base" style="color: var(--text)">
            Click an airport to see its routes. The map zooms out to fit
            international destinations.
          </p>
        </header>
        <div class="flex-1 flex items-center justify-center relative overflow-hidden">
          <VenezuelaMap
            selectedIcaos={selectedIcaos}
            setSelectedIcaos={setSelectedIcaos}
            hiddenOperators={hiddenOperators}
            hiddenDests={hiddenDests}
            showLabels={showLabels}
          />
        </div>
      </main>
    </div>
  );
}
