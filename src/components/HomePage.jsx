import { useState } from "react";
import { DATASET_INFO } from "../data/datasetInfo";
import "../Home.css";

// Order shown on the home page - deliberately not DATASET_INFO's insertion
// order, roughly "what you'd look at first" (imagery/crop-type before the
// more analytical layers).
const CARD_ORDER = [
  { key: "landsat", icon: "🛰️", explorable: true },
  { key: "cdl", icon: "🌾", explorable: true },
  { key: "et", icon: "💧", explorable: true },
  { key: "irrigation", icon: "🚿", explorable: false },
  { key: "climate", icon: "⛅", explorable: true },
  { key: "soil", icon: "🪨", explorable: true },
  { key: "yield", icon: "📊", explorable: true },
];

// A sample of the 70+ crops in the yield dataset, title-cased for display.
// Purely decorative (the scrolling marquee) - not an exhaustive list.
const SAMPLE_CROPS = [
  "Almonds", "Grapes (Wine)", "Walnuts", "Tomatoes (Processing)", "Rice",
  "Cotton", "Alfalfa", "Pistachios", "Strawberries", "Lettuce", "Oranges",
  "Corn", "Broccoli", "Carrots", "Garlic", "Avocados", "Onions", "Wheat",
  "Peaches", "Cherries", "Olives", "Artichokes", "Celery", "Blueberries",
];

const CITATION = `@InProceedings{Kamangir_2025_CVPR,
    author    = {Kamangir, Hamid and Hajiesmaeeli, Mona and Earles, J. Mason},
    title     = {California Crop Yield Benchmark: Combining Satellite Image, Climate, Evapotranspiration, and Soil Data Layers for County-Level Yield Forecasting of Over 70 Crops},
    booktitle = {Proceedings of the Computer Vision and Pattern Recognition Conference (CVPR) Workshops},
    month     = {June},
    year      = {2025},
    pages     = {5491--5500}
}`;

