import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProgressBar } from '@/components/progress/ProgressBar';
import { colors } from '@/constants/colors';
import type { PeriodProgress, ProgressCTA } from '@/types/progress';

type ProgressSummaryCardProps = {
  progress: PeriodProgress;
  cta: ProgressCTA;
  onPressCTA: (target: ProgressCTA['target']) => void;
};

export function ProgressSummaryCard({ progress, cta, onPressCTA }: ProgressSummaryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Cumplimiento semanal</Text>
          <Text style={styles.title}>{progress.percent}%</Text>
        </View>
        <View style={styles.iconWrap}>
          <Ionicons color={colors.primaryDark} name="sparkles-outline" size={24} />
        </View>
      </View>

      <Text style={styles.description}>{progress.label}</Text>

      <ProgressBar percentage={progress.percent} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={cta.label}
        onPress={() => onPressCTA(cta.target)}
        style={({ pressed }) => [styles.ctaButton, pressed ? styles.ctaButtonPressed : null]}
      >
        <View style={styles.ctaTextBlock}>
          <Text style={styles.ctaLabel}>{cta.label}</Text>
          {cta.description ? <Text style={styles.ctaDescription}>{cta.description}</Text> : null}
        </View>
        <Ionicons color={colors.surface} name="arrow-forward" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primaryLight,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 22
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  eyebrow: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '700'
  },
  title: {
    color: colors.primaryDark,
    fontSize: 54,
    fontWeight: '900',
    lineHeight: 60,
    marginTop: 4
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 20,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21
  },
  ctaButton: {
    alignItems: 'center',
    backgroundColor: colors.secondaryDark,
    borderRadius: 18,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 54,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  ctaButtonPressed: {
    opacity: 0.85
  },
  ctaTextBlock: {
    flex: 1,
    gap: 2,
    minWidth: 0
  },
  ctaLabel: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900'
  },
  ctaDescription: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '700',
    opacity: 0.82
  }
});
