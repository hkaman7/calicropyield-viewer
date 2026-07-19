import { useState } from "react";
import { CALIFORNIA_COUNTIES } from "../data/counties";
import { DATASET_INFO } from "../data/datasetInfo";
import { SOIL_VARIABLES } from "../data/soilVariables";
import { CLIMATE_VARIABLES } from "../data/climateVariables";
import { CDL_YEARS, ET_YEARS, CLIMATE_YEARS, MONTHS, cdlUrl, etUrl, countySlug } from "../utils/gcsPaths";
import { fetchSoilVariable } from "../utils/soilRender";
import { fetchClimateVariable } from "../utils/climateRender";
import { downloadGridAsGeoTiff } from "../utils/geotiffExport";
import { daysInMonth, dayOfYearIndex, MONTH_NAMES } from "../utils/daymetCalendar";

const YEARS_BY_TYPE = { cdl: CDL_YEARS, et: ET_YEARS, climate: CLIMATE_YEARS };
const HAS_VARIABLE = { soil: true, climate: true };
const HAS_YEAR = { cdl: true, et: true, climate: true };

export default function Sidebar({ selection, onChange }) {
  const { dataType, county, year, month, day, variable } = selection;
  const info = DATASET_INFO[dataType];
  const soilVariable = SOIL_VARIABLES.find((v) => v.key === variable);
  const climateVariable = CLIMATE_VARIABLES.find((v) => v.key === variable);
  const [downloadState, setDownloadState] = useState("idle"); // idle | working | error

  function update(patch) {
    onChange({ ...selection, ...patch });
  }

  function handleDataTypeChange(newType) {
    const patch = { dataType: newType };

    if (HAS_YEAR[newType]) {
      const validYears = YEARS_BY_TYPE[newType];
      if (!validYears.includes(year)) patch.year = validYears[validYears.length - 1];
    }

    if (HAS_VARIABLE[newType]) {
      const list = newType === "soil" ? SOIL_VARIABLES : CLIMATE_VARIABLES;
      if (!list.some((v) => v.key === variable)) patch.variable = list[0].key;
    }

    if (newType === "climate") {
      const effectiveYear = patch.year ?? year;
      const effectiveMonth = month ?? 1;
      patch.month = effectiveMonth;
      patch.day = Math.min(day ?? 1, daysInMonth(effectiveYear, effectiveMonth));
    }

    update(patch);
  }

  function handleYearChange(newYear) {
    const patch = { year: newYear };
    if (dataType === "climate") patch.day = Math.min(day, daysInMonth(newYear, month));
    update(patch);
  }

  function handleMonthChange(newMonth) {
    const patch = { month: newMonth };
    if (dataType === "climate") patch.day = Math.min(day, daysInMonth(year, newMonth));
    update(patch);
  }

  async function handleGridDownload() {
    setDownloadState("working");
    try {
      let result;
      let filename;
      if (dataType === "soil") {
        result = await fetchSoilVariable(county, variable);
        filename = `${countySlug(county)}_soil_${variable}.tif`;
      } else {
        const mm = String(month).padStart(2, "0");
        const dd = String(day).padStart(2, "0");
        result = await fetchClimateVariable(county, year, variable, dayOfYearIndex(year, month, day));
        filename = `${countySlug(county)}_climate_${variable}_${year}${mm}${dd}.tif`;
      }
      await downloadGridAsGeoTiff(filename, result);
      setDownloadState("idle");
    } catch (err) {
      console.error(err);
      setDownloadState("error");
    }
  }

  return (
    <aside className="sidebar">
      <h1>CaliCropYield Viewer</h1>
      <p className="subtitle">California Crop Yield Benchmark dataset explorer</p>

      <label className="field">
        <span>Data type</span>
        <select value={dataType} onChange={(e) => handleDataTypeChange(e.target.value)}>
          <option value="cdl">Cropland Data Layer (CDL)</option>
          <option value="et">Evapotranspiration (ET)</option>
          <option value="soil">Soil (gNATSGO)</option>
          <option value="climate">Climate (Daymet)</option>
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

      {HAS_YEAR[dataType] && (
        <label className="field">
          <span>Year</span>
          <select value={year} onChange={(e) => handleYearChange(Number(e.target.value))}>
            {YEARS_BY_TYPE[dataType].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </label>
      )}

      {HAS_VARIABLE[dataType] && (
        <label className="field">
          <span>Variable</span>
          <select value={variable} onChange={(e) => update({ variable: e.target.value })}>
            {(dataType === "soil" ? SOIL_VARIABLES : CLIMATE_VARIABLES).map((v) => (
              <option key={v.key} value={v.key}>{v.label}</option>
            ))}
          </select>
        </label>
      )}

      {(dataType === "et" || dataType === "climate") && (
        <label className="field">
          <span>Month</span>
          <select value={month} onChange={(e) => handleMonthChange(Number(e.target.value))}>
            {MONTHS.map((m) => (
              <option key={m} value={m}>{dataType === "climate" ? MONTH_NAMES[m - 1] : String(m).padStart(2, "0")}</option>
            ))}
          </select>
        </label>
      )}

      {dataType === "climate" && (
        <label className="field">
          <span>Day</span>
          <select value={day} onChange={(e) => update({ day: Number(e.target.value) })}>
            {Array.from({ length: daysInMonth(year, month) }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}</option>
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
      {(dataType === "soil" || dataType === "climate") && (
        <button
          type="button"
          className="download-btn"
          onClick={handleGridDownload}
          disabled={downloadState === "working"}
        >
          {downloadState === "working" ? "Preparing GeoTIFF…" : "Download GeoTIFF"}
        </button>
      )}
      {(dataType === "soil" || dataType === "climate") && downloadState === "error" && (
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
        {dataType === "climate" && climateVariable && (
          <>
            <dt>Selected variable</dt>
            <dd>{climateVariable.description}</dd>
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
