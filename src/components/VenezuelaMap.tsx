import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "preact/hooks";
import venezuelaGeo from "../data/venezuela.geo.json";
import { airports } from "../data/airports";
import {
  flightsByIcao,
  colorForOperator,
  type FlightLeg,
} from "../data/flights";
import { destinationCoords } from "../data/destination-coords";
import "./venezuela-map.css";

// ---------- GeoJSON normalization ----------

type LonLat = readonly [number, number];
type Ring = ReadonlyArray<LonLat>;
type Polygon = ReadonlyArray<Ring>;

interface GeoFeature {
  geometry?: { type: "Polygon" | "MultiPolygon"; coordinates: unknown } | null;
}
interface GeoFeatureCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

const toPolygons = (geom: GeoFeature["geometry"]): Polygon[] => {
  if (!geom) return [];
  if (geom.type === "Polygon") return [geom.coordinates as unknown as Polygon];
  if (geom.type === "MultiPolygon")
    return geom.coordinates as unknown as Polygon[];
  return [];
};

const venezuelaPolygons = toPolygons(
  venezuelaGeo.geometry as GeoFeature["geometry"],
);

// ---------- Orthographic projection ----------

const VIEW = 1000;
const CX = VIEW / 2;
const CY = VIEW / 2;
const DEG = Math.PI / 180;

interface ProjectedPoint {
  x: number;
  y: number;
  visible: boolean;
}

interface Projector {
  R: number;
  isGlobe: boolean;
  project: (lon: number, lat: number) => ProjectedPoint;
}

const makeOrthographic = (
  center: LonLat,
  R: number,
  isGlobe: boolean,
): Projector => {
  const lam0 = center[0] * DEG;
  const phi0 = center[1] * DEG;
  const sinP0 = Math.sin(phi0);
  const cosP0 = Math.cos(phi0);
  const project = (lon: number, lat: number): ProjectedPoint => {
    const phi = lat * DEG;
    const sinP = Math.sin(phi);
    const cosP = Math.cos(phi);
    const dlam = lon * DEG - lam0;
    const cosc = sinP0 * sinP + cosP0 * cosP * Math.cos(dlam);
    const x = R * cosP * Math.sin(dlam);
    const y = R * (cosP0 * sinP - sinP0 * cosP * Math.cos(dlam));
    return { x: CX + x, y: CY - y, visible: cosc >= 0 };
  };
  return { R, isGlobe, project };
};

const angularDist = (a: LonLat, b: LonLat): number => {
  const phiA = a[1] * DEG,
    phiB = b[1] * DEG;
  const dlam = (b[0] - a[0]) * DEG;
  const cosc =
    Math.sin(phiA) * Math.sin(phiB) +
    Math.cos(phiA) * Math.cos(phiB) * Math.cos(dlam);
  return Math.acos(Math.max(-1, Math.min(1, cosc)));
};

// Choose R so the furthest of `points` from `center` falls at ~84% of the
// disc radius. If everything reaches more than 90° away, we're on the back
// hemisphere — fall back to full-globe scale.
const computeScale = (
  center: LonLat,
  points: ReadonlyArray<LonLat>,
): { R: number; isGlobe: boolean } => {
  let dmax = 0;
  for (const p of points) {
    const d = angularDist(center, p);
    if (d > dmax) dmax = d;
  }
  const padded = dmax + 0.17; // ~10° padding
  if (padded >= Math.PI / 2) {
    return { R: 0.43 * VIEW, isGlobe: true };
  }
  const fitR = (0.42 * VIEW) / Math.sin(padded);
  return { R: Math.min(fitR, 60 * VIEW), isGlobe: false };
};

const venezuelaCenter: LonLat = (() => {
  let minLon = Infinity,
    maxLon = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const poly of venezuelaPolygons) {
    for (const [lon, lat] of poly[0]) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [(minLon + maxLon) / 2, (minLat + maxLat) / 2];
})();

