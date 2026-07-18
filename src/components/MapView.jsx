import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import parseGeoraster from "georaster";
import { DATASET_INFO } from "../data/datasetInfo";
import { SOIL_VARIABLES } from "../data/soilVariables";
import { cdlUrl, etUrl } from "../utils/gcsPaths";
import { rasterToCanvas } from "../utils/rasterToCanvas";
import { fetchSoilVariable, soilToCanvas } from "../utils/soilRender";

// CDL is categorical (crop type), so it has no physical unit to show.
function unitFor(selection) {
  if (selection.dataType === "et") return DATASET_INFO.et.unit ?? null;
  if (selection.dataType === "soil") {
    return SOIL_VARIABLES.find((v) => v.key === selection.variable)?.unit ?? null;
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
  const unitControlRef = useRef(null);
  const requestIdRef = useRef(0);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errorMessage, setErrorMessage] = useState("");

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

    const unitControl = L.control({ position: "bottomleft" });
    unitControl.onAdd = () => L.DomUtil.create("div", "unit-control");
    unitControl.addTo(map);
    unitControlRef.current = unitControl;

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
      .then(({ canvas, bounds }) => {
        if (requestId !== requestIdRef.current) return; // a newer selection superseded this one

        if (layerRef.current) {
          map.removeLayer(layerRef.current);
          layerRef.current = null;
        }

        const layer = L.imageOverlay(canvas.toDataURL(), bounds);
        layer.addTo(map);
        layerRef.current = layer;
        map.fitBounds(bounds);
        setStatus("ready");

        const unitDiv = unitControlRef.current?.getContainer();
        if (unitDiv) {
          const unit = unitFor(selection);
          unitDiv.textContent = unit ? `Unit: ${unit}` : "";
          unitDiv.style.display = unit ? "block" : "none";
        }
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setStatus("error");
        setErrorMessage(err.message || String(err));
        const unitDiv = unitControlRef.current?.getContainer();
        if (unitDiv) unitDiv.style.display = "none";
      });
  }, [selection]);

  return (
    <div className="map-view">
      <div ref={containerRef} className="map-container" />
      {status === "loading" && <div className="map-overlay">Loading…</div>}
      {status === "error" && <div className="map-overlay map-overlay-error">{errorMessage}</div>}
    </div>
  );
}
