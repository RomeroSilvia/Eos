import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/AppHeader';
import { ProgressStateCard } from '@/components/progress/ProgressStateCard';
import { ProductStatsSection } from '@/components/progress/stats/ProductStatsSection';
import { RoutineStatsSection } from '@/components/progress/stats/RoutineStatsSection';
import { colors } from '@/constants/colors';
import { useProgressStats } from '@/hooks/useProgressStats';

export default function ProgressStatsScreen() {
  const { error, isLoading, stats } = useProgressStats();

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb="Progreso" title="Estadísticas" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {isLoading ? (
          <ProgressStateCard icon="hourglass-outline" title="Cargando estadísticas..." text="Estamos preparando tu resumen." />
        ) : error ? (
          <ProgressStateCard icon="alert-circle-outline" title="No pudimos cargar tus estadísticas." text={error.message} />
        ) : !stats ? (
          <ProgressStateCard
            icon="bar-chart-outline"
            title="Todavía no hay datos suficientes"
            text="Cuando registres rutinas, tus estadísticas van a aparecer acá."
          />
        ) : (
          <>
            <RoutineStatsSection stats={stats} />
            <ProductStatsSection stats={stats} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 116
  }
});
