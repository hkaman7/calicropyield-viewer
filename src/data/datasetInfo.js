export const DATASET_INFO = {
  cdl: {
    label: "Cropland Data Layer (CDL)",
    source: "USDA National Agricultural Statistics Service (NASS)",
    description:
      "Annual, satellite-derived land cover and crop-type classification for U.S. agricultural land.",
    resolution: "30 m",
    crs: "EPSG:4326 (WGS 84)",
    coverage:
      "2008-2024 (2012 unavailable). Siskiyou, Mariposa, and Marin are unavailable for 2008-2011 and 2013-2016.",
  },
  et: {
    label: "Evapotranspiration (ET)",
    source: "OpenET - eeMETRIC model, GRIDMET-forced, monthly composites",
    description:
      "Monthly actual evapotranspiration estimates derived from satellite remote sensing and surface energy balance modeling.",
    resolution: "30 m",
    crs: "EPSG:4326 (WGS 84)",
    coverage:
      "2008-2023 (2012 unavailable). Upload is ongoing, so some county/year/month combinations may not be available yet.",
    unit: "mm",
  },
  soil: {
    label: "Soil (gNATSGO)",
    source: "USDA NRCS gridded National Soil Survey Geographic Database (gNATSGO)",
    description:
      "Soil properties and USDA productivity/capability ratings, composited from SSURGO/STATSGO2/RSS soil surveys.",
    resolution: "30 m",
    crs: "EPSG:4326 (WGS 84)",
    coverage: "2020 vintage (static - soil surveys are not resampled annually).",
  },
  climate: {
    label: "Climate (Daymet)",
    source: "Oak Ridge National Laboratory DAAC - Daymet V4, daily surface weather data",
    description:
      "Daily gridded surface weather estimates (temperature, precipitation, radiation, humidity, snow, day length) interpolated from ground observation stations.",
    resolution: "1 km",
    crs: "EPSG:4326 (WGS 84)",
    coverage:
      "2008-2023 (2012 unavailable), one day per view. Leap years keep Feb 29 and drop Dec 31 to stay on Daymet's fixed 365-day calendar.",
  },
};
