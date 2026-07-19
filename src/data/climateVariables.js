// Daymet V4 daily climate variables, keyed by the short name stored in the
// Zarr dataset. All are continuous - Daymet has no categorical bands.
export const CLIMATE_VARIABLES = [
  {
    key: "tmax",
    label: "Maximum Temperature",
    description: "Daily maximum 2 m air temperature.",
    unit: "°C",
  },
  {
    key: "tmin",
    label: "Minimum Temperature",
    description: "Daily minimum 2 m air temperature.",
    unit: "°C",
  },
  {
    key: "prcp",
    label: "Precipitation",
    description: "Daily total precipitation.",
    unit: "mm/day",
  },
  {
    key: "srad",
    label: "Shortwave Radiation",
    description: "Daily average incident shortwave solar radiation.",
    unit: "W/m²",
  },
  {
    key: "vp",
    label: "Water Vapor Pressure",
    description: "Daily average partial pressure of water vapor in the atmosphere.",
    unit: "Pa",
  },
  {
    key: "swe",
    label: "Snow Water Equivalent",
    description: "Snow water equivalent depth at the end of the day.",
    unit: "kg/m²",
  },
  {
    key: "dayl",
    label: "Day Length",
    description: "Duration of daylight for the day.",
    unit: "s",
  },
];
