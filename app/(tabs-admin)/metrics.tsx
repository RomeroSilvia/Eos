import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/constants/colors';
import {
  getCenters,
  getCentersErrorMessage,
  type Center
} from '@/services/centers';

export default function AdminMetricsScreen() {
  const router = useRouter();
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCenters = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setCenters(await getCenters());
    } catch (loadError) {
      setError(getCentersErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCenters();
  }, [loadCenters]);

  function goToAdminHome() {
    router.replace('/(tabs-admin)' as never);
  }

  function openCenterMetrics(centerId: string) {
    router.push(`/(tabs-admin)/metrics/${centerId}` as never);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Volver al panel administrativo"
            accessibilityRole="button"
            onPress={goToAdminHome}
            style={styles.backButton}
          >
            <Ionicons color={colors.primaryDark} name="chevron-back" size={22} />
          </Pressable>
          <View style={styles.headerIcon}>
            <Ionicons color={colors.primaryDark} name="stats-chart-outline" size={24} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Métricas por centro</Text>
            <Text style={styles.subtitle}>Seleccioná un centro para ver su resumen operativo</Text>
          </View>
        </View>

        {isLoading ? <LoadingState message="Cargando centros..." /> : null}

        {!isLoading && error ? (
          <View style={styles.stateBox}>
            <Ionicons color={colors.error} name="alert-circle-outline" size={28} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={loadCenters}>
              <Text style={styles.secondaryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !error && centers.length === 0 ? (
          <View style={styles.stateBox}>
            <Ionicons color={colors.primaryDark} name="business-outline" size={30} />
            <Text style={styles.stateText}>Todavía no hay centros activos para medir</Text>
          </View>
        ) : null}

        {!isLoading && !error && centers.length > 0 ? (
          <View style={styles.list}>
            {centers.map((center) => (
              <CenterMetricsListItem
                center={center}
                key={center.id}
                onPress={() => openCenterMetrics(center.id)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function CenterMetricsListItem({
  center,
  onPress
}: {
  center: Center;
  onPress: () => void;
}) {
  const location = [center.city, center.province].filter(Boolean).join(', ');

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card style={styles.centerCard}>
        {center.imageUrl ? (
          <Image resizeMode="cover" source={{ uri: center.imageUrl }} style={styles.centerImage} />
        ) : (
          <View style={styles.centerImagePlaceholder}>
            <View style={styles.centerImagePlaceholderIcon}>
              <Ionicons color={colors.primaryDark} name="sparkles-outline" size={24} />
            </View>
            <Text style={styles.centerImagePlaceholderText}>EOS</Text>
          </View>
        )}

        <View style={styles.centerHeader}>
          <View style={styles.centerIcon}>
            <Ionicons color={colors.primaryDark} name="business-outline" size={22} />
          </View>
          <View style={styles.centerCopy}>
            <Text style={styles.centerName}>{center.name}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>Activo</Text>
            </View>
          </View>
        </View>

        <View style={styles.centerMetaRow}>
          <Ionicons color={colors.textSecondary} name="location-outline" size={17} />
          <Text style={styles.centerMetaText}>{location || 'Ubicación no cargada'}</Text>
        </View>

        <View style={styles.centerFooter}>
          <View style={styles.specialistsChip}>
            <Ionicons color={colors.primaryDark} name="people-outline" size={16} />
            <Text style={styles.specialistsText}>Especialistas asignados: {center.specialistsCount ?? 0}</Text>
          </View>
          <Ionicons color={colors.primary} name="chevron-forward" size={20} />
        </View>
      </Card>
    </Pressable>
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
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 19,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 21,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  headerCopy: {
    flex: 1,
    minWidth: 0
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2
  },
  stateBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 22
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center'
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center'
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900'
  },
  list: {
    gap: 12
  },
  centerCard: {
    borderRadius: 14,
    gap: 12
  },
  centerImage: {
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    height: 96,
    width: '100%'
  },
  centerImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    height: 96,
    justifyContent: 'center',
    width: '100%'
  },
  centerImagePlaceholderIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  centerImagePlaceholderText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  centerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  centerIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  centerCopy: {
    flex: 1,
    minWidth: 0
  },
  centerName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  statusText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '900'
  },
  centerMetaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7
  },
  centerMetaText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 14,
    fontWeight: '700'
  },
  centerFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between'
  },
  specialistsChip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primaryLight,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  specialistsText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900'
  },
});
