import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MonthCalendarCard } from "@/components/progress/MonthCalendarCard";
import { ProgressHistoryPreview } from "@/components/progress/ProgressHistoryPreview";
import { ProgressMetricCard } from "@/components/progress/ProgressMetricCard";
import { ProgressSummaryCard } from "@/components/progress/ProgressSummaryCard";
import { StreakCard } from "@/components/progress/StreakCard";
import { colors } from "@/constants/colors";
import { useProgress } from "@/hooks/useProgress";

export default function ProgressScreen() {
  const { error, isLoading, summary } = useProgress();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyState}>
          <Ionicons color={colors.primary} name="hourglass-outline" size={34} />
          <Text style={styles.emptyTitle}>Cargando progreso</Text>
          <Text style={styles.emptyText}>Estamos buscando tus ultimos registros.</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyState}>
          <Ionicons color={colors.error} name="alert-circle-outline" size={34} />
          <Text style={styles.emptyTitle}>No pudimos cargar tu progreso</Text>
          <Text style={styles.emptyText}>{error.message}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!summary) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.emptyState}>
          <Ionicons color={colors.primary} name="bar-chart-outline" size={34} />
          <Text style={styles.emptyTitle}>Sin progreso todavia</Text>
          <Text style={styles.emptyText}>
            Cuando completes rutinas, tus metricas van a aparecer aca.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Progreso</Text>
            <Text style={styles.subtitle}>
              Tu constancia en el cuidado de la piel
            </Text>
          </View>
        </View>

        <ProgressSummaryCard progress={summary.weeklyProgress} />
        <StreakCard streak={summary.streakProgress} />

        <View style={styles.metricsRow}>
          {summary.metrics.map((metric) => (
            <ProgressMetricCard key={metric.id} metric={metric} />
          ))}
        </View>

        <View style={styles.statsHeaderRow}>
          <Text style={styles.statsHeaderLabel}>Resumen mensual</Text>

          <Pressable onPress={() => undefined} hitSlop={8}>
            <Text style={styles.moreStatsText}>Ver más estadísticas &gt;</Text>
          </Pressable>
        </View>

        <MonthCalendarCard days={summary.calendarProgress} />
        <ProgressHistoryPreview
          items={summary.historyPreview}
          onPressViewAll={() => undefined}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 116,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    marginTop: 4,
  },
  headerIcon: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 19,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  metricsRow: {
    flexDirection: "row",
    gap: 12,
  },
  emptyState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 32,
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "900",
    marginTop: 14,
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center",
  },
  moreStatsContainer: {
    alignItems: "flex-end",
    marginTop: 10,
    marginBottom: 8,
    paddingHorizontal: 4,
  },

  moreStatsButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },

  moreStatsText: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.primary,
  },
   statsHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 7,
  },

  statsHeaderLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.textPrimary,
  }
});
