const {
  measureScenario,
  parseArgs,
  percentile
} = require('../../../../../scripts/routine-wizard-performance.js');

describe('routine wizard performance script', () => {
  it('calcula percentiles para la guardia de performance', () => {
    expect(percentile([10, 20, 30, 40], 50)).toBe(20);
    expect(percentile([10, 20, 30, 40], 95)).toBe(40);
  });

  it('parsea opciones de threshold, iteraciones y latencia', () => {
    expect(parseArgs(['--threshold=80', '--iterations=5', '--latency=120'])).toEqual({
      thresholdMs: 80,
      iterations: 5,
      latencyMs: 120
    });
  });

  it('aprueba cuando la navegacion ocurre antes del trabajo async', async () => {
    const result = await measureScenario(
      'transicion optimista',
      ({ navigate, persist }: { navigate: () => void; persist: () => Promise<void> }) => {
        const pending = persist();
        navigate();
        return pending;
      },
      { thresholdMs: 100, iterations: 5, latencyMs: 1 }
    );

    expect(result.p95Ms).toBeLessThanOrEqual(100);
  });

  it('falla cuando una transicion no agenda navegacion sincronica', async () => {
    await expect(
      measureScenario(
        'transicion bloqueante',
        ({ persist }: { persist: () => Promise<void> }) => persist(),
        { thresholdMs: 100, iterations: 1, latencyMs: 1 }
      )
    ).rejects.toThrow('did not schedule navigation synchronously');
  });
});
