const fs = require('node:fs');
const path = require('node:path');
const { measureScenario, parseArgs: parseWizardArgs } = require('../routine-wizard-performance');
const { audit } = require('./optimization-audit');

function parseArgs(args) {
  const outputArg = args.find((arg) => arg.startsWith('--output='));
  return {
    output: outputArg?.slice('--output='.length) ?? 'artifacts/performance/automated.json',
    wizard: parseWizardArgs(args.filter((arg) => !arg.startsWith('--output=')))
  };
}

async function buildReport(options) {
  const wizard = await Promise.all([
    measureScenario('Step2 -> Step3 optimistic create', ({ navigate, persist }) => {
      const pending = persist();
      navigate();
      return pending;
    }, options.wizard),
    measureScenario('Step3 -> Step4 optimistic update', ({ navigate, persist }) => {
      navigate();
      return persist();
    }, options.wizard)
  ]);
  const optimizations = audit();

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    environment: {
      node: process.version,
      platform: process.platform,
      architecture: process.arch
    },
    wizard: {
      type: 'synthetic-regression-guard',
      thresholdP95Ms: options.wizard.thresholdMs,
      simulatedBackendLatencyMs: options.wizard.latencyMs,
      iterations: options.wizard.iterations,
      status: wizard.every((result) => result.p95Ms <= options.wizard.thresholdMs) ? 'PASS' : 'FAIL',
      results: wizard
    },
    documentedOptimizations: {
      status: optimizations.every((result) => result.status === 'PASS') ? 'PASS' : 'FAIL',
      results: optimizations
    },
    limitations: [
      'El p95 es una guardia sintética; tap-to-first-frame real se obtiene en dispositivo.',
      'Cold start, memoria PSS y batería requieren Android Platform-Tools/ADB y un build depurable.'
    ]
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = await buildReport(options);
  const target = path.resolve(options.output);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Evidencia guardada en ${target}`);
  if (report.wizard.status !== 'PASS' || report.documentedOptimizations.status !== 'PASS') process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = { buildReport, parseArgs };