const venezuelaCorners: LonLat[] = (() => {
  let minLon = Infinity,
    maxLon = -Infinity,
    minLat = Infinity,
    maxLat = -Infinity;
  for (const poly of venezuelaPolygons) {
    for (const [lon, lat] of poly[0]) {
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [
    [minLon, minLat],
    [maxLon, minLat],
    [minLon, maxLat],
    [maxLon, maxLat],
  ];
})();

// ---------- Path builders ----------

// Ring assumed fully on the visible hemisphere (used for Venezuela, which is
// always fully in view from any of its own airports).
const ringToClosedPath = (ring: Ring, project: Projector["project"]) => {
  let d = "";
  for (let i = 0; i < ring.length; i++) {
    const p = project(ring[i][0], ring[i][1]);
    d += `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  return d + " Z";
};

// Gap-skip: drop back-of-globe vertices and break the subpath there. Used for
// world borders (stroked, not filled) so countries crossing the horizon look
// right without a real horizon-clipping algorithm.
const ringToOpenPath = (ring: Ring, project: Projector["project"]) => {
  let d = "";
  let pen = false;
  for (const [lon, lat] of ring) {
    const p = project(lon, lat);
    if (p.visible) {
      d += `${pen ? "L" : "M"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      pen = true;
    } else {
      pen = false;
    }
  }
  return d;
};

const polygonsToClosedPath = (
  polys: ReadonlyArray<Polygon>,
  project: Projector["project"],
) =>
  polys
    .flatMap((poly) => poly.map((ring) => ringToClosedPath(ring, project)))
    .join(" ");

const polygonsToOpenPath = (
  polys: ReadonlyArray<Polygon>,
  project: Projector["project"],
) =>
  polys
    .flatMap((poly) => poly.map((ring) => ringToOpenPath(ring, project)))
    .join(" ");

// Sample a great-circle arc, project it, and return one polyline per
// front-hemisphere segment (so the back-of-globe portion is dropped).
// Each point carries `t` in [0, 1] along the full great circle so callers
// can taper offsets at the endpoints.
type Pt = { x: number; y: number; t: number };
const greatCircleSegments = (
  p1: LonLat,
  p2: LonLat,
  project: Projector["project"],
  n: number = 96,
): Pt[][] => {
  const phi1 = p1[1] * DEG,
    lam1 = p1[0] * DEG;
  const phi2 = p2[1] * DEG,
    lam2 = p2[0] * DEG;
  const v1: [number, number, number] = [
    Math.cos(phi1) * Math.cos(lam1),
    Math.cos(phi1) * Math.sin(lam1),
    Math.sin(phi1),
  ];
  const v2: [number, number, number] = [
    Math.cos(phi2) * Math.cos(lam2),
    Math.cos(phi2) * Math.sin(lam2),
    Math.sin(phi2),
  ];
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
  const omega = Math.acos(Math.max(-1, Math.min(1, dot)));
  if (omega < 1e-6) return [];
  const sinO = Math.sin(omega);
  const segments: Pt[][] = [];
  let cur: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = Math.sin((1 - t) * omega) / sinO;
    const b = Math.sin(t * omega) / sinO;
    const vx = a * v1[0] + b * v2[0];
    const vy = a * v1[1] + b * v2[1];
    const vz = a * v1[2] + b * v2[2];
    const lon = Math.atan2(vy, vx) / DEG;
    const lat = Math.asin(Math.max(-1, Math.min(1, vz))) / DEG;
    const p = project(lon, lat);
    if (p.visible) {
      cur.push({ x: p.x, y: p.y, t });
    } else if (cur.length >= 2) {
      segments.push(cur);
      cur = [];
    } else {
      cur = [];
    }
  }
  if (cur.length >= 2) segments.push(cur);
  return segments;
};

// Build an SVG path for one or more polyline segments, optionally offset
// perpendicular to the local tangent. Offset is tapered with a sinusoidal
// envelope (zero at the great-circle endpoints, full at the midpoint), so
// parallel routes for different operators converge at the airport dots
// and fan out in between.
const segmentsToPath = (segments: Pt[][], offset: number): string => {
  let d = "";
  for (const seg of segments) {
    const m = seg.length;
    if (m < 2) continue;
    for (let i = 0; i < m; i++) {
      let x = seg[i].x,
        y = seg[i].y;
      if (offset !== 0) {
        const off = offset * Math.sin(Math.PI * seg[i].t);
        let nx = 0,
          ny = 0;
        if (i > 0) {
          const dx = seg[i].x - seg[i - 1].x;
          const dy = seg[i].y - seg[i - 1].y;
          const len = Math.hypot(dx, dy) || 1;
          nx += -dy / len;
          ny += dx / len;
        }
        if (i < m - 1) {
          const dx = seg[i + 1].x - seg[i].x;
          const dy = seg[i + 1].y - seg[i].y;
          const len = Math.hypot(dx, dy) || 1;
          nx += -dy / len;
          ny += dx / len;
        }
        const nlen = Math.hypot(nx, ny) || 1;
        x += (off * nx) / nlen;
        y += (off * ny) / nlen;
      }
      d += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
  }
  return d;
};

const numericFreq = (f: FlightLeg["weekly_frequency"]) =>
  typeof f === "number" ? f : 0;
const formatFrequency = (f: FlightLeg["weekly_frequency"]) => {
  if (typeof f === "number") return f === 0 ? "Pending" : `${f}×/wk`;
  return f;
};

// ---------- Component ----------

interface Props {
  selectedIcaos: ReadonlySet<string>;
  setSelectedIcaos: (icaos: Set<string>) => void;
  hiddenOperators: ReadonlySet<string>;
  hiddenDests: ReadonlySet<string>;
  showLabels: boolean;
  consolidateRoutes: boolean;
}

export function VenezuelaMap({
  selectedIcaos,
  setSelectedIcaos,
  hiddenOperators,
  hiddenDests,
  showLabels,
  consolidateRoutes,
}: Props) {
  const [hoveredAirportIcao, setHoveredAirportIcao] = useState<string | null>(
    null,
  );
  const [hoveredDestCode, setHoveredDestCode] = useState<string | null>(null);
  const [selectedDestCode, setSelectedDestCode] = useState<string | null>(null);
  const [worldData, setWorldData] = useState<GeoFeatureCollection | null>(null);
  const [rotation, setRotation] = useState<[number, number]>([0, 0]);
  // Zoom is layered on top of the projection as an SVG transform on the map
  // contents (s = scale, x/y = translate in viewBox units). Anchored at the
  // cursor on wheel, around the SVG center for the +/- buttons.
  const [zoomXform, setZoomXform] = useState({ s: 1, x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    baseLon: number;
    baseLat: number;
    baseZoomX: number;
    baseZoomY: number;
    pointerId: number;
    moved: boolean;
    isGlobeMode: boolean;
  } | null>(null);

  useLayoutEffect(() => {
    setSelectedDestCode(null);
    setHoveredDestCode(null);
    setRotation([0, 0]);
    const primaryIcao =
      selectedIcaos.size > 0 ? Array.from(selectedIcaos)[0] : null;
    if (!primaryIcao) {
      setZoomXform({ s: 1, x: 0, y: 0 });
      return;
    }
    const airport = airports.find((a) => a.icao === primaryIcao);
    const fd = flightsByIcao[primaryIcao];
    if (!airport || !fd) {
      setZoomXform({ s: 1, x: 0, y: 0 });
      return;
    }
    // Re-derive the projector at the freshly-reset rotation so the bbox we
    // measure matches what the next render will draw.
    const baseCenter: LonLat = [airport.lon, airport.lat];
    const points: LonLat[] = [baseCenter];
    let hasInternational = false;
    for (const dest of fd.destinations) {
      const c = destinationCoords[dest.airport_code];
      if (!c) continue;
      points.push([c.lon, c.lat]);
      if (c.country !== "Venezuela") hasInternational = true;
    }
    const { R, isGlobe } = hasInternational
      ? { R: 0.43 * VIEW, isGlobe: true }
      : computeScale(baseCenter, points);
    const proj = makeOrthographic(baseCenter, R, isGlobe);
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    const visit = (lon: number, lat: number) => {
      const p = proj.project(lon, lat);
      if (!p.visible) return;
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    };
    visit(airport.lon, airport.lat);
    for (const [lon, lat] of points) visit(lon, lat);
    if (!Number.isFinite(minX)) {
      setZoomXform({ s: 1, x: 0, y: 0 });
      return;
    }
    const bw = Math.max(40, maxX - minX);
    const bh = Math.max(40, maxY - minY);
    const target = 0.82 * VIEW;
    const s = Math.max(1, Math.min(8, target / Math.max(bw, bh)));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    setZoomXform({ s, x: CX - s * cx, y: CY - s * cy });
  }, [selectedIcaos]);

  const applyZoom = (factor: number, anchorX: number, anchorY: number) => {
    setZoomXform((v) => {
      const ns = Math.max(1, Math.min(20, v.s * factor));
      if (ns === v.s) return v;
      // Keep (anchorX, anchorY) stationary in viewBox space.
      const wx = (anchorX - v.x) / v.s;
      const wy = (anchorY - v.y) / v.s;
      return { s: ns, x: anchorX - ns * wx, y: anchorY - ns * wy };
    });
  };

  // Wheel listener attached imperatively so we can call preventDefault()
  // (Preact's onWheel is passive in some browsers).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      const scale = VIEW / rect.width;
      const cx = (e.clientX - rect.left) * scale;
      const cy = (e.clientY - rect.top) * scale;
      // Smooth multiplicative zoom; trackpads send small deltas, mice large ones.
      const factor = Math.exp(-e.deltaY * 0.0015);
      applyZoom(factor, cx, cy);
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, []);

  useEffect(() => {
    if (selectedDestCode === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDestCode(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedDestCode]);

  const toggleDest = (code: string) =>
    setSelectedDestCode((prev) => (prev === code ? null : code));

  const selectedAirport = useMemo(() => {
    const primaryIcao =
      selectedIcaos.size > 0 ? Array.from(selectedIcaos)[0] : null;
    return primaryIcao
      ? (airports.find((a) => a.icao === primaryIcao) ?? null)
      : null;
  }, [selectedIcaos]);

  // Combine flight data from all selected airports
  const combinedFlightData = useMemo(() => {
    if (selectedIcaos.size === 0) return undefined;

    const destMap = new Map<
      string,
      {
        city: string;
        airport_code: string;
        flights: FlightLeg[];
        origins: Set<string>; // Track which airports fly here
      }
    >();

    let totalFlights = 0;
    let flightsToStart = 0;

    for (const icao of selectedIcaos) {
      const data = flightsByIcao[icao];
      if (!data) continue;

      for (const dest of data.destinations) {
        let entry = destMap.get(dest.airport_code);
        if (!entry) {
          entry = {
            city: dest.city,
            airport_code: dest.airport_code,
            flights: [],
            origins: new Set(),
          };
          destMap.set(dest.airport_code, entry);
        }
        entry.origins.add(icao);
        entry.flights.push(...dest.flights);
      }

      totalFlights += data.statistics.total_weekly_flights;
      flightsToStart += data.statistics.flights_to_start;
    }

    return {
      destinations: Array.from(destMap.values()).map(
        ({ origins, ...rest }) => rest,
      ),
      statistics: {
        total_weekly_flights: totalFlights,
        flights_to_start: flightsToStart,
      },
      destOrigins: destMap, // Keep the origin mapping for rendering
    };
  }, [selectedIcaos]);

  const flightData = combinedFlightData;
  const willShowGlobe = !!flightData;

  useEffect(() => {
    if (!willShowGlobe || worldData) return;
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}world-110m.geojson`)
      .then((r) => r.json() as Promise<GeoFeatureCollection>)
      .then((d) => {
        if (!cancelled) setWorldData(d);
      })
      .catch((e) => console.error("Failed to load world map", e));
    return () => {
      cancelled = true;
    };
  }, [willShowGlobe, worldData]);

  const projector = useMemo<Projector>(() => {
    if (selectedAirport && flightData) {
      const baseCenter: LonLat = [selectedAirport.lon, selectedAirport.lat];
      const points: LonLat[] = [baseCenter];
      let hasInternational = false;
      for (const dest of flightData.destinations) {
        const c = destinationCoords[dest.airport_code];
        if (!c) continue;
        points.push([c.lon, c.lat]);
        if (c.country !== "Venezuela") hasInternational = true;
      }
      // We always use the same globe projection R for international routes
      // so there is no visual jump when crossing zoom levels.
      // But we will use zoom scale to determine drag behavior (rotate vs pan).
      const isGlobe = hasInternational;
      const { R } = hasInternational
        ? { R: 0.43 * VIEW }
        : computeScale(baseCenter, points);
      const rawLat = baseCenter[1] + rotation[1];
      const center: LonLat = [
        baseCenter[0] + rotation[0],
        Math.max(-85, Math.min(85, rawLat)),
      ];
      return makeOrthographic(center, R, isGlobe);
    }
    const { R, isGlobe } = computeScale(venezuelaCenter, venezuelaCorners);
    return makeOrthographic(venezuelaCenter, R, isGlobe);
  }, [selectedAirport, flightData, rotation, zoomXform.s]);

  const venezuelaPath = useMemo(
    () =>
      projector.isGlobe
        ? polygonsToOpenPath(venezuelaPolygons, projector.project)
        : polygonsToClosedPath(venezuelaPolygons, projector.project),
    [projector],
  );

  const worldPath = useMemo(() => {
    if (!worldData) return "";
    return worldData.features
      .map((f) => polygonsToOpenPath(toPolygons(f.geometry), projector.project))
      .join(" ");
  }, [worldData, projector]);

  // Apply user filters: drop hidden destinations entirely, then drop hidden
  // operator legs from the surviving destinations. A destination with no
  // remaining legs disappears too. Stats are recomputed from the filtered set
  // so the HUD numbers stay honest.
  const filteredFlightData = useMemo(() => {
    if (!flightData) return undefined;
    const destinations = flightData.destinations
      .filter((d) => !hiddenDests.has(d.airport_code))
      .map((d) => ({
        ...d,
        flights: d.flights.filter((l) => !hiddenOperators.has(l.operator)),
      }))
      .filter((d) => d.flights.length > 0);
    let total = 0;
    let toStart = 0;
    for (const d of destinations) {
      for (const leg of d.flights) {
        if (typeof leg.weekly_frequency === "number")
          total += leg.weekly_frequency;
        if (leg.notes && /Inicia|Espera autorización/i.test(leg.notes))
          toStart += 1;
      }
    }
    return {
      ...flightData,
      destinations,
      statistics: { total_weekly_flights: total, flights_to_start: toStart },
    };
  }, [flightData, hiddenOperators, hiddenDests]);

  const activeDestCode = selectedDestCode ?? hoveredDestCode;
  const activeDest =
    filteredFlightData?.destinations.find(
      (d) => d.airport_code === activeDestCode,
    ) ?? null;

  // Marker dots/labels live outside the zoom transform; they shrink with
  // sqrt(zoom) so they don't dominate the view at high magnification.
  const dotScale = 1 / Math.sqrt(zoomXform.s);

  // In globe view the Venezuelan airports cluster into a few pixels — only
  // render the selected ones to keep things readable.
  const visibleAirports = projector.isGlobe
    ? airports.filter((a) => selectedIcaos.has(a.icao))
    : airports;

  return (
    <figure class="map-figure">
      <div class="map-container relative flex-1 flex flex-col items-center justify-center w-full h-full overflow-hidden">
        {selectedIcaos.size > 0 && (
          <button
            type="button"
            class="map-back-btn"
            onClick={() => {
              setSelectedIcaos(new Set());
              setHoveredDestCode(null);
            }}
          >
            ← Clear Selection
          </button>
        )}

        <div class="map-zoom-controls" role="group" aria-label="Zoom">
          <button
            type="button"
            class="map-zoom-btn"
            aria-label="Zoom in"
            onClick={() => applyZoom(1.4, CX, CY)}
          >
            +
          </button>
          <button
            type="button"
            class="map-zoom-btn"
            aria-label="Zoom out"
            onClick={() => applyZoom(1 / 1.4, CX, CY)}
          >
            −
          </button>
          <button
            type="button"
            class="map-zoom-btn"
            aria-label="Reset zoom"
            disabled={
              zoomXform.s === 1 && zoomXform.x === 0 && zoomXform.y === 0
            }
            onClick={() => setZoomXform({ s: 1, x: 0, y: 0 })}
          >
            ⌂
          </button>
        </div>

        <svg
          ref={svgRef}
          class={`venezuela-map${projector.isGlobe ? " is-globe" : ""}`}
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          role="img"
          aria-label={
            selectedIcaos.size > 0
              ? `Routes from ${selectedIcaos.size} selected airport${selectedIcaos.size > 1 ? "s" : ""}`
              : "Map of Venezuela showing major airports"
          }
          onClick={() => setSelectedDestCode(null)}
        >
          <defs>
            <clipPath id="globe-clip">
              <circle
                cx={CX}
                cy={CY}
                r={projector.R}
                transform={`translate(${zoomXform.x} ${zoomXform.y}) scale(${zoomXform.s})`}
              />
            </clipPath>
          </defs>

          <rect
            x={0}
            y={0}
            width={VIEW}
            height={VIEW}
            class="drag-bg"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragRef.current = {
                x: e.clientX,
                y: e.clientY,
                baseLon: rotation[0],
                baseLat: rotation[1],
                baseZoomX: zoomXform.x,
                baseZoomY: zoomXform.y,
                pointerId: e.pointerId,
                moved: false,
                isGlobeMode: projector.isGlobe && zoomXform.s < 2.5,
              };
            }}
            onPointerMove={(e) => {
              const drag = dragRef.current;
              if (!drag) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const scale = VIEW / rect.width;
              const dx = (e.clientX - drag.x) * scale;
              const dy = (e.clientY - drag.y) * scale;
              if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;

              if (drag.isGlobeMode) {
                // Globe mode: rotate the projection
                const degPerPx = 180 / Math.PI / projector.R / zoomXform.s;
                const baseLat = selectedAirport?.lat ?? 0;
                let newLon = drag.baseLon - dx * degPerPx;
                let newLatOffset = drag.baseLat + dy * degPerPx;
                const clampedLat = Math.max(
                  -85,
                  Math.min(85, baseLat + newLatOffset),
                );
                newLatOffset = clampedLat - baseLat;
                newLon = ((newLon + 540) % 360) - 180;
                setRotation([newLon, newLatOffset]);
              } else {
                // Flat mode: pan by adjusting zoom transform
                setZoomXform({
                  s: zoomXform.s,
                  x: drag.baseZoomX + dx,
                  y: drag.baseZoomY + dy,
                });
              }
            }}
            onPointerUp={(e) => {
              const drag = dragRef.current;
              if (!drag) return;
              if (e.currentTarget.hasPointerCapture(drag.pointerId)) {
                e.currentTarget.releasePointerCapture(drag.pointerId);
              }
              if (drag.moved) {
                const suppress = (ev: MouseEvent) => {
                  ev.stopPropagation();
                  window.removeEventListener("click", suppress, true);
                };
                window.addEventListener("click", suppress, true);
              }
              dragRef.current = null;
            }}
            onPointerCancel={(e) => {
              const drag = dragRef.current;
              if (!drag) return;
              if (e.currentTarget.hasPointerCapture(drag.pointerId)) {
                e.currentTarget.releasePointerCapture(drag.pointerId);
              }
              dragRef.current = null;
            }}
          />

          <g clip-path="url(#globe-clip)">
            <g
              transform={`translate(${zoomXform.x} ${zoomXform.y}) scale(${zoomXform.s})`}
            >
              {worldPath && <path d={worldPath} class="world-country" />}
              <path d={venezuelaPath} class="country" fill-rule="evenodd" />

              {/* Draw routes from each selected airport */}
              {Array.from(selectedIcaos).flatMap((icao) => {
                const airport = airports.find((a) => a.icao === icao);
                if (!airport) return [];
                const airportData = flightsByIcao[icao];
                if (!airportData) return [];

                const filteredDests = airportData.destinations
                  .filter((d) => !hiddenDests.has(d.airport_code))
                  .map((d) => ({
                    ...d,
                    flights: d.flights.filter(
                      (l) => !hiddenOperators.has(l.operator),
                    ),
                  }))
                  .filter((d) => d.flights.length > 0);

                return filteredDests.map((dest) => {
                  const c = destinationCoords[dest.airport_code];
                  if (!c) return null;
                  const isActive = activeDestCode === dest.airport_code;
                  const isDimmed = activeDestCode !== null && !isActive;
                  const isSelected = selectedDestCode === dest.airport_code;
                  const segments = greatCircleSegments(
                    [airport.lon, airport.lat],
                    [c.lon, c.lat],
                    projector.project,
                  );
                  const cls = ["route-group"];
                  if (isActive) cls.push("is-active");
                  if (isDimmed) cls.push("is-dimmed");
                  if (isSelected) cls.push("is-selected");
                  // Aggregate legs by operator so that e.g. Avior's many
                  // effectivity-date entries draw one thicker line, while
                  // distinct airlines stay on their own parallel tracks.
                  const opTotals = new Map<string, number>();
                  for (const leg of dest.flights) {
                    const prev = opTotals.get(leg.operator) ?? 0;
                    opTotals.set(
                      leg.operator,
                      prev + numericFreq(leg.weekly_frequency),
                    );
                  }
                  const opEntries = [...opTotals.entries()];
                  let displayEntries = opEntries;
                  if (consolidateRoutes && opEntries.length > 1) {
                    // Primary color from operator with most flights
                    const mainOp = opEntries.reduce((a, b) =>
                      a[1] > b[1] ? a : b,
                    )[0];
                    const totalFreq = opEntries.reduce(
                      (sum, curr) => sum + curr[1],
                      0,
                    );
                    displayEntries = [[mainOp, totalFreq]];
                  }
                  const n = displayEntries.length;
                  // Spacing between parallel lines, in user-space coords. Capped
                  // total spread keeps wide bundles from overflowing the map.
                  const spacing = n > 1 ? Math.min(5, 36 / (n - 1)) : 0;
                  const baseD = segmentsToPath(segments, 0);
                  const hitWidth = Math.max(14, (n - 1) * spacing + 14);
                  return (
                    <g
                      key={`route-${icao}-${dest.airport_code}`}
                      class={cls.join(" ")}
                      tabIndex={0}
                      role="button"
                      aria-label={`Route from ${airport.city} to ${dest.city}`}
                      aria-pressed={isSelected}
                      onMouseEnter={() => setHoveredDestCode(dest.airport_code)}
                      onMouseLeave={() => setHoveredDestCode(null)}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleDest(dest.airport_code);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleDest(dest.airport_code);
                        }
                      }}
                    >
                      <path
                        d={baseD}
                        class="route-hit"
                        style={`stroke-width: ${hitWidth}px`}
                      />
                      {displayEntries.map(([operator, total], li) => {
                        const lw = Math.max(
                          1.6,
                          Math.min(4.5, 1.4 + total / 5),
                        );
                        const offset = (li - (n - 1) / 2) * spacing;
                        return (
                          <path
                            key={operator}
                            d={segmentsToPath(segments, offset)}
                            class="route"
                            stroke={colorForOperator(operator)}
                            strokeWidth={isActive ? lw * 1.5 : lw}
                          />
                        );
                      })}
                    </g>
                  );
                });
              })}
            </g>

            {/* Markers render outside the zoom transform but inside the clip
              so dot radii stay constant — and shrink as zoom increases.
              dotScale (1/sqrt(zoom)) is published as the --m CSS var so
              hover/selected states can stay proportional to the base size. */}
            {filteredFlightData &&
              filteredFlightData.destinations.map((dest) => {
                const c = destinationCoords[dest.airport_code];
                if (!c) return null;
                const raw = projector.project(c.lon, c.lat);
                if (!raw.visible) return null;
                const px = zoomXform.s * raw.x + zoomXform.x;
                const py = zoomXform.s * raw.y + zoomXform.y;
                const isActive = activeDestCode === dest.airport_code;
                const isSelected = selectedDestCode === dest.airport_code;
                const cls = ["destination-marker"];
                if (isActive) cls.push("is-hovered");
                if (isSelected) cls.push("is-selected");
                return (
                  <g
                    key={`dest-${dest.airport_code}`}
                    class={cls.join(" ")}
                    style={`--m: ${dotScale}`}
                    onMouseEnter={() => setHoveredDestCode(dest.airport_code)}
                    onMouseLeave={() => setHoveredDestCode(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDest(dest.airport_code);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        toggleDest(dest.airport_code);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-pressed={isSelected}
                    aria-label={`${dest.city} (${dest.airport_code})`}
                  >
                    <circle cx={px} cy={py} r={8} class="destination-hit" />
                    <circle cx={px} cy={py} class="destination-dot" />
                    {(showLabels || isActive) && (
                      <text
                        x={px + 7 * dotScale}
                        y={py - 6 * dotScale}
                        class="destination-label"
                      >
                        {dest.city}
                      </text>
                    )}
                  </g>
                );
              })}

            {visibleAirports.map((airport) => {
              const raw = projector.project(airport.lon, airport.lat);
              if (!raw.visible) return null;
              const px = zoomXform.s * raw.x + zoomXform.x;
              const py = zoomXform.s * raw.y + zoomXform.y;
              const isHovered = hoveredAirportIcao === airport.icao;
              const isSelected = selectedIcaos.has(airport.icao);
              const showLabel = isHovered || (isSelected && !flightData);
              const cls = ["airport"];
              if (isHovered) cls.push("is-hovered");
              if (isSelected) cls.push("is-selected");
              return (
                <g
                  key={airport.icao}
                  class={cls.join(" ")}
                  style={`--m: ${dotScale}`}
                  onMouseEnter={() => setHoveredAirportIcao(airport.icao)}
                  onMouseLeave={() => setHoveredAirportIcao(null)}
                  onFocus={() => setHoveredAirportIcao(airport.icao)}
                  onBlur={() => setHoveredAirportIcao(null)}
                  onClick={() => {
                    const next = new Set(selectedIcaos);
                    if (next.has(airport.icao)) next.delete(airport.icao);
                    else next.add(airport.icao);
                    setSelectedIcaos(next);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const next = new Set(selectedIcaos);
                      if (next.has(airport.icao)) next.delete(airport.icao);
                      else next.add(airport.icao);
                      setSelectedIcaos(next);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSelected}
                  aria-label={`${airport.name}, ${airport.city}`}
                >
                  <circle cx={px} cy={py} r={6} class="airport-hit" />
                  <circle cx={px} cy={py} class="airport-dot" />
                  {showLabel && (
                    <text
                      x={px + 10 * dotScale}
                      y={py - 8 * dotScale}
                      class="airport-label"
                    >
                      {airport.name} — {airport.city}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {selectedAirport && (
        <div class="map-hud" aria-live="polite">
          {activeDest ? (
            <>
              <div class="hud-title">
                <span>{activeDest.city}</span>
                <span class="iata-pill">{activeDest.airport_code}</span>
              </div>
              {selectedDestCode === activeDest.airport_code && (
                <p class="hud-hint">
                  Selected — click again or press Esc to clear.
                </p>
              )}
              <ul class="hud-legs">
                {activeDest.flights.map((leg, i) => (
                  <li key={i}>
                    <div class="hud-leg-row">
                      <span class="hud-operator">
                        <span
                          class="hud-operator-color"
                          style={{ background: colorForOperator(leg.operator) }}
                          aria-hidden="true"
                        />
                        {leg.operator}
                      </span>
                      <span class="hud-freq">
                        {formatFrequency(leg.weekly_frequency)}
                      </span>
                    </div>
                    {leg.notes && <div class="hud-notes">{leg.notes}</div>}
                  </li>
                ))}
              </ul>
            </>
          ) : filteredFlightData ? (
            <>
              <div class="hud-title">
                <span>{selectedAirport.name}</span>
                <span class="iata-pill">{selectedAirport.iata}</span>
              </div>
              <div class="hud-stats">
                <div>
                  <strong>
                    {filteredFlightData.statistics.total_weekly_flights}
                  </strong>
                  <span>weekly flights</span>
                </div>
                <div>
                  <strong>{filteredFlightData.destinations.length}</strong>
                  <span>destinations</span>
                </div>
                <div>
                  <strong>
                    {filteredFlightData.statistics.flights_to_start}
                  </strong>
                  <span>upcoming</span>
                </div>
              </div>

              <div class="hud-all-destinations mt-4 flex flex-col gap-4 overflow-y-auto">
                {filteredFlightData.destinations.map((dest) => (
                  <div
                    key={dest.airport_code}
                    class="border-t border-dashed pt-3"
                    style="border-color: var(--border);"
                  >
                    <div class="hud-title text-sm mb-2 justify-start gap-2">
                      <span>{dest.city}</span>
                      <span class="iata-pill">{dest.airport_code}</span>
                    </div>
                    <ul class="hud-legs">
                      {dest.flights.map((leg, i) => (
                        <li key={i}>
                          <div class="hud-leg-row">
                            <span class="hud-operator">
                              <span
                                class="hud-operator-color"
                                style={{
                                  background: colorForOperator(leg.operator),
                                }}
                                aria-hidden="true"
                              />
                              {leg.operator}
                            </span>
                            <span class="hud-freq">
                              {formatFrequency(leg.weekly_frequency)}
                            </span>
                          </div>
                          {leg.notes && (
                            <div class="hud-notes">{leg.notes}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div class="hud-title">{selectedAirport.name}</div>
              <p class="hud-hint">
                No flight data available yet for this airport.
              </p>
            </>
          )}
        </div>
      )}
    </figure>
  );
}
