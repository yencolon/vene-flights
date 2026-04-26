import { useMemo } from "preact/hooks";
import { flightsByIcao, colorForOperator } from "../data/flights";
import { airports } from "../data/airports";

export interface SidebarProps {
  selectedIcaos: Set<string>;
  setSelectedIcaos: (next: Set<string>) => void;
  hiddenOperators: Set<string>;
  setHiddenOperators: (next: Set<string>) => void;
  hiddenDests: Set<string>;
  setHiddenDests: (next: Set<string>) => void;
  showLabels: boolean;
  setShowLabels: (next: boolean) => void;
  consolidateRoutes: boolean;
  setConsolidateRoutes: (next: boolean) => void;
  destQuery: string;
  setDestQuery: (next: string) => void;
  originQuery: string;
  setOriginQuery: (next: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({
  selectedIcaos,
  setSelectedIcaos,
  hiddenOperators,
  setHiddenOperators,
  hiddenDests,
  setHiddenDests,
  showLabels,
  setShowLabels,
  consolidateRoutes,
  setConsolidateRoutes,
  destQuery,
  setDestQuery,
  originQuery,
  setOriginQuery,
  isOpen,
  onClose,
}: SidebarProps) {
  // Combine flight data from all selected origins
  const flightData = useMemo(() => {
    if (selectedIcaos.size === 0) return undefined;
    const allOperators = new Set<string>();
    const destMap = new Map<string, { code: string; city: string }>();

    for (const icao of selectedIcaos) {
      const data = flightsByIcao[icao];
      if (!data) continue;
      for (const dest of data.destinations) {
        destMap.set(dest.airport_code, {
          code: dest.airport_code,
          city: dest.city,
        });
        for (const flight of dest.flights) {
          allOperators.add(flight.operator);
        }
      }
    }

    return {
      operators: Array.from(allOperators).sort(),
      destinations: Array.from(destMap.values()).sort((a, b) =>
        a.city.localeCompare(b.city),
      ),
    };
  }, [selectedIcaos]);

  const sortedOrigins = useMemo(() => {
    return [...airports]
      .filter((a) => flightsByIcao[a.icao])
      .sort((a, b) => a.city.localeCompare(b.city));
  }, []);

  const filteredOrigins = useMemo(() => {
    const q = originQuery.trim().toLowerCase();
    if (!q) return sortedOrigins;
    return sortedOrigins.filter(
      (a) =>
        a.city.toLowerCase().includes(q) || a.iata.toLowerCase().includes(q),
    );
  }, [sortedOrigins, originQuery]);

  const allOperators = useMemo(() => {
    return flightData?.operators ?? [];
  }, [flightData]);

  const allDests = useMemo(() => {
    return flightData?.destinations ?? [];
  }, [flightData]);

  const filteredDests = useMemo(() => {
    const q = destQuery.trim().toLowerCase();
    if (!q) return allDests;
    return allDests.filter(
      (d) =>
        d.city.toLowerCase().includes(q) || d.code.toLowerCase().includes(q),
    );
  }, [allDests, destQuery]);

  const toggleOrigin = (icao: string) => {
    const next = new Set(selectedIcaos);
    if (next.has(icao)) next.delete(icao);
    else next.add(icao);
    setSelectedIcaos(next);
  };

  const toggleOperator = (op: string) => {
    const next = new Set(hiddenOperators);
    if (next.has(op)) next.delete(op);
    else next.add(op);
    setHiddenOperators(next);
  };

  const toggleDest = (code: string) => {
    const next = new Set(hiddenDests);
    if (next.has(code)) next.delete(code);
    else next.add(code);
    setHiddenDests(next);
  };

  const totalHidden = hiddenOperators.size + hiddenDests.size;

  return (
    <aside
      class={`
        ${isOpen ? "fixed inset-0 z-[100] flex" : "hidden md:flex"}
        md:relative md:z-auto
        w-full md:w-80 h-full md:h-screen overflow-y-auto shrink-0 border-t md:border-t-0 md:border-r flex-col gap-3.5 p-4 md:p-4
      `}
      style="background: var(--bg); border-color: var(--border)"
      role="region"
      aria-label="Filters"
    >
      <div class="flex items-baseline justify-between gap-2">
        <h3
          class="text-xl md:text-sm font-semibold m-0"
          style="color: var(--text-h)"
        >
          Filters
        </h3>
        <div class="flex items-baseline gap-4">
          {totalHidden > 0 && (
            <button
              type="button"
              class="bg-transparent border-0 p-1 text-sm md:text-xs cursor-pointer hover:underline"
              style="color: var(--accent)"
              onClick={() => {
                setHiddenOperators(new Set());
                setHiddenDests(new Set());
              }}
            >
              Reset
            </button>
          )}
          <button
            type="button"
            class="md:hidden bg-transparent border-0 p-1 text-sm font-semibold cursor-pointer"
            style="color: var(--text-h)"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>

      <label
        class="flex items-center gap-3 md:gap-2 py-2 md:py-0 text-base md:text-sm cursor-pointer"
        style="color: var(--text-h)"
      >
        <input
          type="checkbox"
          checked={showLabels}
          class="cursor-pointer w-5 h-5 md:w-3.5 md:h-3.5"
          onChange={(e) =>
            setShowLabels((e.currentTarget as HTMLInputElement).checked)
          }
        />
        <span>Show city names</span>
      </label>

      <label
        class="flex items-center gap-3 md:gap-2 py-2 md:py-0 text-base md:text-sm cursor-pointer"
        style="color: var(--text-h)"
      >
        <input
          type="checkbox"
          checked={consolidateRoutes}
          class="cursor-pointer w-5 h-5 md:w-3.5 md:h-3.5"
          onChange={(e) =>
            setConsolidateRoutes((e.currentTarget as HTMLInputElement).checked)
          }
        />
        <span>Consolidate routes</span>
      </label>

      <div class="flex flex-col gap-1.5">
        <div class="flex items-baseline justify-between gap-2">
          <h4
            class="text-xs font-semibold m-0 uppercase tracking-wide"
            style="color: var(--text)"
          >
            Origin Airports
          </h4>
          {selectedIcaos.size > 0 && (
            <button
              type="button"
              class="bg-transparent border-0 p-0 text-xs cursor-pointer hover:underline"
              style="color: var(--accent)"
              onClick={() => setSelectedIcaos(new Set())}
            >
              Clear
            </button>
          )}
        </div>
        <input
          type="search"
          class="w-full box-border text-sm rounded px-2 py-1.5 mb-1 border"
          style="color: var(--text-h); background: var(--code-bg); border-color: var(--border)"
          placeholder="Search city or IATA…"
          value={originQuery}
          onInput={(e) =>
            setOriginQuery((e.currentTarget as HTMLInputElement).value)
          }
        />
        {filteredOrigins.length === 0 ? (
          <p class="m-0 text-xs" style="color: var(--text)">
            No matches for "{originQuery}".
          </p>
        ) : (
          <ul class="list-none m-0 p-0 flex flex-col gap-1 md:gap-0">
            {filteredOrigins.map((a) => (
              <li key={a.icao}>
                <label
                  class="flex items-center gap-3 md:gap-2 py-2 md:py-1 text-base md:text-sm cursor-pointer leading-tight"
                  style="color: var(--text-h)"
                >
                  <input
                    type="checkbox"
                    class="cursor-pointer shrink-0 w-5 h-5 md:w-3.5 md:h-3.5"
                    checked={selectedIcaos.has(a.icao)}
                    onChange={() => toggleOrigin(a.icao)}
                  />
                  <span>{a.city}</span>
                  <span
                    class="ml-auto text-sm md:text-xs font-mono"
                    style="color: var(--text)"
                  >
                    {a.iata}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {flightData && allOperators.length > 0 && (
        <div class="flex flex-col gap-1.5">
          <div class="flex items-baseline justify-between gap-2">
            <h4
              class="text-xs font-semibold m-0 uppercase tracking-wide"
              style="color: var(--text)"
            >
              Airlines
            </h4>
            {hiddenOperators.size > 0 && (
              <button
                type="button"
                class="bg-transparent border-0 p-0 text-xs cursor-pointer hover:underline"
                style="color: var(--accent)"
                onClick={() => setHiddenOperators(new Set())}
              >
                Show all
              </button>
            )}
          </div>
          <ul class="list-none m-0 p-0 flex flex-col gap-1">
            {allOperators.map((op) => (
              <li key={op}>
                <label
                  class="flex items-center gap-3 md:gap-2 py-2 md:py-1 text-base md:text-sm cursor-pointer leading-tight"
                  style="color: var(--text-h)"
                >
                  <input
                    type="checkbox"
                    class="cursor-pointer shrink-0 w-5 h-5 md:w-3.5 md:h-3.5"
                    checked={!hiddenOperators.has(op)}
                    onChange={() => toggleOperator(op)}
                  />
                  <span
                    class="w-3.5 h-3.5 md:w-2.5 md:h-2.5 rounded-full shrink-0"
                    style={{ background: colorForOperator(op) }}
                    aria-hidden="true"
                  />
                  <span>{op}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {flightData && allDests.length > 0 && (
        <div class="flex flex-col gap-1.5">
          <div class="flex items-baseline justify-between gap-2">
            <h4
              class="text-xs font-semibold m-0 uppercase tracking-wide"
              style="color: var(--text)"
            >
              Destinations
            </h4>
            {hiddenDests.size > 0 && (
              <button
                type="button"
                class="bg-transparent border-0 p-0 text-xs cursor-pointer hover:underline"
                style="color: var(--accent)"
                onClick={() => setHiddenDests(new Set())}
              >
                Show all
              </button>
            )}
          </div>
          <input
            type="search"
            class="w-full box-border text-sm rounded px-2 py-1.5 mb-1 border"
            style="color: var(--text-h); background: var(--code-bg); border-color: var(--border)"
            placeholder="Search city or IATA…"
            value={destQuery}
            onInput={(e) =>
              setDestQuery((e.currentTarget as HTMLInputElement).value)
            }
          />
          {filteredDests.length === 0 ? (
            <p class="m-0 text-xs" style="color: var(--text)">
              No matches for "{destQuery}".
            </p>
          ) : (
            <ul class="list-none m-0 p-0 flex flex-col gap-1 md:gap-0">
              {filteredDests.map((d) => (
                <li key={d.code}>
                  <label
                    class="flex items-center gap-3 md:gap-2 py-2 md:py-1 text-base md:text-sm cursor-pointer leading-tight"
                    style="color: var(--text-h)"
                  >
                    <input
                      type="checkbox"
                      class="cursor-pointer shrink-0 w-5 h-5 md:w-3.5 md:h-3.5"
                      checked={!hiddenDests.has(d.code)}
                      onChange={() => toggleDest(d.code)}
                    />
                    <span>{d.city}</span>
                    <span
                      class="ml-auto text-sm md:text-xs font-mono"
                      style="color: var(--text)"
                    >
                      {d.code}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}
