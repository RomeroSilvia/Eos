import { useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

export type RoutineWizardStepName =
  | 'Create'
  | 'Step2'
  | 'Step3'
  | 'Step4'
  | 'Step5'
  | 'Step6';

type RoutineWizardTransition = {
  from: RoutineWizardStepName;
  to: RoutineWizardStepName;
  startedAt: number;
  metadata?: Record<string, unknown>;
};

let pendingTransition: RoutineWizardTransition | null = null;

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function shouldProfile() {
  return process.env.NODE_ENV !== 'production';
}

function round(ms: number) {
  return Math.round(ms * 10) / 10;
}

export function markRoutineWizardTransition(
  from: RoutineWizardStepName,
  to: RoutineWizardStepName,
  metadata?: Record<string, unknown>
) {
  const startedAt = now();

  if (shouldProfile()) {
    pendingTransition = { from, to, startedAt, metadata };
  }

  return startedAt;
}

export function clearRoutineWizardTransition() {
  pendingTransition = null;
}

export function logRoutineWizardWork(
  label: string,
  startedAt: number,
  metadata?: Record<string, unknown>
) {
  if (!shouldProfile()) {
    return;
  }

  console.info('[routine-wizard:work]', {
    label,
    durationMs: round(now() - startedAt),
    ...metadata
  });
}

export function useRoutineWizardProfiler(
  step: RoutineWizardStepName,
  metadata?: Record<string, unknown>
) {
  const metadataRef = useRef(metadata);

  useEffect(() => {
    metadataRef.current = metadata;
  }, [metadata]);

  useEffect(() => {
    if (!shouldProfile()) {
      return undefined;
    }

    const mountedAt = now();
    const transition = pendingTransition?.to === step ? pendingTransition : null;

    const frameId = requestAnimationFrame(() => {
      const firstFrameAt = now();
      const payload = {
        step,
        mountMs: round(firstFrameAt - mountedAt),
        tapToFirstFrameMs: transition ? round(firstFrameAt - transition.startedAt) : null,
        from: transition?.from ?? null,
        metadata: {
          ...transition?.metadata,
          ...metadataRef.current
        }
      };

      console.info('[routine-wizard:first-frame]', payload);

      if (transition) {
        pendingTransition = null;
      }
    });

    const interaction = InteractionManager.runAfterInteractions(() => {
      console.info('[routine-wizard:interactions-complete]', {
        step,
        elapsedMs: round(now() - mountedAt)
      });
    });

    return () => {
      cancelAnimationFrame(frameId);
      interaction.cancel();
    };
  }, [step]);
}
