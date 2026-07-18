import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/constants/colors';
import { getAuditLogErrorMessage, getAuditLogs } from '@/services/audit';
import type { AuditEntity, AuditLogEntry } from '@/types/audit';

const ENTITY_OPTIONS: { value: AuditEntity | 'all'; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'routine', label: 'Rutinas' },
  { value: 'specialist_profile', label: 'Especialista' },
  { value: 'center', label: 'Centros' },
  { value: 'subscription', label: 'Suscripciones' },
  { value: 'product', label: 'Productos' },
  { value: 'user_profile', label: 'Usuario' },
  { value: 'skin_profile', label: 'Test de piel' },
  { value: 'specialist_relation', label: 'Vínculo especialista' }
];

const ACTION_LABELS: Record<string, string> = {
  create: 'Creación',
  update: 'Edición',
  delete: 'Baja',
  approve: 'Aprobación',
  reject: 'Rechazo',
  login: 'Inicio de sesión',
  role_change: 'Cambio de rol'
};

const ENTITY_LABELS: Record<string, string> = {
  routine: 'Rutina',
  specialist_profile: 'Especialista',
  center: 'Centro',
  subscription: 'Suscripción',
  product: 'Producto',
  user_profile: 'Perfil de usuario',
  skin_profile: 'Test de piel',
  specialist_relation: 'Vínculo con especialista'
};

type DateFieldName = 'from' | 'to';

