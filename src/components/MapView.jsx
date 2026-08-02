import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import parseGeoraster from "georaster";
import { leafletLayer, PolygonSymbolizer } from "protomaps-leaflet";
import { DATASET_INFO } from "../data/datasetInfo";
import { SOIL_VARIABLES } from "../data/soilVariables";
import { CLIMATE_VARIABLES } from "../data/climateVariables";
import CROP_CDL_CROSSWALK from "../data/cropCdlCrosswalk.json";
import CDL_LEGEND from "../data/cdlLegend.json";
import { FIELD_BOUNDARIES_URL, FIELD_BOUNDARIES_LAYER, FIELD_BOUNDARIES_MIN_ZOOM, FIELD_PROPERTY_LABELS } from "../data/boundaryLayers";
import { cdlUrl, etUrl, landsatUrl } from "../utils/gcsPaths";
import { rasterToCanvas } from "../utils/rasterToCanvas";
import { landsatToCanvas } from "../utils/landsatRender";
import { fetchSoilVariable, soilToCanvas } from "../utils/soilRender";
import { fetchClimateVariable, climateToCanvas } from "../utils/climateRender";
import { ET_STOPS, CLIMATE_STOPS, stopsToCssGradient } from "../utils/colorScale";
import { SOIL_CONTINUOUS_STOPS, categoricalColorCss } from "../utils/soilRender";
import { dayOfYearIndex } from "../utils/daymetCalendar";
import { fetchCountiesGeoJson } from "../utils/countyMask";
import Legend from "./Legend";

function cdlLegendColor(code) {
  return CDL_LEGEND[String(code)]?.color ?? "888888";
}

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
  if (selection.dataType === "yield" && selection.crop) {
    const match = CROP_CDL_CROSSWALK[selection.crop];
    if (match && match.cdlCodes.length > 0) {
      return {
        type: "categorical",
        title: `${selection.crop} fields (CDL ${selection.year})`,
        items: match.cdlCodes.map((code, i) => ({
          label: match.cdlNames[i],
          color: `#${cdlLegendColor(code)}`,
        })),
      };
    }
  }
  return null;
}

// California's extent, padded slightly. Keeps the base map focused on the
// dataset's actual coverage instead of letting users pan/zoom to the whole
// world.
const CALIFORNIA_BOUNDS = L.latLngBounds([32.0, -125.5], [42.5, -113.5]);
const CALIFORNIA_CENTER = [37.2, -119.5];
const MIN_ZOOM = 5;

const COUNTY_STYLE = { color: "#666", weight: 1, opacity: 0.6, fillOpacity: 0 };
const COUNTY_STYLE_SELECTED = { color: "#e65100", weight: 2.5, opacity: 0.9, fillOpacity: 0.06, fillColor: "#e65100" };

function normalizedCountyName(feature) {
  return feature?.properties?.NAME?.replace(/\s+County$/, "") ?? "";
}

// Restyles every feature in the county layer: selected county gets
// COUNTY_STYLE_SELECTED, everything else falls back to the plain outline.
function applyCountyHighlight(countyLayer, selectedCounty) {
  countyLayer.eachLayer((layer) => {
    const isSelected = normalizedCountyName(layer.feature) === selectedCounty;
    layer.setStyle(isSelected ? COUNTY_STYLE_SELECTED : COUNTY_STYLE);
    if (isSelected) layer.bringToFront();
  });
}

