import { StyleSheet } from 'react-native';
import { colors } from '@/constants/colors';

export const statsStyles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingTop: 8
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  headerText: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    lineHeight: 36
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 3
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 4
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: -8
  },
  subsectionTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900',
    marginTop: 4
  },
  sectionHint: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: -8
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  metricCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    minHeight: 112,
    padding: 15,
    width: '48%'
  },
  metricValue: {
    color: colors.primaryDark,
    fontSize: 27,
    fontWeight: '900'
  },
  metricLabel: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900',
    marginTop: 8
  },
  metricDetail: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 3
  },
  progressCard: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primaryLight,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 18
  },
  progressHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  progressTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  progressDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4
  },
  progressPercent: {
    color: colors.primaryDark,
    fontSize: 28,
    fontWeight: '900'
  },
  progressMessage: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  weekList: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden'
  },
  dayRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 14
  },
  dayInfo: {
    flex: 1,
    minWidth: 0
  },
  dayLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  dayStatus: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 3
  },
  dayNumbers: {
    alignItems: 'flex-end'
  },
  dayCount: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  dayPercent: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  smallStat: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    width: '48%'
  },
  smallStatValue: {
    color: colors.primaryDark,
    fontSize: 23,
    fontWeight: '900'
  },
  smallStatLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4
  },
  rankingList: {
    gap: 10
  },
  rankingItem: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    padding: 15
  },
  rankingInfo: {
    flex: 1,
    minWidth: 0
  },
  routineName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  routineMeta: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3
  },
  routineDetail: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3
  },
  routinePercent: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: '900'
  },
  productRoutineCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 8,
    padding: 15
  },
  productLine: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  productDot: {
    backgroundColor: colors.primary,
    borderRadius: 4,
    height: 8,
    width: 8
  },
  productLineText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 12,
    lineHeight: 17
  },
  unusedText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    maxWidth: 116,
    textAlign: 'right'
  },
  recommendation: {
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primaryLight,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 16
  },
  recommendationText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20
  }
});
