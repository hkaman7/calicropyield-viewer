import { BUCKET_BASE_URL } from "./gcsPaths";

// The same boundary reference the download pipeline itself reads county
// polygons from (see calicropyield-dev/.../gcs_common.py's
// load_counties_gdf) - EPSG:4326, one Polygon/MultiPolygon feature per
// county, "NAME" like "Fresno County". Fetched once and cached: it's ~13 MB
// for all 58 counties, so only worth paying for when a data type that
// actually needs it (climate) is in use.
const COUNTIES_GEOJSON_URL = `${BUCKET_BASE_URL}/reference/California_Counties.geojson`;

let countiesPromise = null;
function fetchCountiesGeoJson() {
  if (!countiesPromise) {
    countiesPromise = fetch(COUNTIES_GEOJSON_URL).then((r) => {
      if (!r.ok) throw new Error(`Failed to load county boundaries (HTTP ${r.status})`);
      return r.json();
    });
  }
  return countiesPromise;
}

async function getCountyRings(countyName) {
  const geojson = await fetchCountiesGeoJson();
  const normalized = `${countyName.trim()} County`;
  const feature = geojson.features.find((f) => f.properties?.NAME === normalized);
  if (!feature) throw new Error(`County '${countyName}' not found in boundary reference.`);

  const { type, coordinates } = feature.geometry;
  if (type === "Polygon") return coordinates;
  if (type === "MultiPolygon") return coordinates.flat(1);
  throw new Error(`Unsupported geometry type: ${type}`);
}

/**
 * Masks a grid's data to NaN outside the county polygon, in place. Daymet's
 * Earth Engine export only clips to the county's bounding box (no .clip()
 * call in download_climate.py), so every pixel in the rectangle - corners
 * included - has a real value even outside the actual county shape. This
 * rasterizes the county boundary polygon onto a canvas sized to match the
 * grid (same lon/lat -> pixel affine mapping used everywhere else in this
 * app for bounds/GeoTIFF geotransforms) and uses it as a point-in-polygon
 * mask, so the map view and GeoTIFF download both crop to the real county
 * shape the way soil/CDL/ET already do.
 */
export async function maskGridToCounty(grid, countyName) {
  const { data, width, height, xmin, xmax, ymin, ymax } = grid;
  const rings = await getCountyRings(countyName);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const path = new Path2D();
  for (const ring of rings) {
    ring.forEach(([lon, lat], i) => {
      const x = ((lon - xmin) / (xmax - xmin)) * width;
      const y = ((ymax - lat) / (ymax - ymin)) * height;
      if (i === 0) path.moveTo(x, y);
      else path.lineTo(x, y);
    });
    path.closePath();
  }
  ctx.fillStyle = "#fff";
  ctx.fill(path, "evenodd");

  const alpha = ctx.getImageData(0, 0, width, height).data;
  for (let i = 0; i < data.length; i++) {
    if (alpha[i * 4 + 3] < 128) data[i] = NaN;
  }

  return grid;
}
