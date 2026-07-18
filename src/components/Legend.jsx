import { niceTicks } from "../utils/ticks";

export default function Legend({ legend }) {
  if (!legend) return null;

  if (legend.type === "continuous") {
    const { min, max, gradientCss, title, unit } = legend;
    const ticks = niceTicks(min, max, 5);
    return (
      <div className="legend">
        <div className="legend-gradient-wrap">
          <div className="legend-gradient" style={{ background: gradientCss }} />
          {ticks.map((t) => (
            <span
              key={t}
              className="legend-tick"
              style={{ left: `${((t - min) / (max - min || 1)) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="legend-title">{title}{unit ? ` (${unit})` : ""}</div>
      </div>
    );
  }

  // categorical
  return (
    <div className="legend legend-categorical">
      <div className="legend-title">{legend.title}</div>
      {legend.items.map(({ color, label }) => (
        <div key={label} className="legend-item">
          <span className="legend-swatch" style={{ background: color }} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
