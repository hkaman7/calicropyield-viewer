// Generates "nice" round tick values spanning [min, max], the same idea as
// d3's ticks()/matplotlib's default locator - e.g. niceTicks(0, 437, 5)
// gives [0, 100, 200, 300, 400] rather than 5 awkwardly-spaced raw values.
export function niceTicks(min, max, count = 5) {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) return [];

  const rawStep = (max - min) / (count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const residual = rawStep / magnitude;
  let step;
  if (residual > 5) step = 10 * magnitude;
  else if (residual > 2) step = 5 * magnitude;
  else if (residual > 1) step = 2 * magnitude;
  else step = magnitude;

  const start = Math.ceil(min / step) * step;
  const ticks = [];
  for (let t = start; t <= max + step * 1e-6; t += step) {
    ticks.push(Math.round(t * 1e6) / 1e6);
  }
  return ticks;
}
