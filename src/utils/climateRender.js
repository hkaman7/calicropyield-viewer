import * as zarr from "zarrita";
import { climateZarrUrl } from "./gcsPaths";
import { climateColorRgb } from "./colorScale";
import { continuousGridToCanvas } from "./gridRender";

/**
 * Fetches one day's 2D (y, x) slice of a climate variable from a
 * county/year's Daymet Zarr store. Each variable is stored as a single
 * (365, y, x) chunk, so this still has to fetch and decode the whole
 * year - dayIndex only trims what's returned, not what's transferred - but
 * Daymet's ~1km grid keeps that manageable even for large counties.
 */
export async function fetchClimateVariable(county, year, variableKey, dayIndex) {
  const store = new zarr.FetchStore(climateZarrUrl(county, year));
  const group = await zarr.open(store, { kind: "group" });

  const arr = await zarr.open(group.resolve(variableKey), { kind: "array" });
  const xArr = await zarr.open(group.resolve("x"), { kind: "array" });
  const yArr = await zarr.open(group.resolve("y"), { kind: "array" });

  const [{ data, shape }, xResult, yResult] = await Promise.all([
    zarr.get(arr, [dayIndex, null, null]),
    zarr.get(xArr),
    zarr.get(yArr),
  ]);
  const xData = xResult.data;
  const yData = yResult.data;

  return {
    data,
    width: shape[1],
    height: shape[0],
    xmin: xData[0],
    xmax: xData[xData.length - 1],
    ymin: yData[yData.length - 1],
    ymax: yData[0],
  };
}

/** Rasterizes a fetchClimateVariable() result onto a canvas, returning
 * { canvas, bounds, min, max } for the map and legend. */
export function climateToCanvas(result) {
  return continuousGridToCanvas(result, climateColorRgb);
}
