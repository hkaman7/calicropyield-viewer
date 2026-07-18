# CaliCropYield Viewer

A React + Leaflet viewer for the [California Crop Yield Benchmark](https://github.com/plant-ai-biophysics-lab/california-crop-yield-benchmark) dataset. Pick a data type and county in the sidebar (plus year/month for CDL/ET, or a variable for soil) to render the corresponding data on the map, and download the raw file.

**v1 scope:** CDL (Cropland Data Layer), ET (evapotranspiration), and soil (gNATSGO) are covered. Climate is also stored as Zarr in the same bucket but isn't rendered here yet - it's multi-dimensional (time x variable), unlike soil's static 2D-per-variable layout, so it needs a bit more UI design (e.g. a date/time control) as a follow-up.

## How it works

- Data lives in a **public** GCS bucket (`gs://california-crop-yield-benchmark`), written by the download scripts in `calicropyield-dev/dataset/download_county_dataset/scripts/`. No credentials of any kind are used or needed - the app fetches plain `https://storage.googleapis.com/...` URLs.
- **CDL/ET** (GeoTIFF): each selection fetches the file in full (`fetch().arrayBuffer()`), parses it with [`georaster`](https://github.com/GeoTIFF/georaster), and rasterizes it onto an offscreen `<canvas>` using a per-dataset color function (`src/utils/rasterToCanvas.js`).
- **Soil** (Zarr v3): read directly in the browser with [`zarrita`](https://github.com/manzt/zarrita.js) (`src/utils/soilRender.js`) - `FetchStore` treats the Zarr store's many small chunk objects as plain HTTP resources, and `numcodecs` decodes the zstd-compressed chunks our Python `zarr` writer produced (verified directly against a real store before wiring this in, given the CDL/ET debugging below). Categorical variables (land capability class, flood frequency) use a fixed qualitative palette keyed by integer code; continuous variables use a color ramp scaled to that variable's actual min/max.
- Either way, the result is rasterized onto our own `<canvas>` and displayed via a plain `L.imageOverlay`. See the comment in `src/components/MapView.jsx` for why this is a canvas + imageOverlay instead of a tiled GridLayer (`georaster-layer-for-leaflet`): that library's tile grid reliably rendered the first raster loaded but silently never rendered a second one (0 canvases created, no error) in every configuration tried, including a from-scratch map remount and a from-scratch COG conversion of the source file. Root cause wasn't identified; the canvas approach sidesteps it and is simpler besides.
- CDL colors come from the authoritative USDA crop legend (`src/data/cdlLegend.json`, pulled directly from the `USDA/NASS/CDL` Earth Engine asset's `cropland_class_*` properties - not hand-approximated). ET uses a pale-to-deep blue sequential ramp; soil continuous variables use a tan-to-brown ramp - both in `src/utils/colorScale.js` / `src/utils/soilRender.js`.
- Soil variable names in the UI (`src/data/soilVariables.js`) are descriptive labels (e.g. "Soil Organic Carbon Stock (0-100 cm)"), not the raw Zarr variable keys (`soc0_100`).
- The bucket has a CORS policy (`origin: *`, `GET`/`HEAD`) - without it, browsers block the cross-origin `fetch()` calls entirely.

## Known gaps

- **Climate isn't visualized yet** (see scope note above).
- **ET data is still being backfilled** as of this writing - not every county/year/month combination exists yet. The map surfaces a clear "not available" message rather than failing silently.
- **CDL is missing for Siskiyou, Mariposa, and Marin for 2008-2011 and 2013-2016** (present from 2017 onward) - a gap in the source data, not this app.
- **Soil is a Zarr store**, not a single downloadable file - the sidebar shows the `gs://` path for `gsutil`/`gcloud` instead of a one-click download link.
- Large counties (e.g. San Bernardino, the biggest in the contiguous US) mean rasterizing client-side can take a couple seconds - there's no loading progress bar beyond the "Loading..." overlay.

## Development

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # outputs to dist/
```

## Deployment

Deploys to GitHub Pages via `.github/workflows/deploy.yml` on every push to `main` (or manually via workflow_dispatch). Requires GitHub Pages to be configured with source "GitHub Actions" in the repo settings. `vite.config.js` uses a relative `base: './'` so it works under the project-repo subpath without hardcoding the repo name.