export default function MapView({ selection, onCountyClick, onFieldClick }) {
  const containerRef = useRef(null);
  const mapRef = useRef(null);
  const layerRef = useRef(null);
  const countyLayerRef = useRef(null);
  const requestIdRef = useRef(0);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [errorMessage, setErrorMessage] = useState("");
  const [legend, setLegend] = useState(null);

  // The map-init effect below runs exactly once, but its click/hover
  // handlers need the *current* selection (e.g. to know which county is
  // already selected for hover styling) without re-running that whole
  // effect - and therefore without re-fetching/re-adding the layers - every
  // time selection changes. A ref sidesteps that stale-closure problem.
  const selectionRef = useRef(selection);
  selectionRef.current = selection;

  // Map is created once and reused across selection changes.
  useEffect(() => {
    // React StrictMode double-invokes effects in dev (mount -> cleanup ->
    // mount again) specifically to surface bugs like this one: the county
    // GeoJSON fetch below is async, so it can still be in flight when the
    // *first* invocation's cleanup runs and removes its map. Checking
    // `mapRef.current` truthiness isn't enough - by the time the fetch
    // resolves, mapRef.current has already been overwritten by the second
    // invocation's map, so that check passes while `map` (captured by this
    // closure) is the first, already-`.remove()`-d instance, and calling
    // `.addTo(map)` on it throws deep inside Leaflet (panes are gone).
    // This flag is scoped to *this* effect invocation specifically.
    let cancelled = false;

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
    dark.addTo(map);
    const baseLayers = { Dark: dark, Light: light };
    const overlays = {};
    const layersControl = L.control.layers(baseLayers, overlays).addTo(map);

    // County boundaries: reuses the same reference/California_Counties.geojson
    // the climate polygon-masking code already fetches (cached, so no double
    // download if both features are in use). Click selects that county -
    // the same effect as picking it from the sidebar dropdown, since both
    // just update `selection.county`.
    fetchCountiesGeoJson()
      .then((geojson) => {
        if (cancelled) return; // this effect invocation's map was already torn down
        const countyLayer = L.geoJSON(geojson, {
          style: COUNTY_STYLE,
          onEachFeature: (feature, layer) => {
            layer.on("click", () => onCountyClick?.(normalizedCountyName(feature)));
            layer.on("mouseover", () => {
              if (normalizedCountyName(feature) !== selectionRef.current.county) {
                layer.setStyle({ weight: 2, opacity: 0.9 });
              }
            });
            layer.on("mouseout", () => {
              if (normalizedCountyName(feature) !== selectionRef.current.county) {
                layer.setStyle(COUNTY_STYLE);
              }
            });
          },
        });
        countyLayer.addTo(map);
        countyLayerRef.current = countyLayer;
        layersControl.addOverlay(countyLayer, "County boundaries");
        applyCountyHighlight(countyLayer, selectionRef.current.county);
      })
      .catch((err) => console.error("Failed to load county boundaries:", err));

    // California field boundaries (DWR i15 Crop Mapping), served as vector
    // tiles from a PMTiles file - see src/data/boundaryLayers.js for why
    // (the source shapefile is ~690 MB, far too large for GeoJSON). Only
    // has tile data from zoom 8 up, so it's simply invisible/inert below
    // that rather than needing an explicit visibility toggle.
    const fieldsLayer = leafletLayer({
      url: FIELD_BOUNDARIES_URL,
      paintRules: [
        {
          dataLayer: FIELD_BOUNDARIES_LAYER,
          symbolizer: new PolygonSymbolizer({
            fill: "rgba(76, 175, 80, 0.12)",
            stroke: "rgba(27, 94, 32, 0.7)",
            width: 1,
          }),
        },
      ],
      maxDataZoom: 16,
    });
    fieldsLayer.addTo(map);
    layersControl.addOverlay(fieldsLayer, "Field boundaries (DWR i15)");

    let fieldPopup = null;
    map.on("click", (e) => {
      if (map.getZoom() < FIELD_BOUNDARIES_MIN_ZOOM) return;
      // queryTileFeaturesDebug's returned Map is keyed by *source* name, not
      // by tippecanoe layer name - with a single unnamed `url` source (no
      // `sources` option), that key is "". Each PickedFeature in the array
      // carries its own `layerName`, which is what "fields" (the -l name
      // passed to tippecanoe) actually refers to.
      const picked = fieldsLayer.queryTileFeaturesDebug(e.latlng.lng, e.latlng.lat, 4);
      const hits = (picked.get("") ?? []).filter((p) => p.layerName === FIELD_BOUNDARIES_LAYER);
      if (hits.length === 0) return;

      const props = hits[0].feature.props;
      onFieldClick?.(props);

      if (fieldPopup) map.closePopup(fieldPopup);
      const rows = Object.entries(FIELD_PROPERTY_LABELS)
        .filter(([key]) => props[key] !== undefined && props[key] !== null && props[key] !== "")
        .map(([key, label]) => `<tr><td>${label}</td><td>${props[key]}</td></tr>`)
        .join("");
      fieldPopup = L.popup()
        .setLatLng(e.latlng)
        .setContent(`<table class="field-popup-table">${rows}</table>`)
        .openOn(map);
    });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Re-highlight the selected county whenever it changes, whether from a
  // map click (handled above) or the sidebar dropdown - without re-fetching
  // or re-adding the boundary layer itself.
  useEffect(() => {
    if (countyLayerRef.current) {
      applyCountyHighlight(countyLayerRef.current, selection.county);
    }
  }, [selection.county]);

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

      // Yield has no raster of its own - it reuses the county's CDL layer
      // for that year, optionally dimming every class except the selected
      // crop's so its fields read as a clear "spotlight" (see
      // rasterToCanvas's highlightCodes param).
      if (selection.dataType === "yield") {
        const url = cdlUrl(selection.county, selection.year);
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`CDL not available for this county/year (HTTP ${response.status}).`);
        }
        const georaster = await parseGeoraster(await response.arrayBuffer());
        const match = selection.crop ? CROP_CDL_CROSSWALK[selection.crop] : null;
        const highlightCodes = match && match.cdlCodes.length > 0 ? new Set(match.cdlCodes) : null;
        return rasterToCanvas(georaster, "cdl", highlightCodes);
      }

      if (selection.dataType === "landsat") {
        const response = await fetch(landsatUrl(selection.county, selection.year, selection.month));
        if (!response.ok) {
          throw new Error(`Not available (HTTP ${response.status}). This county/year/month may not be uploaded yet.`);
        }
        const georaster = await parseGeoraster(await response.arrayBuffer());
        return landsatToCanvas(georaster);
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
