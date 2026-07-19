import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import parseGeoraster from "georaster";
import { DATASET_INFO } from "../data/datasetInfo";
import { SOIL_VARIABLES } from "../data/soilVariables";
import { CLIMATE_VARIABLES } from "../data/climateVariables";
import { cdlUrl, etUrl } from "../utils/gcsPaths";
import { rasterToCanvas } from "../utils/rasterToCanvas";
import { fetchSoilVariable, soilToCanvas } from "../utils/soilRender";
import { fetchClimateVariable, climateToCanvas } from "../utils/climateRender";
import { ET_STOPS, CLIMATE_STOPS, stopsToCssGradient } from "../utils/colorScale";
import { SOIL_CONTINUOUS_STOPS, categoricalColorCss } from "../utils/soilRender";
import { dayOfYearIndex } from "../utils/daymetCalendar";
import Legend from "./Legend";

const ET_GRADIENT_CSS = stopsToCssGradient(ET_STOPS);
const SOIL_GRADIENT_CSS = stopsToCssGradient(SOIL_CONTINUOUS_STOPS);
const CLIMATE_GRADIENT_CSS = stopsToCssGradient(CLIMATE_STOPS);

// CDL is categorical (crop type) with ~130 possible classes, so there's no
// sensible single legend for it - only ET, soil, and climate get one.
function buildLegend(selection, result) {
  if (selection.dataType === "et") {
    return { type: "continuous", title: "ET", unit: DATASET_INFO.et.unit, min: result.min, max: result.max, gradientCss: ET_GRADIENT_CSS };
  }
  if (selection.dataType === "soil") {
    const info = SOIL_VARIABLES.find((v) => v.key === selection.variable);
    if (result.categories) {
      return {
        type: "categorical",
        title: info?.label ?? selection.variable,
        items: result.categories.map((label, code) => ({ label, color: categoricalColorCss(code) })),
      };
    }
    return { type: "continuous", title: info?.label ?? selection.variable, unit: info?.unit, min: result.min, max: result.max, gradientCss: SOIL_GRADIENT_CSS };
  }
  if (selection.dataType === "climate") {
    const info = CLIMATE_VARIABLES.find((v) => v.key === selection.variable);
    return { type: "continuous", title: info?.label ?? selection.variable, unit: info?.unit, min: result.min, max: result.max, gradientCss: CLIMATE_GRADIENT_CSS };
  }
  return null;
}

// California's extent, padded slightly. Keeps the base map focused on the
// dataset's actual coverage instead of letting users pan/zoom to the whole
// world.
const CALIFORNIA_BOUNDS = L.latLngBounds([32.0, -125.5], [42.5, -113.5]);
const CALIFORNIA_CENTER = [37.2, -119.5];
const MIN_ZOOM = 5;

export default function MapView({ selection }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const requestIdRef = useRef(0);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errorMessage, setErrorMessage] = useState("");
  const [legend, setLegend] = useState(null);

  // Map is created once and reused across selection changes.
  useEffect(() => {
    const map = L.map(containerRef.current, {
      center: CALIFORNIA_CENTER,
      zoom: 6,
      minZoom: MIN_ZOOM,
      maxBounds: CALIFORNIA_BOUNDS,
      maxBoundsViscosity: 1.0,
    });
    mapRef.current = map;

    const light = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19,
    });
    const dark = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
      maxZoom: 19,
      subdomains: "abcd",
    });
    light.addTo(map);
    L.control.layers({ Light: light, Dark: dark }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const requestId = ++requestIdRef.current;
    setStatus("loading");
    setErrorMessage("");

    // Rasterized to our own canvas and shown via a plain L.imageOverlay,
    // rather than georaster-layer-for-leaflet's tiled GridLayer: that
    // library's createTile() reliably rendered the first (CDL) load in
    // testing, but silently never fired at all for a second (ET) load (0
    // canvases created, no error, even after eliminating every other
    // variable - remounting the whole map, converting the source to a
    // proper multi-overview COG, and dropping our custom
    // pixelValuesToColorFn entirely). Root cause wasn't identified.
    // imageOverlay is simpler, well-tested Leaflet core functionality
    // instead of a third-party GridLayer subclass, and our data is small
    // enough (a few MB, already fetched in full) that rasterizing
    // client-side to one canvas is cheap. Soil (Zarr, read via zarrita)
    // follows the same canvas + imageOverlay pattern for consistency.
    async function load() {
      if (selection.dataType === "soil") {
        const result = await fetchSoilVariable(selection.county, selection.variable);
        return soilToCanvas(result);
      }

      if (selection.dataType === "climate") {
        const dayIndex = dayOfYearIndex(selection.year, selection.month, selection.day);
        const result = await fetchClimateVariable(selection.county, selection.year, selection.variable, dayIndex);
        return climateToCanvas(result);
      }

      const url = selection.dataType === "cdl"
        ? cdlUrl(selection.county, selection.year)
        : etUrl(selection.county, selection.year, selection.month);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Not available (HTTP ${response.status}). This county/year/month may not be uploaded yet.`);
      }
      const georaster = await parseGeoraster(await response.arrayBuffer());
      return rasterToCanvas(georaster, selection.dataType);
    }

    load()
      .then((result) => {
        if (requestId !== requestIdRef.current) return; // a newer selection superseded this one

        if (layerRef.current) {
          map.removeLayer(layerRef.current);
          layerRef.current = null;
        }

        const layer = L.imageOverlay(result.canvas.toDataURL(), result.bounds);
        layer.addTo(map);
        layerRef.current = layer;
        map.fitBounds(result.bounds);
        setStatus("ready");
        setLegend(buildLegend(selection, result));
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setStatus("error");
        setErrorMessage(err.message || String(err));
        setLegend(null);
      });
  }, [selection]);

  return (
    <div className="map-view">
      <div ref={containerRef} className="map-container" />
      {status === "loading" && <div className="map-overlay">Loading…</div>}
      {status === "error" && <div className="map-overlay map-overlay-error">{errorMessage}</div>}
      <Legend legend={legend} />
    </div>
  );
}
