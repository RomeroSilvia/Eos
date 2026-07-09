import { createContext, useCallback, useContext, useMemo, useReducer } from 'react';
import type { PropsWithChildren } from 'react';
import type { Routine, RoutineStep, RoutineTimeOfDay } from '@/types/routine';
import {
  createRoutine,
  getRoutineById,
  getStepsByRoutine,
  updateRoutine
} from '@/services/routines';
import { assignRoutineToPatient } from '@/services/specialist';

type RoutineWizardState = {
  routineId?: string;
  assignClientId?: string;
  name: string;
  selectedGoalId: number | null;
  time_of_day: RoutineTimeOfDay | null;
  description: string;
  steps: RoutineStep[];
  routine?: Routine;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
};

type RoutineWizardAction =
  | { type: 'SET_ROUTINE_ID'; payload?: string }
  | { type: 'SET_ASSIGN_CLIENT_ID'; payload?: string }
  | { type: 'SET_NAME'; payload: string }
  | { type: 'SET_SELECTED_GOAL_ID'; payload: number | null }
  | { type: 'SET_TIME_OF_DAY'; payload: RoutineTimeOfDay | null }
  | { type: 'SET_DESCRIPTION'; payload: string }
  | { type: 'SET_STEPS'; payload: RoutineStep[] }
  | { type: 'ADD_OR_UPDATE_STEP'; payload: RoutineStep }
  | { type: 'REMOVE_STEP'; payload: string }
  | { type: 'SET_ROUTINE_FROM_RESPONSE'; payload: Routine }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SUBMITTING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'RESET' };

const initialState: RoutineWizardState = {
  routineId: undefined,
  assignClientId: undefined,
  name: '',
  selectedGoalId: null,
  time_of_day: null,
  description: '',
  steps: [],
  isLoading: false,
  isSubmitting: false,
  error: null
};

