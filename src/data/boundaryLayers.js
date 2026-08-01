import { BUCKET_BASE_URL } from "../utils/gcsPaths";

// California field boundaries with crop-type attribution, from DWR's i15
// Crop Mapping 2024 (Provisional) dataset - 456,216 fields statewide. The
// source shapefile is ~690 MB (433 MB .shp + 256 MB .dbf), far too large to
// ship as GeoJSON, so it's pre-converted to vector tiles (tippecanoe ->
// PMTiles) and uploaded to the same public, CORS-enabled bucket every other
// layer in this app reads from - a PMTiles client only fetches the byte
// ranges for tiles actually on screen, not the whole file. See
// calicropyield-dev's conversion notes for the exact tippecanoe invocation.
export const FIELD_BOUNDARIES_URL = `${BUCKET_BASE_URL}/reference/i15_crop_mapping_2024.pmtiles`;
export const FIELD_BOUNDARIES_LAYER = "fields"; // tippecanoe -l name
export const FIELD_BOUNDARIES_MIN_ZOOM = 8; // matches the tiles' own minzoom - no data below this

// Raw DWR attribute codes kept per field (see the dataset's own
// documentation for the full code books - CLASS1/SUBCLASS1 are USDA-style
// land use codes, CROPTYP1 is the primary crop type code, IRR_TYP1PA is the
// primary irrigation type). Shown to the user as-is for now; a code->label
// lookup table would be a natural follow-up.
export const FIELD_PROPERTY_LABELS = {
  UniqueID: "Field ID",
  COUNTY: "County",
  CLASS1: "Land use class",
  SUBCLASS1: "Subclass",
  CROPTYP1: "Crop type code",
  MAIN_CROP: "Main crop code",
  IRR_TYP1PA: "Irrigation type",
  YR_PLANTED: "Year planted",
  MULTIUSE: "Multi-use",
  ACRES: "Acres",
};
