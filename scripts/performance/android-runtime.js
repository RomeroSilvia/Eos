const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { summarize } = require('./lib/statistics');

function parseArgs(args) {
  const options = { iterations: 5, output: null, packageName: null, activity: null };
  for (const arg of args) {
    const [key, value] = arg.split('=');
    if (key === '--package') options.packageName = value;
    if (key === '--activity') options.activity = value;
    if (key === '--iterations' && Number.isInteger(Number(value)) && Number(value) > 0) options.iterations = Number(value);
    if (key === '--output') options.output = value;
  }
  return options;
}

function parseStartOutput(output) {
  const read = (name) => Number(output.match(new RegExp(`${name}:\\s*(\\d+)`))?.[1] ?? NaN);
  return { totalTimeMs: read('TotalTime'), waitTimeMs: read('WaitTime') };
}

function parseMeminfo(output) {
  const totalPssKb = Number(output.match(/TOTAL\s+(\d+)/)?.[1] ?? NaN);
  return { totalPssKb, totalPssMb: Number.isFinite(totalPssKb) ? Math.round(totalPssKb / 102.4) / 10 : null };
}

function adb(args) {
  return execFileSync('adb', args, { encoding: 'utf8' });
}

function measure(options) {
  if (!options.packageName || !options.activity) {
    throw new Error('Uso: --package=com.eos.app --activity=.MainActivity [--iterations=5] [--output=archivo.json]');
  }

  adb(['get-state']);
  const starts = [];
  for (let index = 0; index < options.iterations; index += 1) {
    adb(['shell', 'am', 'force-stop', options.packageName]);
    const result = parseStartOutput(adb(['shell', 'am', 'start', '-W', '-n', `${options.packageName}/${options.activity}`]));
    if (!Number.isFinite(result.totalTimeMs)) throw new Error('ADB no devolvió TotalTime para el arranque.');
    starts.push(result.totalTimeMs);
  }

  const memory = parseMeminfo(adb(['shell', 'dumpsys', 'meminfo', options.packageName]));
  const report = {
    generatedAt: new Date().toISOString(),
    device: adb(['shell', 'getprop', 'ro.product.model']).trim(),
    androidVersion: adb(['shell', 'getprop', 'ro.build.version.release']).trim(),
    packageName: options.packageName,
    activity: options.activity,
    coldStartMs: summarize(starts),
    memory,
    notes: 'Cold start medido después de force-stop. PSS medido con la app abierta tras la última iteración.'
  };

  if (options.output) {
    const target = path.resolve(options.output);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

if (require.main === module) {
  try {
    const report = measure(parseArgs(process.argv.slice(2)));
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

module.exports = { measure, parseArgs, parseMeminfo, parseStartOutput };