function reducer(state: RoutineWizardState, action: RoutineWizardAction): RoutineWizardState {
  switch (action.type) {
    case 'SET_ROUTINE_ID':
      return { ...state, routineId: action.payload };
    case 'SET_ASSIGN_CLIENT_ID':
      return { ...state, assignClientId: action.payload };
    case 'SET_NAME':
      return { ...state, name: action.payload };
    case 'SET_SELECTED_GOAL_ID':
      return { ...state, selectedGoalId: action.payload };
    case 'SET_TIME_OF_DAY':
      return { ...state, time_of_day: action.payload };
    case 'SET_DESCRIPTION':
      return { ...state, description: action.payload };
    case 'SET_STEPS':
      return { ...state, steps: action.payload };
    case 'ADD_OR_UPDATE_STEP': {
      const existingIndex = state.steps.findIndex((step) => step.id === action.payload.id);
      if (existingIndex >= 0) {
        const nextSteps = [...state.steps];
        nextSteps[existingIndex] = action.payload;
        return { ...state, steps: nextSteps };
      }
      return { ...state, steps: [...state.steps, action.payload] };
    }
    case 'REMOVE_STEP':
      return { ...state, steps: state.steps.filter((step) => step.id !== action.payload) };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_ROUTINE_FROM_RESPONSE':
      return {
        ...state,
        routine: action.payload,
        routineId: action.payload.id,
        name: action.payload.name,
        description: action.payload.description ?? '',
        time_of_day: action.payload.time_of_day ?? null
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

type UseRoutineWizardContext = {
  state: RoutineWizardState;
  setRoutineId: (routineId?: string) => void;
  setAssignClientId: (assignClientId?: string) => void;
  setName: (name: string) => void;
  setSelectedGoalId: (goalId: number | null) => void;
  setTimeOfDay: (timeOfDay: RoutineTimeOfDay | null) => void;
  setDescription: (description: string) => void;
  createAndStoreRoutine: (payload: {
    name: string;
    description?: string | null;
    time_of_day?: string | null;
  }) => Promise<Routine>;
  assignRoutineToPatient: (patientId: string, payload: {
    name: string;
    description?: string | null;
    time_of_day?: string | null;
  }) => Promise<Routine>;
  updateRoutineData: (
    id: string,
    data: {
      name?: string;
      description?: string | null;
      time_of_day?: RoutineTimeOfDay | null;
      is_active?: boolean;
    }
  ) => Promise<Routine>;
  loadRoutineState: (routineId: string) => Promise<void>;
  refreshSteps: (routineId?: string) => Promise<void>;
  addOrUpdateStep: (step: RoutineStep) => void;
  removeStepFromState: (stepId: string) => void;
  resetWizard: () => void;
};

const RoutineWizardContext = createContext<UseRoutineWizardContext | undefined>(undefined);

export function RoutineWizardProvider({ children }: PropsWithChildren<{}>) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const setRoutineId = useCallback((routineId?: string) => {
    dispatch({ type: 'SET_ROUTINE_ID', payload: routineId });
  }, []);

  const setAssignClientId = useCallback((assignClientId?: string) => {
    dispatch({ type: 'SET_ASSIGN_CLIENT_ID', payload: assignClientId });
  }, []);

  const setName = useCallback((name: string) => {
    dispatch({ type: 'SET_NAME', payload: name });
  }, []);

  const setSelectedGoalId = useCallback((goalId: number | null) => {
    dispatch({ type: 'SET_SELECTED_GOAL_ID', payload: goalId });
  }, []);

  const setTimeOfDay = useCallback((timeOfDay: RoutineTimeOfDay | null) => {
    dispatch({ type: 'SET_TIME_OF_DAY', payload: timeOfDay });
  }, []);

  const setDescription = useCallback((description: string) => {
    dispatch({ type: 'SET_DESCRIPTION', payload: description });
  }, []);

  const setSteps = useCallback((steps: RoutineStep[]) => {
    dispatch({ type: 'SET_STEPS', payload: steps });
  }, []);

  const addOrUpdateStep = useCallback((step: RoutineStep) => {
    dispatch({ type: 'ADD_OR_UPDATE_STEP', payload: step });
  }, []);

  const removeStepFromState = useCallback((stepId: string) => {
    dispatch({ type: 'REMOVE_STEP', payload: stepId });
  }, []);

  const setLoading = useCallback((isLoading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: isLoading });
  }, []);

  const setSubmitting = useCallback((isSubmitting: boolean) => {
    dispatch({ type: 'SET_SUBMITTING', payload: isSubmitting });
  }, []);

  const setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  const resetWizard = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const createAndStoreRoutine = useCallback(
    async (payload: {
      name: string;
      description?: string | null;
      time_of_day?: string | null;
    }) => {
      setSubmitting(true);
      setError(null);

      try {
        const routine = await createRoutine(payload);

        dispatch({ type: 'SET_ROUTINE_FROM_RESPONSE', payload: routine });
        return routine;
      } catch (error) {
        console.error(error);
        setError('No pudimos crear la rutina. Intenta nuevamente.');
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [setError]
  );

  const assignRoutineToPatientWithState = useCallback(
    async (
      patientId: string,
      payload: {
        name: string;
        description?: string | null;
        time_of_day?: string | null;
      }
    ) => {
      setSubmitting(true);
      setError(null);

      try {
        const routine = await assignRoutineToPatient(patientId, payload);

        dispatch({ type: 'SET_ROUTINE_FROM_RESPONSE', payload: routine });
        return routine;
      } catch (error) {
        console.error(error);
        setError('No pudimos asignar la rutina. Intenta nuevamente.');
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [setError]
  );

  const updateRoutineData = useCallback(
    async (
      id: string,
      data: {
        name?: string;
        description?: string | null;
        time_of_day?: RoutineTimeOfDay | null;
        is_active?: boolean;
      }
    ) => {
      setSubmitting(true);
      setError(null);

      try {
        const routine = await updateRoutine(id, data);

        dispatch({ type: 'SET_ROUTINE_FROM_RESPONSE', payload: routine });

        return routine;
      } catch (error) {
        console.error(error);
        setError('No pudimos actualizar la rutina. Intenta nuevamente.');
        throw error;
      } finally {
        setSubmitting(false);
      }
    },
    [setError]
  );

  const loadRoutineState = useCallback(
    async (routineId: string) => {
      setLoading(true);
      setError(null);

      try {
        const [routine, steps] = await Promise.all([
          getRoutineById(routineId),
          getStepsByRoutine(routineId)
        ]);

        dispatch({ type: 'SET_ROUTINE_FROM_RESPONSE', payload: routine });
        dispatch({ type: 'SET_STEPS', payload: steps });
      } catch (error) {
        console.error(error);
        setError('No pudimos cargar la rutina.');
      } finally {
        setLoading(false);
      }
    },
    [setError]
  );

  const refreshSteps = useCallback(
    async (routineId?: string) => {
      const id = routineId ?? state.routineId;
      if (!id) return;

      setLoading(true);
      setError(null);

      try {
        const steps = await getStepsByRoutine(id);
        setSteps(steps);
      } catch (error) {
        console.error(error);
        setError('No pudimos cargar los pasos de la rutina.');
      } finally {
        setLoading(false);
      }
    },
    [setError, setSteps, state.routineId]
  );

  const value = useMemo(
    () => ({
      state,
      setRoutineId,
      setAssignClientId,
      setName,
      setSelectedGoalId,
      setTimeOfDay,
      setDescription,
      createAndStoreRoutine,
      assignRoutineToPatient: assignRoutineToPatientWithState,
      updateRoutineData,
      loadRoutineState,
      refreshSteps,
      addOrUpdateStep,
      removeStepFromState,
      resetWizard
    }),
    [
      state,
      setRoutineId,
      setAssignClientId,
      setName,
      setSelectedGoalId,
      setTimeOfDay,
      setDescription,
      createAndStoreRoutine,
      assignRoutineToPatientWithState,
      updateRoutineData,
      loadRoutineState,
      refreshSteps,
      addOrUpdateStep,
      removeStepFromState,
      resetWizard
    ]
  );

  return <RoutineWizardContext.Provider value={value}>{children}</RoutineWizardContext.Provider>;
}

export function useRoutineWizard() {
  const context = useContext(RoutineWizardContext);
  if (!context) {
    throw new Error('useRoutineWizard must be used within a RoutineWizardProvider');
  }
  return context;
}
