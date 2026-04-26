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
  const [consolidateRoutes, setConsolidateRoutes] = useState(true);
  const [destQuery, setDestQuery] = useState("");
  const [originQuery, setOriginQuery] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div class="flex flex-col md:flex-row h-screen w-screen overflow-hidden">
      <Sidebar
        selectedIcaos={selectedIcaos}
        setSelectedIcaos={setSelectedIcaos}
        hiddenOperators={hiddenOperators}
        setHiddenOperators={setHiddenOperators}
        hiddenDests={hiddenDests}
        setHiddenDests={setHiddenDests}
        showLabels={showLabels}
        setShowLabels={setShowLabels}
        consolidateRoutes={consolidateRoutes}
        setConsolidateRoutes={setConsolidateRoutes}
        destQuery={destQuery}
        setDestQuery={setDestQuery}
        originQuery={originQuery}
        setOriginQuery={setOriginQuery}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      <main class="flex-1 flex flex-col relative min-h-0">
        <header class="shrink-0 text-center py-3 md:py-6 px-4 relative">
          <h1
            class="text-2xl md:text-4xl font-medium mb-1 md:mb-2"
            style="color: var(--text-h)"
          >
            Vene Flights
          </h1>
          <p
            class="text-xs md:text-base text-balance mx-auto max-w-[80%]"
            style="color: var(--text)"
          >
            Click an airport to see its routes. The map zooms out to fit
            international destinations.
          </p>
          <button
            class="md:hidden absolute top-4 right-4 bg-transparent border px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer z-10 shadow-sm"
            style="color: var(--text-h); border-color: var(--border); background: var(--code-bg);"
            onClick={() => setIsSidebarOpen(true)}
          >
            Filters
          </button>
        </header>
        <div class="flex-1 flex items-center justify-center relative overflow-hidden">
          <VenezuelaMap
            selectedIcaos={selectedIcaos}
            setSelectedIcaos={setSelectedIcaos}
            hiddenOperators={hiddenOperators}
            hiddenDests={hiddenDests}
            showLabels={showLabels}
            consolidateRoutes={consolidateRoutes}
          />
        </div>
      </main>
    </div>
  );
}
