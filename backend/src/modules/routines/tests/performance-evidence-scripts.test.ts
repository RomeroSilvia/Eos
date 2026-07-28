const { summarize } = require('../../../../../scripts/performance/lib/statistics.js');
const { parseArgs, parseMeminfo, parseStartOutput } = require('../../../../../scripts/performance/android-runtime.js');
const { audit } = require('../../../../../scripts/performance/optimization-audit.js');

describe('scripts de evidencia de performance', () => {
  it('resume muestras con percentil 95 y promedio', () => {
    expect(summarize([100, 120, 80, 110])).toEqual({
      samples: 4, min: 80, median: 100, p95: 120, max: 120, average: 102.5
    });
  });

  it('parsea tiempos de arranque informados por adb', () => {
    expect(parseStartOutput('Status: ok\nTotalTime: 438\nWaitTime: 451')).toEqual({ totalTimeMs: 438, waitTimeMs: 451 });
  });

  it('parsea memoria PSS informada por adb', () => {
    expect(parseMeminfo(' TOTAL  123456  1000  2000')).toEqual({ totalPssKb: 123456, totalPssMb: 120.6 });
  });

  it('parsea las opciones de medición Android', () => {
    expect(parseArgs(['--package=com.eos', '--activity=.MainActivity', '--iterations=8'])).toMatchObject({
      packageName: 'com.eos', activity: '.MainActivity', iterations: 8
    });
  });

  it('confirma los mecanismos declarados en la documentación técnica', () => {
    expect(audit().filter((result: { status: string }) => result.status === 'FAIL')).toEqual([]);
  });
});
