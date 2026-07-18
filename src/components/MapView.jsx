import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import parseGeoraster from "georaster";
import { cdlUrl, etUrl } from "../utils/gcsPaths";
import { rasterToCanvas } from "../utils/rasterToCanvas";

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

    const url = selection.dataType === "cdl"
      ? cdlUrl(selection.county, selection.year)
      : etUrl(selection.county, selection.year, selection.month);

    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Not available (HTTP ${response.status}). This county/year/month may not be uploaded yet.`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => parseGeoraster(arrayBuffer))
      .then((georaster) => {
        if (requestId !== requestIdRef.current) return; // a newer selection superseded this one

        if (layerRef.current) {
          map.removeLayer(layerRef.current);
          layerRef.current = null;
        }

        // Rasterized to our own canvas and shown via a plain L.imageOverlay,
        // rather than georaster-layer-for-leaflet's tiled GridLayer: that
        // library's createTile() reliably rendered the first (CDL) load in
        // testing, but silently never fired at all for the ET file (0
        // canvases created, no error, even after eliminating every other
        // variable - remounting the whole map, converting the source to a
        // proper multi-overview COG, and dropping our custom
        // pixelValuesToColorFn entirely). Root cause wasn't identified.
        // imageOverlay is simpler, well-tested Leaflet core functionality
        // instead of a third-party GridLayer subclass, and our data is
        // small enough (a few MB, already fetched in full) that rasterizing
        // client-side to one canvas is cheap.
        const { canvas, bounds } = rasterToCanvas(georaster, selection.dataType);
        const layer = L.imageOverlay(canvas.toDataURL(), bounds);
        layer.addTo(map);
        layerRef.current = layer;
        map.fitBounds(bounds);
        setStatus("ready");
      })
      .catch((err) => {
        if (requestId !== requestIdRef.current) return;
        setStatus("error");
        setErrorMessage(err.message || String(err));
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
