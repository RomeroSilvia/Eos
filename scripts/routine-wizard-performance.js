const { performance } = require('node:perf_hooks');

const DEFAULT_THRESHOLD_MS = 100;
const DEFAULT_ITERATIONS = 200;
const DEFAULT_LATENCY_MS = 100;

function parseArgs(args) {
  return args.reduce(
    (acc, arg) => {
      const [key, rawValue] = arg.split('=');
      const value = Number(rawValue);

      if (key === '--threshold' && Number.isFinite(value)) {
        acc.thresholdMs = value;
      }
      if (key === '--iterations' && Number.isFinite(value)) {
        acc.iterations = value;
      }
      if (key === '--latency' && Number.isFinite(value)) {
        acc.latencyMs = value;
      }

      return acc;
    },
    {
      thresholdMs: DEFAULT_THRESHOLD_MS,
      iterations: DEFAULT_ITERATIONS,
      latencyMs: DEFAULT_LATENCY_MS
    }
  );
}

function backgroundWork(latencyMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, latencyMs);
  });
}

function percentile(values, pct) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((pct / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function round(value) {
  return Math.round(value * 10) / 10;
}

async function measureScenario(name, handler, scenarioOptions = parseArgs([])) {
  const samples = [];
  const pendingWork = [];

  for (let i = 0; i < scenarioOptions.iterations; i += 1) {
    let navigatedAt = null;
    const startedAt = performance.now();

    const promise = handler({
      navigate: () => {
        if (navigatedAt === null) {
          navigatedAt = performance.now();
        }
      },
      persist: () => backgroundWork(scenarioOptions.latencyMs)
    });

    if (navigatedAt === null) {
      throw new Error(`${name} did not schedule navigation synchronously.`);
    }

    samples.push(navigatedAt - startedAt);
    pendingWork.push(promise);
  }

  await Promise.allSettled(pendingWork);

  const result = {
    name,
    minMs: round(Math.min(...samples)),
    p95Ms: round(percentile(samples, 95)),
    maxMs: round(Math.max(...samples))
  };

  if (result.p95Ms > scenarioOptions.thresholdMs) {
    throw new Error(
      `${name} p95=${result.p95Ms}ms exceeds ${scenarioOptions.thresholdMs}ms.`
    );
  }

  return result;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const results = await Promise.all([
    measureScenario('Step2 -> Step3 optimistic create', ({ navigate, persist }) => {
      const pending = persist();
      navigate();
      return pending;
    }, options),
    measureScenario('Step3 -> Step4 optimistic update', ({ navigate, persist }) => {
      navigate();
      return persist();
    }, options)
  ]);

  console.log('Routine wizard performance guard');
  console.table(results);
  console.log(`Threshold: p95 <= ${options.thresholdMs}ms`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  measureScenario,
  parseArgs,
  percentile
};
