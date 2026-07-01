import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import {
  createCenter,
  deleteCenter,
  getCenters,
  getCentersErrorMessage,
  updateCenter,
  type Center
} from '@/services/centers';

type CenterFormState = {
  name: string;
  address: string;
  phone: string;
};

const emptyForm: CenterFormState = {
  name: '',
  address: '',
  phone: ''
};

export default function AdminCentersScreen() {
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [form, setForm] = useState<CenterFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const activeCount = useMemo(() => centers.filter((center) => center.isActive).length, [centers]);

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

  function openCreateModal() {
    setModalMode('create');
    setEditingCenter(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function openEditModal(center: Center) {
    setModalMode('edit');
    setEditingCenter(center);
    setForm({
      name: center.name,
      address: center.address ?? '',
      phone: center.phone ?? ''
    });
    setFormError(null);
  }

  function closeModal() {
    if (isSaving) return;
    setModalMode(null);
    setEditingCenter(null);
    setForm(emptyForm);
    setFormError(null);
  }

  async function handleSubmit() {
    const payload = {
      name: form.name.trim(),
      address: normalizeOptionalField(form.address),
      phone: normalizeOptionalField(form.phone)
    };

    if (!payload.name) {
      setFormError('Escribi el nombre del centro.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (modalMode === 'edit' && editingCenter) {
        await updateCenter(editingCenter.id, payload);
        Alert.alert('Centro actualizado', 'Los cambios fueron guardados.');
      } else {
        await createCenter(payload);
        Alert.alert('Centro creado', 'El centro quedo disponible para administracion.');
      }

      closeModal();
      await loadCenters();
    } catch (saveError) {
      setFormError(getCentersErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  function confirmDelete(center: Center) {
    Alert.alert(
      'Dar de baja centro',
      `El centro "${center.name}" dejara de estar activo. Esta accion no borra su historial.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Dar de baja',
          style: 'destructive',
          onPress: () => {
            void handleDelete(center);
          }
        }
      ]
    );
  }

  async function handleDelete(center: Center) {
    setDeletingId(center.id);

    try {
      await deleteCenter(center.id);
      Alert.alert('Centro dado de baja', 'El centro ya no esta activo.');
      await loadCenters();
    } catch (deleteError) {
      Alert.alert('No pudimos darlo de baja', getCentersErrorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons color={colors.primaryDark} name="business-outline" size={26} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Centros esteticos</Text>
            <Text style={styles.subtitle}>Gestiona los centros disponibles</Text>
          </View>
        </View>

        <Card variant="soft" style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View>
              <Text style={styles.summaryLabel}>Centros activos</Text>
              <Text style={styles.summaryCount}>{activeCount}</Text>
            </View>
            <Button onPress={openCreateModal} style={styles.createButton} textStyle={styles.createButtonText}>
              Nuevo
            </Button>
          </View>
        </Card>

        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Cargando centros...</Text>
          </View>
        ) : null}

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
            <Text style={styles.stateText}>Todavia no hay centros cargados</Text>
            <Pressable style={styles.secondaryButton} onPress={openCreateModal}>
              <Text style={styles.secondaryButtonText}>Crear centro</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !error && centers.length > 0 ? (
          <View style={styles.list}>
            {centers.map((center) => (
              <CenterCard
                center={center}
                disabled={deletingId === center.id}
                key={center.id}
                onDelete={() => confirmDelete(center)}
                onEdit={() => openEditModal(center)}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal animationType="fade" onRequestClose={closeModal} transparent visible={modalMode !== null}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalTitle}>{modalMode === 'edit' ? 'Editar centro' : 'Nuevo centro'}</Text>
                <Text style={styles.modalDescription}>
                  Completa los datos visibles para administracion.
                </Text>
              </View>
              <Pressable accessibilityLabel="Cerrar" onPress={closeModal} style={styles.iconButton}>
                <Ionicons color={colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Nombre</Text>
              <TextInput
                onChangeText={(value) => {
                  setForm((current) => ({ ...current, name: value }));
                  setFormError(null);
                }}
                placeholder="Centro EOS Norte"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={form.name}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Direccion</Text>
              <TextInput
                onChangeText={(value) => setForm((current) => ({ ...current, address: value }))}
                placeholder="Calle 123"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={form.address}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Telefono</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
                placeholder="+54 11 1234-5678"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={form.phone}
              />
            </View>

            {formError ? <Text style={styles.errorText}>{formError}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable disabled={isSaving} onPress={closeModal} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable disabled={isSaving} onPress={handleSubmit} style={[styles.saveButton, isSaving && styles.disabled]}>
                <Text style={styles.actionButtonText}>{isSaving ? 'Guardando...' : 'Guardar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CenterCard({
  center,
  disabled,
  onDelete,
  onEdit
}: {
  center: Center;
  disabled: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  return (
    <Card style={styles.centerCard}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Ionicons color={colors.primaryDark} name="business-outline" size={22} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.centerName}>{center.name}</Text>
          <Text style={styles.centerStatus}>Activo</Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <MetaItem label="Direccion" value={center.address ?? 'No informada'} />
        <MetaItem label="Telefono" value={center.phone ?? 'No informado'} />
      </View>

      <View style={styles.cardActions}>
        <Pressable disabled={disabled} onPress={onDelete} style={[styles.rejectButton, disabled && styles.disabled]}>
          <Text style={styles.actionButtonText}>{disabled ? 'Procesando...' : 'Dar de baja'}</Text>
        </Pressable>
        <Pressable disabled={disabled} onPress={onEdit} style={[styles.saveButton, disabled && styles.disabled]}>
          <Text style={styles.actionButtonText}>Editar</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaItem}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

function normalizeOptionalField(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 40
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14
  },
  headerIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    width: 48
  },
  headerCopy: {
    flex: 1
  },
  title: {
    color: colors.textPrimary,
    fontSize: 25,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
    marginTop: 3
  },
  summaryCard: {
    borderRadius: 14,
    gap: 6
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between'
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '800'
  },
  summaryCount: {
    color: colors.textPrimary,
    fontSize: 38,
    fontWeight: '900'
  },
  createButton: {
    borderRadius: 8,
    minHeight: 44
  },
  createButtonText: {
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
  list: {
    gap: 14
  },
  centerCard: {
    borderRadius: 14,
    gap: 16
  },
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  cardTitleWrap: {
    flex: 1
  },
  centerName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  centerStatus: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2
  },
  metaGrid: {
    gap: 9
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
    fontSize: 15,
    fontWeight: '800',
    marginTop: 3
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46
  },
  rejectButton: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 46
  },
  actionButtonText: {
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
    minHeight: 44,
    paddingHorizontal: 18
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900'
  },
  disabled: {
    opacity: 0.65
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(16, 42, 67, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: 22
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    gap: 14,
    padding: 18,
    width: '100%'
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12
  },
  modalHeaderCopy: {
    flex: 1
  },
  modalTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900'
  },
  modalDescription: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  iconButton: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  formGroup: {
    gap: 7
  },
  inputLabel: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900'
  },
  input: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 46,
    paddingHorizontal: 12
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10
  }
});
