import { Slot } from 'expo-router';
import { RoutineWizardProvider } from '@/hooks/useRoutineWizard';

export default function RoutineLayout() {
  return (
    <RoutineWizardProvider>
      <Slot />
    </RoutineWizardProvider>
  );
}
