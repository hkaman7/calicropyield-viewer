// gNATSGO soil variables, keyed by the short name stored in the Zarr
// dataset. "type" controls rendering: continuous values get a color ramp
// scaled to their actual min/max, categorical values get a fixed
// qualitative palette keyed by integer code (see each variable's
// "categories" attribute in the Zarr store for the code -> label mapping).
// "unit" is null for variables with no physical unit (unitless indices,
// binary indicators, and categorical classes).
export const SOIL_VARIABLES = [
  {
    key: "nccpi3corn",
    label: "National Commodity Crop Productivity Index — Corn",
    type: "continuous",
    description: "USDA soil-based productivity rating for corn (0-1, higher is more productive).",
    unit: null,
  },
  {
    key: "nccpi3soy",
    label: "National Commodity Crop Productivity Index — Soybean",
    type: "continuous",
    description: "USDA soil-based productivity rating for soybean (0-1, higher is more productive).",
    unit: null,
  },
  {
    key: "nccpi3cot",
    label: "National Commodity Crop Productivity Index — Cotton",
    type: "continuous",
    description: "USDA soil-based productivity rating for cotton (0-1, higher is more productive).",
    unit: null,
  },
  {
    key: "nccpi3sg",
    label: "National Commodity Crop Productivity Index — Small Grains",
    type: "continuous",
    description: "USDA soil-based productivity rating for small grains (0-1, higher is more productive).",
    unit: null,
  },
  {
    key: "nccpi3all",
    label: "National Commodity Crop Productivity Index — All Crops",
    type: "continuous",
    description: "USDA soil-based overall crop productivity rating (0-1, higher is more productive).",
    unit: null,
  },
  {
    key: "soc0_100",
    label: "Soil Organic Carbon Stock (0–100 cm)",
    type: "continuous",
    description: "Estimated organic carbon stock in the top 100 cm of soil (g/m²).",
    unit: "g/m²",
  },
  {
    key: "rootznaws",
    label: "Root Zone Available Water Storage",
    type: "continuous",
    description: "Available water storage capacity within the plant root zone (mm).",
    unit: "mm",
  },
  {
    key: "rootznemc",
    label: "Root Zone Effective Moisture Capacity",
    type: "continuous",
    description: "Effective moisture capacity within the plant root zone (cm).",
    unit: "cm",
  },
  {
    key: "droughty",
    label: "Droughty Soil Indicator",
    type: "continuous",
    description: "Indicator of drought-prone soils (1 = droughty, 0 = not droughty).",
    unit: null,
  },
  {
    key: "niccdcd",
    label: "Non-Irrigated Land Capability Classification",
    type: "categorical",
    description: "USDA land capability class for non-irrigated use, dominant condition (1 = most suitable).",
    unit: null,
  },
  {
    key: "iccdcd",
    label: "Irrigated Land Capability Classification",
    type: "categorical",
    description: "USDA land capability class for irrigated use, dominant condition (1 = most suitable).",
    unit: null,
  },
  {
    key: "flodfreqdcd",
    label: "Flood Frequency Classification",
    type: "categorical",
    description: "Dominant flood frequency class (e.g. None, Rare, Occasional, Frequent).",
    unit: null,
  },
];
