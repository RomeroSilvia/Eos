function percentile(values, pct) {
  if (!Array.isArray(values) || values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function summarize(values) {
  if (!values.length) return { samples: 0, min: null, median: null, p95: null, max: null, average: null };
  return {
    samples: values.length,
    min: Math.min(...values),
    median: percentile(values, 50),
    p95: percentile(values, 95),
    max: Math.max(...values),
    average: Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
  };
}

module.exports = { percentile, summarize };