export default function AuditLogScreen() {
  const router = useRouter();

  const listRef = useRef<FlatList>(null);

  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [entityFilter, setEntityFilter] = useState<AuditEntity | 'all'>('all');
  const [actorNameFilter, setActorNameFilter] = useState('');
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [openDateField, setOpenDateField] = useState<DateFieldName | null>(null);
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const loadData = useCallback(async (targetPage: number) => {
    setIsLoading(true);
    setError(null);
    setEntries([]);

    try {
      const result = await getAuditLogs({
        entity: entityFilter === 'all' ? undefined : entityFilter,
        actorName: actorNameFilter.trim() || undefined,
        from: fromDate ? toIsoDate(fromDate) : undefined,
        to: toDate ? toIsoDate(toDate) : undefined,
        page: targetPage
      });

      setEntries(result.items);
      setTotal(result.total);
      setPage(result.page);
      setLimit(result.limit);
    } catch (loadError) {
      setError(getAuditLogErrorMessage(loadError));
      setEntries([]);
    } finally {
      setIsLoading(false);
    }
  }, [entityFilter, actorNameFilter, fromDate, toDate]);

  const goToPage = useCallback(
    (targetPage: number) => {
      listRef.current?.scrollToOffset({ offset: 0, animated: true });
      void loadData(targetPage);
    },
    [loadData]
  );

  useFocusEffect(
    useCallback(() => {
      goToPage(1);
    }, [goToPage])
  );

  function handleApplyFilters() {
    if (fromDate && toDate && fromDate > toDate) {
      setDateRangeError('La fecha "desde" no puede ser posterior a "hasta".');
      return;
    }

    setDateRangeError(null);
    goToPage(1);
  }

  function handleClearFilters() {
    setEntityFilter('all');
    setActorNameFilter('');
    setFromDate(null);
    setToDate(null);
    setDateRangeError(null);
  }

  function handleDateChange(field: DateFieldName, event: DateTimePickerEvent, selectedDate?: Date) {
    setOpenDateField(Platform.OS === 'ios' ? openDateField : null);

    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    if (field === 'from') {
      setFromDate(selectedDate);
    } else {
      setToDate(selectedDate);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const hasPreviousPage = page > 1;
  const hasNextPage = page < totalPages;

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        ref={listRef}
        contentContainerStyle={styles.content}
        data={entries}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View style={styles.headerSection}>
            <View style={styles.header}>
              <Pressable
                accessibilityLabel="Volver al panel administrativo"
                accessibilityRole="button"
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons color={colors.primaryDark} name="arrow-back" size={22} />
              </Pressable>
              <View style={styles.headerCopy}>
                <Text style={styles.title}>Registro de auditoría</Text>
                <Text style={styles.subtitle}>Consultá quién hizo qué cambio y cuándo</Text>
              </View>
            </View>

            <Card style={styles.filtersCard}>
              <Text style={styles.filtersTitle}>Filtros</Text>

              <Text style={styles.fieldLabel}>Entidad</Text>
              <View accessibilityRole="radiogroup" style={styles.entityChips}>
                {ENTITY_OPTIONS.map((option) => {
                  const isActive = entityFilter === option.value;
                  return (
                    <Pressable
                      accessibilityLabel={`Filtrar por entidad ${option.label}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      key={option.value}
                      onPress={() => setEntityFilter(option.value)}
                      style={[styles.chip, isActive && styles.chipActive]}
                    >
                      <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.fieldLabel}>Nombre del actor</Text>
              <TextInput
                accessibilityLabel="Filtrar por nombre del usuario, especialista o administrador que hizo la acción"
                onChangeText={setActorNameFilter}
                placeholder="Ej: nombre y apellido"
                placeholderTextColor={colors.textMuted}
                style={styles.textInput}
                value={actorNameFilter}
              />

              <View style={styles.dateRow}>
                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Desde</Text>
                  <Pressable
                    accessibilityLabel={`Seleccionar fecha desde, valor actual ${fromDate ? formatDateLabel(fromDate) : 'sin definir'}`}
                    accessibilityRole="button"
                    onPress={() => setOpenDateField('from')}
                    style={styles.dateButton}
                  >
                    <Ionicons color={colors.primary} name="calendar-outline" size={18} />
                    <Text style={styles.dateButtonText}>{fromDate ? formatDateLabel(fromDate) : 'Sin definir'}</Text>
                  </Pressable>
                </View>

                <View style={styles.dateField}>
                  <Text style={styles.fieldLabel}>Hasta</Text>
                  <Pressable
                    accessibilityLabel={`Seleccionar fecha hasta, valor actual ${toDate ? formatDateLabel(toDate) : 'sin definir'}`}
                    accessibilityRole="button"
                    onPress={() => setOpenDateField('to')}
                    style={styles.dateButton}
                  >
                    <Ionicons color={colors.primary} name="calendar-outline" size={18} />
                    <Text style={styles.dateButtonText}>{toDate ? formatDateLabel(toDate) : 'Sin definir'}</Text>
                  </Pressable>
                </View>
              </View>

              {openDateField ? (
                <DateTimePicker
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  mode="date"
                  onChange={(event, selectedDate) => handleDateChange(openDateField, event, selectedDate)}
                  value={(openDateField === 'from' ? fromDate : toDate) ?? new Date()}
                />
              ) : null}

              {dateRangeError ? (
                <Text accessibilityRole="alert" style={styles.errorText}>
                  {dateRangeError}
                </Text>
              ) : null}

              <View style={styles.filterActions}>
                <Pressable accessibilityLabel="Limpiar filtros" accessibilityRole="button" onPress={handleClearFilters} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Limpiar</Text>
                </Pressable>
                <Pressable accessibilityLabel="Aplicar filtros" accessibilityRole="button" onPress={handleApplyFilters} style={styles.primaryButton}>
                  <Text style={styles.primaryButtonText}>Aplicar filtros</Text>
                </Pressable>
              </View>
            </Card>

            {isLoading ? <LoadingState message="Cargando registro de auditoría..." /> : null}

            {!isLoading && error ? (
              <View style={styles.stateBox}>
                <Ionicons color={colors.error} name="alert-circle-outline" size={28} />
                <Text style={styles.errorText}>{error}</Text>
                <Pressable accessibilityLabel="Reintentar carga" accessibilityRole="button" onPress={() => loadData(page)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryButtonText}>Reintentar</Text>
                </Pressable>
              </View>
            ) : null}

            {!isLoading && !error && entries.length === 0 ? (
              <View style={styles.stateBox}>
                <Ionicons color={colors.primaryDark} name="document-text-outline" size={30} />
                <Text style={styles.stateText}>No hay eventos de auditoría para estos filtros</Text>
              </View>
            ) : null}
          </View>
        }
        ListFooterComponent={
          !isLoading && !error && entries.length > 0 ? (
            <View style={styles.pagination}>
              <Pressable
                accessibilityLabel="Página anterior"
                accessibilityRole="button"
                accessibilityState={{ disabled: !hasPreviousPage }}
                disabled={!hasPreviousPage}
                onPress={() => goToPage(page - 1)}
                style={[styles.paginationButton, !hasPreviousPage && styles.disabled]}
              >
                <Text style={styles.paginationButtonText}>Anterior</Text>
              </Pressable>
              <Text style={styles.paginationLabel}>
                Página {page} de {totalPages}
              </Text>
              <Pressable
                accessibilityLabel="Página siguiente"
                accessibilityRole="button"
                accessibilityState={{ disabled: !hasNextPage }}
                disabled={!hasNextPage}
                onPress={() => goToPage(page + 1)}
                style={[styles.paginationButton, !hasNextPage && styles.disabled]}
              >
                <Text style={styles.paginationButtonText}>Siguiente</Text>
              </Pressable>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <AuditLogCard
            entry={item}
            expanded={expandedId === item.id}
            onToggle={() => setExpandedId((current) => (current === item.id ? null : item.id))}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function AuditLogCard({
  entry,
  expanded,
  onToggle
}: {
  entry: AuditLogEntry;
  expanded: boolean;
  onToggle: () => void;
}) {
  const isDelete = entry.action === 'delete';
  const isCreate = entry.action === 'create';
  const isBatchRow =
    isPlainObject(entry.metadata) &&
    (entry.metadata.changeType === 'routine_batch' || entry.metadata.changeType === 'routine_step_batch');
  const hasRoutineChange = entry.routineChange !== null;
  const isLegacyBatchWithoutChange = isBatchRow && !hasRoutineChange;

  const changeBefore = hasRoutineChange ? entry.routineChange!.before : entry.before;
  const changeAfter = hasRoutineChange ? entry.routineChange!.after : entry.after;

  const diffRows = isLegacyBatchWithoutChange ? [] : buildDiffRows(changeBefore, changeAfter);
  const createRows = isLegacyBatchWithoutChange ? [] : buildValueRows(changeAfter);

  const showStepBox = entry.routineStepDetails !== null && entry.routineStepDetails.length > 0;

  const actionDetailPresent = isCreate ? createRows.length > 0 : diffRows.length > 0;
  const hasDetails = isDelete || actionDetailPresent || showStepBox;

  return (
    <Card style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <View style={styles.entryHeaderCopy}>
          <Text style={styles.entryAction}>{getActionLabel(entry.action)}</Text>
          <Text style={styles.entryEntity}>{getEntityLabel(entry.entity)}</Text>
        </View>
      </View>

      <View style={styles.entryMetaGrid}>
        <EntryMetaItem label="Actor" value={entry.actorName} />
        <EntryMetaItem label="Perfil" value={entry.actorProfile ?? 'No informado'} />
        <EntryMetaItem label="Registro" value={entry.entityLabel} />
        <EntryMetaItem label="Fecha" value={formatDateTimeLabel(entry.createdAt)} />
      </View>

      {hasDetails ? (
        <Pressable
          accessibilityLabel={expanded ? 'Ocultar detalle del cambio' : 'Ver detalle del cambio'}
          accessibilityRole="button"
          onPress={onToggle}
          style={styles.detailToggle}
        >
          <Ionicons color={colors.primary} name={expanded ? 'chevron-up' : 'chevron-down'} size={18} />
          <Text style={styles.detailToggleText}>{expanded ? 'Ocultar detalle' : 'Ver detalle'}</Text>
        </Pressable>
      ) : null}

      {expanded ? (
        <View style={styles.detailBox}>
          {isDelete ? <DeleteSummaryBlock entry={entry} /> : null}
          {!isDelete && isCreate && !isLegacyBatchWithoutChange ? <CreateBlock rows={createRows} /> : null}
          {!isDelete && !isCreate && !isLegacyBatchWithoutChange && diffRows.length > 0 ? <UpdateDiffBlocks rows={diffRows} /> : null}
          {showStepBox && entry.routineStepDetails ? <RoutineStepBlock details={entry.routineStepDetails} /> : null}
        </View>
      ) : null}
    </Card>
  );
}

function DeleteSummaryBlock({ entry }: { entry: AuditLogEntry }) {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailValue}>Elemento eliminado: {entry.entityLabel}</Text>
    </View>
  );
}

function CreateBlock({ rows }: { rows: ValueRow[] }) {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Datos creados</Text>
      {rows.map((row) => (
        <FieldValue key={row.label} label={row.label} value={row.value} />
      ))}
    </View>
  );
}

function UpdateDiffBlocks({ rows }: { rows: DiffRow[] }) {
  return (
    <View style={styles.updateSection}>
      <View style={styles.detailBlock}>
        <Text style={styles.detailLabel}>Antes</Text>
        {rows.map((row) => (
          <FieldValue key={row.label} label={row.label} value={row.before} />
        ))}
      </View>
      <View style={styles.detailBlock}>
        <Text style={styles.detailLabel}>Después</Text>
        {rows.map((row) => (
          <FieldValue key={row.label} label={row.label} value={row.after} />
        ))}
      </View>
    </View>
  );
}

function FieldValue({ label, value, depth = 0 }: { label: string; value: unknown; depth?: number }) {
  if (isPlainObject(value)) {
    const entries = Object.entries(value).filter(([key]) => !HIDDEN_FIELD_KEYS.has(key));

    return (
      <View>
        <Text style={[styles.detailValue, depth > 0 && { marginLeft: depth * 12 }]}>
          {depth > 0 ? '• ' : ''}
          {label}:
        </Text>
        {entries.length === 0 ? (
          <Text style={[styles.detailValue, { marginLeft: (depth + 1) * 12 }]}>Sin datos</Text>
        ) : (
          entries.map(([key, entryValue]) => (
            <FieldValue key={key} label={humanizeKey(key)} value={entryValue} depth={depth + 1} />
          ))
        )}
      </View>
    );
  }

  return (
    <Text style={[styles.detailValue, depth > 0 && { marginLeft: depth * 12 }]}>
      {depth > 0 ? '• ' : ''}
      {label}: {formatValue(value)}
    </Text>
  );
}

function RoutineStepBlock({ details }: { details: NonNullable<AuditLogEntry['routineStepDetails']> }) {
  return (
    <View style={styles.detailBlock}>
      <Text style={styles.detailLabel}>Pasos de rutina ({details.length})</Text>
      {details.map((detail, index) => (
        <View key={index} style={index > 0 ? styles.routineStepItem : undefined}>
          <Text style={styles.detailValue}>Categoría: {detail.category ?? 'Sin categoría'}</Text>
          <Text style={styles.detailValue}>Paso: {detail.stepName ?? 'Sin nombre'}</Text>
          <Text style={styles.detailValue}>Productos agregados: {detail.hasProducts ? 'Sí' : 'No'}</Text>
        </View>
      ))}
    </View>
  );
}

function EntryMetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

type DiffRow = { label: string; before: unknown; after: unknown };
type ValueRow = { label: string; value: unknown };

const HIDDEN_FIELD_KEYS = new Set([
  'id',
  'created_at',
  'updated_at',
  'createdAt',
  'updatedAt',
  'plan_id',
  'planId',
  'owner_id',
  'ownerId',
  'routine_id',
  'routineId'
]);

const FIELD_LABELS: Record<string, string> = {
  name: 'Nombre',
  full_name: 'Nombre completo',
  address: 'Dirección',
  phone: 'Teléfono',
  city: 'Ciudad',
  province: 'Provincia',
  is_active: 'Activo',
  isActive: 'Activo',
  status: 'Estado',
  level: 'Nivel',
  price: 'Precio',
  plan_id: 'Plan',
  planId: 'Plan',
  owner_type: 'Tipo de titular',
  owner_id: 'Titular',
  license_status: 'Estado de matrícula',
  licenseStatus: 'Estado de matrícula',
  rejection_reason: 'Motivo de rechazo',
  rejectionReason: 'Motivo de rechazo',
  specialty: 'Especialidad',
  center_id: 'Centro',
  centerId: 'Centro',
  category: 'Categoría',
  notes: 'Notas',
  description: 'Descripción',
  time_of_day: 'Horario',
  timeOfDay: 'Horario',
  image_url: 'Imagen',
  imageUrl: 'Imagen',
  started_at: 'Inicio',
  ends_at: 'Fin',
  endsAt: 'Fin',
  created_at: 'Creado',
  updated_at: 'Actualizado',
  chatEnabled: 'Chat habilitado',
  chatImagesEnabled: 'Imágenes en chat habilitadas',
  videoCallsEnabled: 'Videollamadas habilitadas',
  maxMonthlyVideoCalls: 'Videollamadas mensuales máximas',
  messageTokensPerMonth: 'Mensajes por mes',
  imageTokensPerMonth: 'Imágenes por mes',
  durationDays: 'Duración (días)',
  features: 'Funcionalidades',
  stepId: 'Paso',
  stepName: 'Nombre del paso',
  changeType: 'Tipo de cambio',
  email: 'Email',
  role: 'Rol',
  skin_type: 'Tipo de piel',
  skinType: 'Tipo de piel',
  id: 'ID',
  owner: 'Titular',
  subscription_plans: 'Plan'
};

function buildDiffRows(before: unknown, after: unknown): DiffRow[] {
  const beforeObj = isPlainObject(before) ? (before as Record<string, unknown>) : null;
  const afterObj = isPlainObject(after) ? (after as Record<string, unknown>) : null;

  if (!beforeObj && !afterObj) return [];

  const keys = new Set([...(beforeObj ? Object.keys(beforeObj) : []), ...(afterObj ? Object.keys(afterObj) : [])]);
  const rows: DiffRow[] = [];

  for (const key of keys) {
    if (HIDDEN_FIELD_KEYS.has(key)) continue;

    const beforeValue = beforeObj ? beforeObj[key] : undefined;
    const afterValue = afterObj ? afterObj[key] : undefined;

    if (beforeObj && afterObj && JSON.stringify(beforeValue) === JSON.stringify(afterValue)) {
      continue;
    }

    rows.push({
      label: humanizeKey(key),
      before: beforeObj ? beforeValue : undefined,
      after: afterObj ? afterValue : undefined
    });
  }

  return rows;
}

function buildValueRows(value: unknown): ValueRow[] {
  if (!isPlainObject(value)) return [];

  return Object.entries(value as Record<string, unknown>)
    .filter(([key]) => !HIDDEN_FIELD_KEYS.has(key))
    .map(([key, entryValue]) => ({
      label: humanizeKey(key),
      value: entryValue
    }));
}

function humanizeKey(key: string): string {
  if (FIELD_LABELS[key]) return FIELD_LABELS[key];

  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatValue(value: unknown): string {
  if (value === null || typeof value === 'undefined') return 'Sin definir';
  if (typeof value === 'boolean') return value ? 'Sí' : 'No';
  if (typeof value === 'number') return String(value);

  if (typeof value === 'string') {
    const date = new Date(value);
    const looksLikeDate = /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(date.getTime());
    return looksLikeDate ? formatDateTimeLabel(value) : value;
  }

  if (Array.isArray(value)) {
    return value.length === 0 ? 'Ninguno' : value.map(formatValue).join(', ');
  }

  if (isPlainObject(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    return entries.length === 0 ? 'Sin datos' : entries.map(([key, entryValue]) => `${humanizeKey(key)}: ${formatValue(entryValue)}`).join(' · ');
  }

  return String(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getActionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

function getEntityLabel(entity: string): string {
  return ENTITY_LABELS[entity] ?? entity;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatDateLabel(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
}

function formatDateTimeLabel(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 14,
    padding: 20,
    paddingBottom: 40
  },
  headerSection: {
    gap: 16,
    marginBottom: 4
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  headerCopy: {
    flex: 1
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
  filtersCard: {
    gap: 10
  },
  filtersTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 6
  },
  entityChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  chip: {
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 14,
    justifyContent: 'center'
  },
  chipActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700'
  },
  chipTextActive: {
    color: colors.primaryDark,
    fontWeight: '900'
  },
  textInput: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 44,
    paddingHorizontal: 12
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12
  },
  dateField: {
    flex: 1
  },
  dateButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12
  },
  dateButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  filterActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900'
  },
  secondaryButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 18
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900'
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
  entryCard: {
    borderRadius: 14,
    gap: 12,
    marginBottom: 12
  },
  entryHeader: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  entryHeaderCopy: {
    flex: 1
  },
  entryAction: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  entryEntity: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2
  },
  entryMetaGrid: {
    gap: 8
  },
  metaItem: {
    backgroundColor: colors.primarySuperLight,
    borderRadius: 8,
    padding: 10
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
    marginTop: 3
  },
  detailToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minHeight: 44
  },
  detailToggleText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800'
  },
  detailBox: {
    gap: 10
  },
  updateSection: {
    gap: 10
  },
  detailSectionLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  detailBlock: {
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10
  },
  detailLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 4
  },
  detailValue: {
    color: colors.textPrimary,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 12,
    lineHeight: 18
  },
  routineStepItem: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    marginTop: 8,
    paddingTop: 8
  },
  pagination: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    marginTop: 8
  },
  paginationButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 16
  },
  paginationButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900'
  },
  paginationLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700'
  },
  disabled: {
    opacity: 0.5
  }
});
