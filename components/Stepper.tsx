import { View, Text, StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

type StepperProps = {
  current: number;
  total?: number;
};

export function Stepper({ current, total = 4 }: StepperProps) {
  return (
    <View style={styles.container}>
      {[...Array(total)].map((_, index) => {
        const step = index + 1;
        const isDone = step < current;
        const isActive = step === current;

        return (
          <View key={step} style={styles.stepWrapper}>
            <View
              style={[
                styles.circle,
                isDone && styles.done,
                isActive && styles.active
              ]}
            >
              <Text
                style={[
                  styles.text,
                  isDone && styles.textDone,
                  isActive && styles.textActive
                ]}
              >
                {isDone ? '✓' : step}
              </Text>
            </View>

            {step < total && <View style={styles.line} />}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12
  },
  stepWrapper: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  circle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface
  },
  active: {
    borderColor: colors.secondary,
  },
  done: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary
  },
  text: {
    fontSize: 12,
    color: colors.textSecondary
  },
  textDone: {
    color: colors.surface
  },
  textActive: {
    color: colors.secondary
  },
  line: {
    width: 32,
    height: 2,
    backgroundColor: colors.border
  }
});