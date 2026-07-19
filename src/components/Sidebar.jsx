import { useState } from "react";
import { CALIFORNIA_COUNTIES } from "../data/counties";
import { DATASET_INFO } from "../data/datasetInfo";
import { SOIL_VARIABLES } from "../data/soilVariables";
import { CDL_YEARS, ET_YEARS, MONTHS, cdlUrl, etUrl, countySlug } from "../utils/gcsPaths";
import { fetchSoilVariable } from "../utils/soilRender";
import { downloadSoilVariableAsGeoTiff } from "../utils/geotiffExport";

export default function Sidebar({ selection, onChange }) {
  const { dataType, county, year, month, variable } = selection;
  const years = dataType === "cdl" ? CDL_YEARS : ET_YEARS;
  const info = DATASET_INFO[dataType];
  const soilVariable = SOIL_VARIABLES.find((v) => v.key === variable);
  const [soilDownloadState, setSoilDownloadState] = useState("idle"); // idle | working | error

  function update(patch) {
    onChange({ ...selection, ...patch });
  }

  async function handleSoilDownload() {
    setSoilDownloadState("working");
    try {
      const result = await fetchSoilVariable(county, variable);
      await downloadSoilVariableAsGeoTiff(`${countySlug(county)}_soil_${variable}.tif`, result);
      setSoilDownloadState("idle");
    } catch (err) {
      console.error(err);
      setSoilDownloadState("error");
    }
  }

  return (
    <aside className="sidebar">
      <h1>CaliCropYield Viewer</h1>
      <p className="subtitle">California Crop Yield Benchmark dataset explorer</p>

      <label className="field">
        <span>Data type</span>
        <select value={dataType} onChange={(e) => update({ dataType: e.target.value })}>
          <option value="cdl">Cropland Data Layer (CDL)</option>
          <option value="et">Evapotranspiration (ET)</option>
          <option value="soil">Soil (gNATSGO)</option>
        </select>
      </label>

      <label className="field">
        <span>County</span>
        <select value={county} onChange={(e) => update({ county: e.target.value })}>
          {CALIFORNIA_COUNTIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      {dataType === "soil" ? (
        <label className="field">
          <span>Variable</span>
          <select value={variable} onChange={(e) => update({ variable: e.target.value })}>
            {SOIL_VARIABLES.map((v) => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        </label>
      ) : (
        <label className="field">
          <span>Year</span>
          <select value={year} onChange={(e) => update({ year: Number(e.target.value) })}>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      )}

      {dataType === "et" && (
        <label className="field">
          <span>Month</span>
          <select value={month} onChange={(e) => update({ month: Number(e.target.value) })}>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{String(m).padStart(2, "0")}</option>
            ))}
          </select>
        </label>
      )}

      {dataType === "cdl" && (
        <a className="download-btn" href={cdlUrl(county, year)} download target="_blank" rel="noreferrer">
          Download GeoTIFF
        </a>
      )}
      {dataType === "et" && (
        <a className="download-btn" href={etUrl(county, year, month)} download target="_blank" rel="noreferrer">
          Download GeoTIFF
        </a>
      )}
      {dataType === "soil" && (
        <button
          type="button"
          className="download-btn"
          onClick={handleSoilDownload}
          disabled={soilDownloadState === "working"}
        >
          {soilDownloadState === "working" ? "Preparing GeoTIFF…" : "Download GeoTIFF"}
        </button>
      )}
      {dataType === "soil" && soilDownloadState === "error" && (
        <p className="download-error">Could not prepare the GeoTIFF. Please try again.</p>
      )}

      <dl className="dataset-info">
        <dt>Source</dt>
        <dd>{info.source}</dd>
        <dt>Description</dt>
        <dd>{info.description}</dd>
        {dataType === "soil" && soilVariable && (
          <>
            <dt>Selected variable</dt>
            <dd>{soilVariable.description}</dd>
          </>
        )}
        <dt>Spatial resolution</dt>
        <dd>{info.resolution}</dd>
        <dt>Coordinate reference system</dt>
        <dd>{info.crs}</dd>
        <dt>Coverage</dt>
        <dd>{info.coverage}</dd>
      </dl>
    </aside>
  );
}