export default function HomePage({ onExplore }) {
  const [copied, setCopied] = useState(false);

  function handleCopyCitation() {
    navigator.clipboard?.writeText(CITATION).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <main className="home">
      <section className="home-hero">
        <div className="home-hero-inner">
          <p className="home-eyebrow">CVPR 2025 Workshop · Open Dataset &amp; Benchmark</p>
          <h1>California Crop Yield Benchmark</h1>
          <p className="home-lede">
            A terabyte-scale, multi-modal dataset combining Landsat satellite imagery, DayMet climate,
            OpenET evapotranspiration, gNATSGO soil, and CDFA crop yield records for every California
            county — built to support machine learning research in climate-aware agricultural forecasting
            for over 70 crops.
          </p>
          <div className="home-badges">
            <a className="home-badge" href="https://arxiv.org/abs/2506.10228" target="_blank" rel="noreferrer">
              📄 arXiv 2506.10228
            </a>
            <a
              className="home-badge"
              href="https://openaccess.thecvf.com/content/CVPR2025W/V4A/papers/Kamangir_California_Crop_Yield_Benchmark_Combining_Satellite_Image_Climate_Evapotranspiration_and_CVPRW_2025_paper.pdf"
              target="_blank"
              rel="noreferrer"
            >
              🎓 CVPR 2025
            </a>
            <a className="home-badge" href="https://huggingface.co/datasets/hkaman/california-crop-yield-benchmark" target="_blank" rel="noreferrer">
              🤗 HuggingFace
            </a>
            <a className="home-badge" href="https://pypi.org/project/calicropyield/" target="_blank" rel="noreferrer">
              📦 PyPI
            </a>
          </div>
          <div className="home-cta-row">
            <button type="button" className="home-cta home-cta-primary" onClick={() => onExplore(null)}>
              Explore the Data →
            </button>
            <a className="home-cta home-cta-secondary" href="https://arxiv.org/abs/2506.10228" target="_blank" rel="noreferrer">
              Read the Paper
            </a>
          </div>
        </div>
      </section>

      <section className="home-stats">
        <div className="home-stat">
          <span className="home-stat-value">58</span>
          <span className="home-stat-label">California counties</span>
        </div>
        <div className="home-stat">
          <span className="home-stat-value">70+</span>
          <span className="home-stat-label">crop types</span>
        </div>
        <div className="home-stat">
          <span className="home-stat-value">7</span>
          <span className="home-stat-label">data modalities</span>
        </div>
        <div className="home-stat">
          <span className="home-stat-value">2008–2024</span>
          <span className="home-stat-label">years of coverage</span>
        </div>
        <div className="home-stat">
          <span className="home-stat-value">~1 TB</span>
          <span className="home-stat-label">public GCS bucket</span>
        </div>
      </section>

      <div className="home-marquee" aria-hidden="true">
        <div className="home-marquee-track">
          {[...SAMPLE_CROPS, ...SAMPLE_CROPS].map((crop, i) => (
            <span className="home-marquee-pill" key={`${crop}-${i}`}>{crop}</span>
          ))}
        </div>
      </div>

      <section className="home-about">
        <div className="home-about-text">
          <h2>About the benchmark</h2>
          <p>
            County-level crop yield forecasting is hard to study well because the inputs that actually
            drive yield — imagery, weather, water use, and soil — rarely live in one place, in one
            format, at one resolution. This benchmark unifies them: monthly Landsat time series, daily
            DayMet climate variables, monthly OpenET evapotranspiration, static gNATSGO soil attributes,
            annual USDA Cropland Data Layer crop-type maps, and USDA-reported county-level yield for
            over 70 crops — all aligned to the same 58 California counties, ready to combine into a
            single training set instead of five separate download-and-reconcile projects.
          </p>
          <p>
            The <code>calicropyield</code> Python package wraps the public GCS bucket with a
            download-on-the-fly client and a ready-to-use <code>DataLoader</code> for building deep
            learning models, so you never have to hand-construct a bucket path yourself.
          </p>
        </div>
        <div className="home-citation">
          <div className="home-citation-header">
            <span>Cite this work</span>
            <button type="button" className="home-citation-copy" onClick={handleCopyCitation}>
              {copied ? "Copied ✓" : "Copy BibTeX"}
            </button>
          </div>
          <pre>{CITATION}</pre>
        </div>
      </section>

      <section className="home-datasets">
        <h2>Explore the data</h2>
        <p className="home-section-sub">
          Six of the seven layers below are browsable directly in the map viewer. Click a card to jump
          straight in.
        </p>
        <div className="home-card-grid">
          {CARD_ORDER.map(({ key, icon, explorable }, i) => {
            const info = DATASET_INFO[key];
            if (!info) return null;
            return (
              <button
                type="button"
                key={key}
                className="home-card"
                style={{ animationDelay: `${i * 60}ms` }}
                onClick={() => onExplore(explorable ? key : null)}
              >
                <div className="home-card-icon">{icon}</div>
                <h3>{info.label}</h3>
                <p className="home-card-source">{info.source}</p>
                <p className="home-card-desc">{info.description}</p>
                <dl className="home-card-meta">
                  <div>
                    <dt>Resolution</dt>
                    <dd>{info.resolution}</dd>
                  </div>
                  <div>
                    <dt>Coverage</dt>
                    <dd>{info.coverage}</dd>
                  </div>
                </dl>
                <span className={`home-card-tag ${explorable ? "" : "home-card-tag-muted"}`}>
                  {explorable ? "View in map →" : "Download-only (pip package)"}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="home-usage">
        <h2>Three ways to get the data</h2>
        <div className="home-usage-grid">
          <div className="home-usage-card">
            <div className="home-usage-icon">🗺️</div>
            <h3>Browse in the viewer</h3>
            <p>No install, no account. Click a county, pick a layer and year, and download whatever's on screen.</p>
            <button type="button" className="home-usage-link" onClick={() => onExplore(null)}>
              Open the viewer →
            </button>
          </div>
          <div className="home-usage-card">
            <div className="home-usage-icon">🐍</div>
            <h3>pip install calicropyield</h3>
            <p>A download-on-the-fly client and DNN-ready DataLoader for building models over the whole dataset.</p>
            <a className="home-usage-link" href="https://pypi.org/project/calicropyield/" target="_blank" rel="noreferrer">
              View on PyPI →
            </a>
          </div>
          <div className="home-usage-card">
            <div className="home-usage-icon">🪣</div>
            <h3>Pull the raw bucket</h3>
            <p>Everything lives in a public GCS bucket if you'd rather use <code>gsutil</code>/<code>gcloud storage</code> directly.</p>
            <a
              className="home-usage-link"
              href="https://github.com/plant-ai-biophysics-lab/california-crop-yield-benchmark"
              target="_blank"
              rel="noreferrer"
            >
              Read the docs →
            </a>
          </div>
        </div>
      </section>

      <footer className="home-footer">
        <div className="home-footer-links">
          <a href="https://github.com/plant-ai-biophysics-lab/california-crop-yield-benchmark" target="_blank" rel="noreferrer">Dataset docs</a>
          <a href="https://pypi.org/project/calicropyield/" target="_blank" rel="noreferrer">PyPI package</a>
          <a href="https://arxiv.org/abs/2506.10228" target="_blank" rel="noreferrer">Paper</a>
          <a href="https://huggingface.co/datasets/hkaman/california-crop-yield-benchmark" target="_blank" rel="noreferrer">HuggingFace</a>
          <a href="https://github.com/hkaman7/calicropyield-viewer" target="_blank" rel="noreferrer">Viewer source</a>
        </div>
        <p className="home-footer-note">BSD 3-Clause License · Kamangir, Hajiesmaeeli, Earles — UC Davis Plant AI &amp; Biophysics Lab</p>
      </footer>
    </main>
  );
}
