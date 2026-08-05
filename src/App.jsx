import { useState } from "react";
import Sidebar from "./components/Sidebar";
import MapView from "./components/MapView";
import HomePage from "./components/HomePage";
import { CALIFORNIA_COUNTIES } from "./data/counties";
import "./App.css";

const KNOWN_COUNTIES = new Set(CALIFORNIA_COUNTIES);

const DEFAULT_SELECTION = {
  dataType: "cdl",
  county: "Monterey",
  year: 2020,
  month: 7,
  day: 15,
  variable: "soc0_100",
  crop: null,
};

export default function App() {
  const [tab, setTab] = useState("home"); // "home" | "download"
  const [selection, setSelection] = useState(DEFAULT_SELECTION);
  const [selectedField, setSelectedField] = useState(null);

  function handleCountyClick(county) {
    if (!county) return;
    setSelection((s) => ({ ...s, county }));
  }

  function handleFieldClick(fieldProps) {
    setSelectedField(fieldProps);
    // A field is inside exactly one county - clicking it should also make
    // that county the active selection, same as clicking the county
    // boundary itself, so the existing download/analysis controls
    // immediately target the right place. DWR's source data uses "****" as
    // a placeholder for redacted/unknown values in several fields
    // (confirmed: CLASS1, SUBCLASS1, CROPTYP1, and COUNTY itself all show
    // up as "****" on some records) - only trust COUNTY if it's actually
    // one of the 58 real county names, otherwise leave the existing
    // selection alone rather than sending the rest of the app fetching
    // gs://.../counties/****/....
    const county = fieldProps?.COUNTY?.replace(/\s+County$/i, "");
    if (county && KNOWN_COUNTIES.has(county)) {
      setSelection((s) => ({ ...s, county }));
    }
  }

  // Used by the home page's dataset cards / CTA to jump straight into the
  // viewer, optionally preselecting a data type (e.g. clicking the "Climate"
  // card should land on the Download tab with Climate already selected, not
  // just switch tabs and leave the default CDL view showing).
  function handleExplore(dataType) {
    if (dataType) setSelection((s) => ({ ...s, dataType }));
    setTab("download");
  }

  return (
    <div className="app-shell">
      <nav className="top-nav">
        <div className="top-nav-brand" onClick={() => setTab("home")}>
          <span className="top-nav-logo">🌾</span>
          <span className="top-nav-title">CaliCropYield</span>
        </div>
        <div className="top-nav-tabs">
          <button
            type="button"
            className={`top-nav-tab ${tab === "home" ? "active" : ""}`}
            onClick={() => setTab("home")}
          >
            Home
          </button>
          <button
            type="button"
            className={`top-nav-tab ${tab === "download" ? "active" : ""}`}
            onClick={() => setTab("download")}
          >
            Download Data
          </button>
        </div>
      </nav>

      {tab === "home" ? (
        <HomePage onExplore={handleExplore} />
      ) : (
        <div className="app-layout">
          <Sidebar
            selection={selection}
            onChange={setSelection}
            selectedField={selectedField}
            onClearSelectedField={() => setSelectedField(null)}
          />
          <MapView selection={selection} onCountyClick={handleCountyClick} onFieldClick={handleFieldClick} />
        </div>
      )}
    </div>
  );
}
