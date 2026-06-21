import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { getMyPatients, type PatientRelationStatus, type SpecialistPatient } from '@/services/specialist';

type StatusFilter = 'all' | 'active' | 'inactive';

const filters: { label: string; value: StatusFilter }[] = [
  { label: 'Todos', value: 'all' },
  { label: 'Activos', value: 'active' },
  { label: 'Inactivos', value: 'inactive' }
];

export default function SpecialistPatientsScreen() {
  const router = useRouter();
  const [patients, setPatients] = useState<SpecialistPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setHasError(false);

    try {
      const response = await getMyPatients();
      setPatients(response);
    } catch {
      setPatients([]);
      setHasError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPatients();
    }, [loadPatients])
  );

  const filteredPatients = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return patients.filter((patient) => {
      const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
      const matchesSearch = !normalizedSearch || normalizeText(patient.fullName).includes(normalizedSearch);
      return matchesStatus && matchesSearch;
    });
  }, [patients, search, statusFilter]);

  const showEmptyState = !loading && !hasError && patients.length === 0;
  const showNoResults = !loading && !hasError && patients.length > 0 && filteredPatients.length === 0;

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mis Pacientes</Text>
            <Text style={styles.subtitle}>Gestiona los pacientes asociados a tu cuenta.</Text>
          </View>
        </View>

        <Card style={styles.card}>
          <TextInput
            autoCapitalize="words"
            placeholder="Buscar paciente"
            placeholderTextColor={colors.textMuted}
            onChangeText={setSearch}
            style={styles.input}
            value={search}
          />

          <View style={styles.filtersRow}>
            {filters.map((filter) => {
              const isSelected = statusFilter === filter.value;

              return (
                <Button
                  key={filter.value}
                  onPress={() => setStatusFilter(filter.value)}
                  style={styles.filterButton}
                  variant={isSelected ? 'primary' : 'ghost'}
                >
                  {filter.label}
                </Button>
              );
            })}
          </View>
        </Card>

        {loading ? (
          <StateMessage icon="hourglass-outline" message="Cargando pacientes..." showSpinner />
        ) : hasError ? (
          <StateMessage icon="alert-circle-outline" message="Ocurrio un error al cargar los pacientes." />
        ) : showEmptyState ? (
          <StateMessage icon="people-outline" message="Todavia no tenes pacientes asociados." />
        ) : showNoResults ? (
          <StateMessage icon="search-outline" message="No se encontraron pacientes con ese nombre." />
        ) : (
          <FlatList
            data={filteredPatients}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <PatientCard
                patient={item}
                onPress={() =>
                  router.push(`${routes.specialistPatientDetail.replace('[id]', item.id)}` as Href)
                }
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function PatientCard({ patient, onPress }: { patient: SpecialistPatient; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.patientCard}>
        <View style={styles.patientHeaderRow}>
          <View style={styles.avatarWrap}>
            {patient.profileImageUrl ? (
              <Image source={{ uri: patient.profileImageUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(patient.fullName)}</Text>
            )}
          </View>

          <View style={styles.patientMainInfo}>
            <Text numberOfLines={1} style={styles.patientName}>
              {patient.fullName}
            </Text>
            <Text style={styles.patientMeta}>{formatSkinType(patient.skinType)}</Text>
          </View>

          <Ionicons color={colors.textMuted} name="chevron-forward" size={22} />
        </View>

        <View style={styles.patientDetails}>
          <View style={styles.detailRow}>
            <Ionicons color={colors.primaryDark} name="water-outline" size={16} />
            <Text style={styles.detailText}>Tipo de piel: {formatSkinType(patient.skinType, false)}</Text>
          </View>
          <View style={styles.detailRow}>
            <Ionicons color={colors.primaryDark} name="time-outline" size={16} />
            <Text style={styles.detailText}>Ultima actividad: {formatDate(patient.lastActivityAt)}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <StatusBadge status={patient.status} />
          {patient.skinProfile?.ageRange ? (
            <Text style={styles.ageRange}>Edad: {patient.skinProfile.ageRange}</Text>
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

function StatusBadge({ status }: { status: PatientRelationStatus }) {
  const isActive = status === 'active';
  const isPending = status === 'pending';

  return (
    <View style={[styles.statusBadge, isActive ? styles.statusActive : isPending ? styles.statusPending : styles.statusInactive]}>
      <Text style={[styles.statusText, isActive ? styles.statusTextActive : isPending ? styles.statusTextPending : styles.statusTextInactive]}>
        {isActive ? 'Activo' : isPending ? 'Pendiente' : 'Inactivo'}
      </Text>
    </View>
  );
}

function StateMessage({
  icon,
  message,
  showSpinner = false
}: {
  icon: keyof typeof Ionicons.glyphMap;
  message: string;
  showSpinner?: boolean;
}) {
  return (
    <View style={styles.centeredState}>
      {showSpinner ? <ActivityIndicator color={colors.primary} /> : <Ionicons color={colors.primaryDark} name={icon} size={32} />}
      <Text style={styles.infoText}>{message}</Text>
    </View>
  );
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'P';
}

function formatSkinType(skinType: string | null, withPrefix = true): string {
  if (!skinType || skinType === 'not_defined' || skinType === 'undefined' || skinType === 'unknown') {
    return withPrefix ? 'Piel no registrada' : 'No registrada';
  }

  const labels: Record<string, string> = {
    normal: 'normal',
    dry: 'seca',
    oily: 'grasa',
    mixed: 'mixta',
    sensitive: 'sensible'
  };
  const label = labels[skinType] ?? skinType;

  return withPrefix ? `Piel ${label}` : capitalize(label);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Sin actividad';
  }

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const date = dateOnlyMatch
    ? new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]))
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    flex: 1,
    gap: 14,
    padding: 20,
    paddingBottom: 0
  },
  header: {
    paddingTop: 8
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  card: {
    gap: 10
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 44,
    paddingHorizontal: 12
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  filterButton: {
    flex: 1,
    minWidth: 96
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: 24
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    textAlign: 'center'
  },
  listContent: {
    gap: 10,
    paddingBottom: 120,
    paddingTop: 2
  },
  patientCard: {
    gap: 12
  },
  patientHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 44
  },
  avatarImage: {
    height: '100%',
    width: '100%'
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900'
  },
  patientMainInfo: {
    flex: 1,
    gap: 3
  },
  patientName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  patientMeta: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  patientDetails: {
    gap: 8
  },
  detailRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7
  },
  detailText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18
  },
  cardFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  statusInactive: {
    backgroundColor: colors.pending,
    borderColor: colors.border
  },
  statusPending: {
    backgroundColor: colors.secondaryLight,
    borderColor: colors.secondary
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700'
  },
  statusTextActive: {
    color: colors.primaryDark
  },
  statusTextInactive: {
    color: colors.textSecondary
  },
  statusTextPending: {
    color: colors.secondaryDark
  },
  ageRange: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700'
  }
});
