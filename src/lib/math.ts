export const clamp = (n: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, n));

export function holtWinters(
  series: number[],
  alpha = 0.5,
  beta = 0.3,
  gamma = 0.1,
  season = 24
) {
  if (!series.length)
    return {
      level: 0,
      trend: 0,
      seasonals: Array(season).fill(0),
      forecast: [] as number[],
    };
  const s = season;
  const L = series.length;
  const seasonals = Array(s)
    .fill(0)
    .map((_, i) => series[i] ?? 0);
  let level = series[0],
    trend = (series[1] ?? series[0]) - series[0];
  const out: number[] = [];
  for (let t = 0; t < L; t++) {
    const val = series[t] ?? 0;
    const idx = t % s;
    const lastLevel = level;
    const lastTrend = trend;
    const lastSeason = seasonals[idx];
    level = alpha * (val - lastSeason) + (1 - alpha) * (lastLevel + lastTrend);
    trend = beta * (level - lastLevel) + (1 - beta) * lastTrend;
    seasonals[idx] = gamma * (val - level) + (1 - gamma) * lastSeason;
    out.push(level + trend + seasonals[idx]);
  }
  return { level, trend, seasonals, forecast: out };
}
