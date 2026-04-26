import { useMemo } from 'preact/hooks'
import { flightsByIcao, colorForOperator } from '../data/flights'
import './sidebar.css'

export interface SidebarProps {
  selectedIcao: string | null
  hiddenOperators: Set<string>
  setHiddenOperators: (next: Set<string>) => void
  hiddenDests: Set<string>
  setHiddenDests: (next: Set<string>) => void
  showLabels: boolean
  setShowLabels: (next: boolean) => void
  destQuery: string
  setDestQuery: (next: string) => void
}

export function Sidebar({
  selectedIcao,
  hiddenOperators,
  setHiddenOperators,
  hiddenDests,
  setHiddenDests,
  showLabels,
  setShowLabels,
  destQuery,
  setDestQuery,
}: SidebarProps) {
  const flightData = selectedIcao ? flightsByIcao[selectedIcao] : undefined

  const allOperators = useMemo(() => {
    if (!flightData) return [] as string[]
    const set = new Set<string>()
    for (const d of flightData.destinations) for (const l of d.flights) set.add(l.operator)
    return [...set].sort()
  }, [flightData])

  const allDests = useMemo(() => {
    if (!flightData) return [] as ReadonlyArray<{ code: string; city: string }>
    return [...flightData.destinations]
      .map((d) => ({ code: d.airport_code, city: d.city }))
      .sort((a, b) => a.city.localeCompare(b.city))
  }, [flightData])

  const filteredDests = useMemo(() => {
    const q = destQuery.trim().toLowerCase()
    if (!q) return allDests
    return allDests.filter(
      (d) => d.city.toLowerCase().includes(q) || d.code.toLowerCase().includes(q),
    )
  }, [allDests, destQuery])

  const toggleOperator = (op: string) => {
    const next = new Set(hiddenOperators)
    if (next.has(op)) next.delete(op)
    else next.add(op)
    setHiddenOperators(next)
  }

  const toggleDest = (code: string) => {
    const next = new Set(hiddenDests)
    if (next.has(code)) next.delete(code)
    else next.add(code)
    setHiddenDests(next)
  }

  const totalHidden = hiddenOperators.size + hiddenDests.size

  return (
    <aside class="sidebar" role="region" aria-label="Filters">
      <div class="sidebar-header">
        <h3>Filters</h3>
        {totalHidden > 0 && (
          <button
            type="button"
            class="sidebar-clear"
            onClick={() => {
              setHiddenOperators(new Set())
              setHiddenDests(new Set())
            }}
          >
            Reset
          </button>
        )}
      </div>

      <label class="sidebar-toggle">
        <input
          type="checkbox"
          checked={showLabels}
          onChange={(e) => setShowLabels((e.currentTarget as HTMLInputElement).checked)}
        />
        <span>Show city names</span>
      </label>

      {flightData && allOperators.length > 0 && (
        <div class="sidebar-section">
          <div class="sidebar-section-head">
            <h4>Airlines</h4>
            {hiddenOperators.size > 0 && (
              <button
                type="button"
                class="sidebar-clear"
                onClick={() => setHiddenOperators(new Set())}
              >
                Show all
              </button>
            )}
          </div>
          <ul class="sidebar-list">
            {allOperators.map((op) => (
              <li key={op}>
                <label>
                  <input
                    type="checkbox"
                    checked={!hiddenOperators.has(op)}
                    onChange={() => toggleOperator(op)}
                  />
                  <span
                    class="sidebar-swatch"
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
        <div class="sidebar-section">
          <div class="sidebar-section-head">
            <h4>Destinations</h4>
            {hiddenDests.size > 0 && (
              <button
                type="button"
                class="sidebar-clear"
                onClick={() => setHiddenDests(new Set())}
              >
                Show all
              </button>
            )}
          </div>
          <input
            type="search"
            class="sidebar-search"
            placeholder="Search city or IATA…"
            value={destQuery}
            onInput={(e) => setDestQuery((e.currentTarget as HTMLInputElement).value)}
          />
          {filteredDests.length === 0 ? (
            <p class="sidebar-empty">No matches for “{destQuery}”.</p>
          ) : (
            <ul class="sidebar-list">
              {filteredDests.map((d) => (
                <li key={d.code}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!hiddenDests.has(d.code)}
                      onChange={() => toggleDest(d.code)}
                    />
                    <span>{d.city}</span>
                    <span class="sidebar-iata">{d.code}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!flightData && (
        <p class="sidebar-empty">
          Select an airport to filter its airlines and destinations.
        </p>
      )}
    </aside>
  )
}
