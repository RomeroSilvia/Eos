import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
  assignSpecialistCenter,
  getAdminErrorMessage,
  getAdminSpecialists,
  type PendingSpecialist
} from '@/services/admin';
import {
  createCenter,
  deleteCenter,
  getCenterSpecialists,
  getCenters,
  getCentersErrorMessage,
  getUpdateCenterErrorMessage,
  updateCenter,
  uploadCenterImage,
  type CenterSpecialist,
  type Center
} from '@/services/centers';

type CenterFormState = {
  name: string;
  address: string;
  city: string;
  province: string;
  phone: string;
  imageUri: string | null;
};

const emptyForm: CenterFormState = {
  name: '',
  address: '',
  city: '',
  province: '',
  phone: '',
  imageUri: null
};

export default function AdminCentersScreen() {
  const router = useRouter();
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingCenter, setEditingCenter] = useState<Center | null>(null);
  const [form, setForm] = useState<CenterFormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningCenter, setAssigningCenter] = useState<Center | null>(null);
  const [specialists, setSpecialists] = useState<PendingSpecialist[]>([]);
  const [specialistsLoading, setSpecialistsLoading] = useState(false);
  const [specialistsError, setSpecialistsError] = useState<string | null>(null);
  const [assigningSpecialistId, setAssigningSpecialistId] = useState<string | null>(null);
  const [assignmentFeedback, setAssignmentFeedback] = useState<string | null>(null);
  const [viewingCenter, setViewingCenter] = useState<Center | null>(null);
  const [centerSpecialists, setCenterSpecialists] = useState<CenterSpecialist[]>([]);
  const [centerSpecialistsLoading, setCenterSpecialistsLoading] = useState(false);
  const [centerSpecialistsError, setCenterSpecialistsError] = useState<string | null>(null);
  const [isPickingImage, setIsPickingImage] = useState(false);
  const [expandedCenterIds, setExpandedCenterIds] = useState<Record<string, boolean>>({});
  const [openCenterMenuId, setOpenCenterMenuId] = useState<string | null>(null);

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
      city: center.city ?? '',
      province: center.province ?? '',
      phone: center.phone ?? '',
      imageUri: null
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

  function toggleCenterDetails(centerId: string) {
    setExpandedCenterIds((current) => ({
      ...current,
      [centerId]: !current[centerId]
    }));
  }

  function toggleCenterMenu(centerId: string) {
    setOpenCenterMenuId((current) => (current === centerId ? null : centerId));
  }

  function closeCenterMenu() {
    setOpenCenterMenuId(null);
  }

  async function handleSubmit() {
    const payload = {
      name: form.name.trim(),
      address: normalizeOptionalField(form.address),
      city: normalizeOptionalField(form.city),
      province: normalizeOptionalField(form.province),
      phone: normalizeOptionalField(form.phone)
    };

    if (!payload.name) {
      setFormError('Escribí el nombre del centro.');
      return;
    }

    setIsSaving(true);
    setFormError(null);

    try {
      if (modalMode === 'edit' && editingCenter) {
        const updatedCenter = await updateCenter(editingCenter.id, payload);
        if (form.imageUri) {
          await uploadCenterImage(updatedCenter.id, form.imageUri);
        }
        Alert.alert('Centro actualizado', 'Los cambios fueron guardados.');
      } else {
        const createdCenter = await createCenter(payload);
        if (form.imageUri) {
          await uploadCenterImage(createdCenter.id, form.imageUri);
        }
        Alert.alert('Centro creado', 'El centro quedó disponible para administración.');
      }

      closeModal();
      await loadCenters();
    } catch (saveError) {
      setFormError(modalMode === 'edit'
        ? getUpdateCenterErrorMessage(saveError)
        : getCentersErrorMessage(saveError));
    } finally {
      setIsSaving(false);
    }
  }

  async function pickCenterImage() {
    try {
      setIsPickingImage(true);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setFormError('Necesitamos permiso para elegir una imagen.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [16, 9],
        mediaTypes: 'images',
        quality: 0.8
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      const compressed = await ImageManipulator.manipulateAsync(
        asset.uri,
        [{ resize: { width: 1400 } }],
        { compress: 0.75, format: ImageManipulator.SaveFormat.JPEG }
      );

      setForm((current) => ({ ...current, imageUri: compressed.uri }));
      setFormError(null);
    } catch {
      setFormError('No pudimos preparar la imagen. Intentá con otra foto.');
    } finally {
      setIsPickingImage(false);
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

  async function openSpecialistsModal(center: Center) {
    setAssigningCenter(center);
    setSpecialistsError(null);
    setAssignmentFeedback(null);

    if (specialists.length > 0) {
      return;
    }

    await loadSpecialists();
  }

  async function openViewSpecialistsModal(center: Center) {
    setViewingCenter(center);
    setCenterSpecialists([]);
    setCenterSpecialistsError(null);
    setCenterSpecialistsLoading(true);

    try {
      setCenterSpecialists(await getCenterSpecialists(center.id));
    } catch (loadError) {
      setCenterSpecialistsError(getCentersErrorMessage(loadError));
    } finally {
      setCenterSpecialistsLoading(false);
    }
  }

  function closeViewSpecialistsModal() {
    setViewingCenter(null);
    setCenterSpecialists([]);
    setCenterSpecialistsError(null);
    setCenterSpecialistsLoading(false);
  }

  async function openCenterInMaps(center: Center) {
    if (!center.address) return;

    const query = `${center.name} ${center.address ?? ''} ${center.city ?? ''} ${center.province ?? ''}`;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('No pudimos abrir Maps', 'Intentá nuevamente en unos minutos.');
    }
  }

  async function loadSpecialists() {
    setSpecialistsLoading(true);
    setSpecialistsError(null);
    setAssignmentFeedback(null);

    try {
      setSpecialists(await getAdminSpecialists());
    } catch (loadError) {
      setSpecialistsError(getAdminErrorMessage(loadError));
    } finally {
      setSpecialistsLoading(false);
    }
  }

  function closeSpecialistsModal() {
    if (assigningSpecialistId) return;
    setAssigningCenter(null);
    setSpecialistsError(null);
    setAssignmentFeedback(null);
  }

  async function handleAssignSpecialist(specialist: PendingSpecialist, centerId: string | null) {
    setAssigningSpecialistId(specialist.specialistProfileId);
    setSpecialistsError(null);
    setAssignmentFeedback(null);

    try {
      const updated = await assignSpecialistCenter(specialist.specialistProfileId, centerId);
      setSpecialists((current) => current.map((item) => (
        item.specialistProfileId === updated.specialistProfileId ? updated : item
      )));
      updateCenterSpecialistCounts(specialist.centerId, updated.centerId);
      setAssignmentFeedback(centerId === null
        ? 'Especialista desasociado correctamente.'
        : 'Especialista asignado correctamente.');
    } catch (assignError) {
      setSpecialistsError(getAdminErrorMessage(assignError));
    } finally {
      setAssigningSpecialistId(null);
    }
  }

  function updateCenterSpecialistCounts(previousCenterId: string | null, nextCenterId: string | null) {
    if (previousCenterId === nextCenterId) return;

    setCenters((current) => current.map((center) => {
      if (center.id === previousCenterId) {
        return {
          ...center,
          specialistsCount: Math.max((center.specialistsCount ?? 0) - 1, 0)
        };
      }

      if (center.id === nextCenterId) {
        return {
          ...center,
          specialistsCount: (center.specialistsCount ?? 0) + 1
        };
      }

      return center;
    }));
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Volver"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons color={colors.primaryDark} name="chevron-back" size={22} />
          </Pressable>
          <View style={styles.headerIcon}>
            <Ionicons color={colors.primaryDark} name="business-outline" size={26} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Centros estéticos</Text>
            <Text style={styles.subtitle}>Gestioná los centros disponibles</Text>
          </View>
        </View>

        <Card variant="soft" style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryCopy}>
              <Text style={styles.summaryLabel}>Centros activos</Text>
              <Text style={styles.summaryCount}>{activeCount}</Text>
            </View>
            <Button onPress={openCreateModal} style={styles.createButton} textStyle={styles.createButtonText}>
              + Nuevo centro
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
            <Text style={styles.stateText}>Todavía no hay centros cargados</Text>
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
                isExpanded={Boolean(expandedCenterIds[center.id])}
                isMenuOpen={openCenterMenuId === center.id}
                key={center.id}
                onDelete={() => {
                  closeCenterMenu();
                  confirmDelete(center);
                }}
                onEdit={() => {
                  closeCenterMenu();
                  openEditModal(center);
                }}
                onOpenMaps={() => {
                  void openCenterInMaps(center);
                }}
                onViewSpecialists={() => {
                  closeCenterMenu();
                  void openViewSpecialistsModal(center);
                }}
                onManageSpecialists={() => {
                  void openSpecialistsModal(center);
                }}
                onToggleDetails={() => toggleCenterDetails(center.id)}
                onToggleMenu={() => toggleCenterMenu(center.id)}
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
                  Completá los datos visibles para administración.
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
              <Text style={styles.inputLabel}>Dirección</Text>
              <TextInput
                onChangeText={(value) => setForm((current) => ({ ...current, address: value }))}
                placeholder="Calle 123"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={form.address}
              />
            </View>

            <View style={styles.formRow}>
              <View style={styles.formRowItem}>
                <Text style={styles.inputLabel}>Ciudad</Text>
                <TextInput
                  onChangeText={(value) => setForm((current) => ({ ...current, city: value }))}
                  placeholder="CABA"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  value={form.city}
                />
              </View>
              <View style={styles.formRowItem}>
                <Text style={styles.inputLabel}>Provincia</Text>
                <TextInput
                  onChangeText={(value) => setForm((current) => ({ ...current, province: value }))}
                  placeholder="Buenos Aires"
                  placeholderTextColor={colors.textMuted}
                  style={styles.input}
                  value={form.province}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Teléfono</Text>
              <TextInput
                keyboardType="phone-pad"
                onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))}
                placeholder="+54 11 1234-5678"
                placeholderTextColor={colors.textMuted}
                style={styles.input}
                value={form.phone}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.inputLabel}>Imagen</Text>
              <Pressable disabled={isPickingImage} onPress={pickCenterImage} style={[styles.imagePicker, isPickingImage && styles.disabled]}>
                {form.imageUri || editingCenter?.imageUrl ? (
                  <Image source={{ uri: form.imageUri ?? editingCenter?.imageUrl ?? undefined }} style={styles.formImagePreview} />
                ) : (
                  <View style={styles.formImagePlaceholder}>
                    <Ionicons color={colors.primaryDark} name="image-outline" size={24} />
                    <Text style={styles.formImagePlaceholderText}>Subir imagen del centro</Text>
                  </View>
                )}
              </Pressable>
              <Text style={styles.helperText}>
                {isPickingImage ? 'Preparando imagen...' : 'JPG, PNG o WEBP. Si Storage no esta configurado, se guardaran los datos sin romper.'}
              </Text>
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

      <Modal animationType="slide" onRequestClose={closeSpecialistsModal} transparent visible={assigningCenter !== null}>
        <View style={styles.modalBackdrop}>
          <View style={styles.specialistsModalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalTitle}>Asignar especialistas</Text>
                <Text style={styles.modalDescription}>
                  {assigningCenter ? `Centro: ${assigningCenter.name}` : 'Selecciona un centro'}
                </Text>
                <Text style={styles.modalHint}>
                  Revisa quien ya pertenece a este centro, quien esta en otro y quien aun no tiene centro.
                </Text>
              </View>
              <Pressable accessibilityLabel="Cerrar asignacion" onPress={closeSpecialistsModal} style={styles.iconButton}>
                <Ionicons color={colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>

            {specialistsLoading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stateText}>Cargando especialistas...</Text>
              </View>
            ) : null}

            {!specialistsLoading && assignmentFeedback ? (
              <View style={styles.feedbackBox}>
                <Ionicons color={colors.primaryDark} name="checkmark-circle-outline" size={20} />
                <Text style={styles.feedbackText}>{assignmentFeedback}</Text>
              </View>
            ) : null}

            {!specialistsLoading && specialistsError ? (
              <View style={styles.stateBox}>
                <Ionicons color={colors.error} name="alert-circle-outline" size={28} />
                <Text style={styles.errorText}>{specialistsError}</Text>
                <Pressable style={styles.secondaryButton} onPress={loadSpecialists}>
                  <Text style={styles.secondaryButtonText}>Reintentar</Text>
                </Pressable>
              </View>
            ) : null}

            {!specialistsLoading && !specialistsError && specialists.length === 0 ? (
              <View style={styles.stateBox}>
                <Ionicons color={colors.primaryDark} name="people-outline" size={30} />
                <Text style={styles.stateText}>No hay especialistas registrados.</Text>
              </View>
            ) : null}

            {!specialistsLoading && !specialistsError && specialists.length > 0 ? (
              <ScrollView contentContainerStyle={styles.specialistsList} showsVerticalScrollIndicator={false}>
                {specialists.map((specialist) => (
                  <SpecialistAssignmentItem
                    center={assigningCenter}
                    disabled={assigningSpecialistId === specialist.specialistProfileId}
                    key={specialist.specialistProfileId}
                    onAssign={() => {
                      if (!assigningCenter) return;
                      void handleAssignSpecialist(specialist, assigningCenter.id);
                    }}
                    onClear={() => {
                      void handleAssignSpecialist(specialist, null);
                    }}
                    specialist={specialist}
                  />
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal animationType="slide" onRequestClose={closeViewSpecialistsModal} transparent visible={viewingCenter !== null}>
        <View style={styles.modalBackdrop}>
          <View style={styles.specialistsModalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderCopy}>
                <Text style={styles.modalTitle}>Especialistas asignados</Text>
                <Text style={styles.modalDescription}>
                  {viewingCenter ? `Centro: ${viewingCenter.name}` : 'Centro seleccionado'}
                </Text>
              </View>
              <Pressable accessibilityLabel="Cerrar especialistas" onPress={closeViewSpecialistsModal} style={styles.iconButton}>
                <Ionicons color={colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>

            {centerSpecialistsLoading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stateText}>Cargando especialistas...</Text>
              </View>
            ) : null}

            {!centerSpecialistsLoading && centerSpecialistsError ? (
              <View style={styles.stateBox}>
                <Ionicons color={colors.error} name="alert-circle-outline" size={28} />
                <Text style={styles.errorText}>{centerSpecialistsError}</Text>
                {viewingCenter ? (
                  <Pressable style={styles.secondaryButton} onPress={() => void openViewSpecialistsModal(viewingCenter)}>
                    <Text style={styles.secondaryButtonText}>Reintentar</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {!centerSpecialistsLoading && !centerSpecialistsError && centerSpecialists.length === 0 ? (
              <View style={styles.stateBox}>
                <Ionicons color={colors.primaryDark} name="people-outline" size={30} />
                <Text style={styles.stateText}>Este centro todavia no tiene especialistas asignados.</Text>
              </View>
            ) : null}

            {!centerSpecialistsLoading && !centerSpecialistsError && centerSpecialists.length > 0 ? (
              <ScrollView contentContainerStyle={styles.specialistsList} showsVerticalScrollIndicator={false}>
                {centerSpecialists.map((specialist) => (
                  <AssignedSpecialistItem key={specialist.specialistProfileId} specialist={specialist} />
                ))}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function CenterCard({
  center,
  disabled,
  isExpanded,
  isMenuOpen,
  onDelete,
  onEdit,
  onManageSpecialists,
  onOpenMaps,
  onToggleDetails,
  onToggleMenu,
  onViewSpecialists
}: {
  center: Center;
  disabled: boolean;
  isExpanded: boolean;
  isMenuOpen: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onManageSpecialists: () => void;
  onOpenMaps: () => void;
  onToggleDetails: () => void;
  onToggleMenu: () => void;
  onViewSpecialists: () => void;
}) {
  return (
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

      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Ionicons color={colors.primaryDark} name="business-outline" size={22} />
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.centerName}>{center.name}</Text>
          <Text style={styles.centerStatus}>Activo</Text>
        </View>
        <View style={styles.overflowWrap}>
          <Pressable
            accessibilityLabel="Abrir acciones del centro"
            accessibilityRole="button"
            disabled={disabled}
            onPress={onToggleMenu}
            style={[styles.overflowButton, disabled && styles.disabled]}
          >
            <Ionicons color={colors.textSecondary} name="ellipsis-horizontal" size={22} />
          </Pressable>

          {isMenuOpen ? (
            <View style={styles.overflowMenu}>
              <Pressable onPress={onViewSpecialists} style={styles.overflowMenuItem}>
                <Ionicons color={colors.textPrimary} name="people-outline" size={17} />
                <Text style={styles.overflowMenuText}>Ver especialistas</Text>
              </Pressable>
              <Pressable onPress={onEdit} style={styles.overflowMenuItem}>
                <Ionicons color={colors.textPrimary} name="create-outline" size={17} />
                <Text style={styles.overflowMenuText}>Editar</Text>
              </Pressable>
              <Pressable onPress={onDelete} style={styles.overflowMenuItem}>
                <Ionicons color={colors.secondaryDark} name="trash-outline" size={17} />
                <Text style={styles.overflowMenuDangerText}>Dar de baja</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.specialistsSummaryBadge}>
        <Ionicons color={colors.primaryDark} name="people-outline" size={18} />
        <Text style={styles.specialistsSummaryText}>Especialistas asignados: {center.specialistsCount ?? 0}</Text>
      </View>

      <Pressable accessibilityRole="button" onPress={onToggleDetails} style={styles.detailsToggle}>
        <Text style={styles.detailsToggleText}>
          {isExpanded ? 'Ocultar detalles del centro' : 'Ver detalles del centro'}
        </Text>
        <Ionicons color={colors.primary} name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} />
      </Pressable>

      {isExpanded ? (
        <View style={styles.detailsPanel}>
          <View style={styles.metaGrid}>
            <MetaItem label="Dirección" value={center.address ?? 'Dirección no cargada'} />
            <MetaItem label="Ciudad" value={center.city ?? 'Ciudad no cargada'} />
            <MetaItem label="Provincia" value={center.province ?? 'Provincia no cargada'} />
            <MetaItem label="Teléfono" value={center.phone ?? 'Teléfono no cargado'} />
          </View>

          <Pressable
            disabled={!center.address}
            onPress={onOpenMaps}
            style={[styles.mapsButton, !center.address && styles.disabled]}
          >
            <Ionicons color={colors.primary} name="map-outline" size={18} />
            <Text style={styles.mapsButtonText}>
              {center.address ? 'Ver en Google Maps' : 'Dirección no cargada'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.primaryActionRow}>
        <Pressable disabled={disabled} onPress={onManageSpecialists} style={[styles.primaryActionButton, disabled && styles.disabled]}>
          <Ionicons color={colors.surface} name="person-add-outline" size={18} />
          <Text style={styles.actionButtonText}>Asignar especialistas</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function SpecialistAssignmentItem({
  center,
  disabled,
  onAssign,
  onClear,
  specialist
}: {
  center: Center | null;
  disabled: boolean;
  onAssign: () => void;
  onClear: () => void;
  specialist: PendingSpecialist;
}) {
  const isAssignedToCenter = Boolean(center && specialist.centerId === center.id);
  const hasOtherCenter = Boolean(specialist.centerId && !isAssignedToCenter);
  const assignmentState = getAssignmentState(specialist, center);

  return (
    <View style={[
      styles.specialistItem,
      isAssignedToCenter && styles.specialistItemAssigned,
      hasOtherCenter && styles.specialistItemOtherCenter
    ]}>
      <View style={styles.specialistHeader}>
        <View style={styles.specialistIcon}>
          <Ionicons color={colors.primaryDark} name="person-outline" size={20} />
        </View>
        <View style={styles.specialistCopy}>
          <Text style={styles.specialistName}>{specialist.fullName ?? 'Especialista sin nombre'}</Text>
          <Text style={styles.specialistEmail}>{specialist.email ?? 'Email no informado'}</Text>
        </View>
      </View>

      <View style={[styles.statusBadge, assignmentState.badgeStyle]}>
        <Ionicons color={assignmentState.iconColor} name={assignmentState.icon} size={16} />
        <Text style={[styles.statusBadgeText, { color: assignmentState.textColor }]}>
          {assignmentState.label}
        </Text>
      </View>

      <View style={styles.specialistMetaGrid}>
        <MetaItem label="Especialidad" value={getSpecialtyLabel(specialist.specialty)} />
        <MetaItem label="Matricula" value={getLicenseStatusLabel(specialist.licenseStatus)} />
      </View>

      <View style={styles.specialistActions}>
        <Pressable
          disabled={disabled || isAssignedToCenter || !center}
          onPress={onAssign}
          style={[styles.saveButton, (disabled || isAssignedToCenter || !center) && styles.disabled]}
        >
          <Text style={styles.actionButtonText}>
            {isAssignedToCenter ? 'Ya asignado' : hasOtherCenter ? 'Mover a este centro' : 'Asignar'}
          </Text>
        </Pressable>
        <Pressable
          disabled={disabled || !specialist.centerId}
          onPress={onClear}
          style={[styles.secondaryActionButton, (disabled || !specialist.centerId) && styles.disabled]}
        >
          <Text style={styles.secondaryActionButtonText}>
            {isAssignedToCenter ? 'Quitar del centro' : 'Quitar centro'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

function AssignedSpecialistItem({ specialist }: { specialist: CenterSpecialist }) {
  return (
    <View style={styles.specialistItem}>
      <View style={styles.specialistHeader}>
        <View style={styles.specialistIcon}>
          <Ionicons color={colors.primaryDark} name="person-outline" size={20} />
        </View>
        <View style={styles.specialistCopy}>
          <Text style={styles.specialistName}>{specialist.name ?? 'Especialista sin nombre'}</Text>
          <Text style={styles.specialistEmail}>{specialist.email ?? 'Email no informado'}</Text>
        </View>
      </View>
      <View style={styles.specialistMetaGrid}>
        <MetaItem label="Especialidad" value={getSpecialtyLabel(specialist.specialty)} />
        <MetaItem label="Matricula" value={getLicenseStatusLabel(specialist.licenseStatus)} />
      </View>
    </View>
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

function getSpecialtyLabel(value: string): string {
  if (value === 'dermatologo') return 'Dermatologo/a';
  if (value === 'cosmetologo') return 'Cosmetologo/a';
  return 'No informada';
}

function getLicenseStatusLabel(value: string): string {
  if (value === 'verified') return 'Verificada';
  if (value === 'pending') return 'Pendiente';
  if (value === 'rejected') return 'Rechazada';
  return 'No informada';
}

function getAssignmentState(specialist: PendingSpecialist, center: Center | null): {
  badgeStyle: object;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  textColor: string;
} {
  if (center && specialist.centerId === center.id) {
    return {
      badgeStyle: styles.statusBadgeAssigned,
      icon: 'checkmark-circle-outline',
      iconColor: colors.primaryDark,
      label: 'Asignado a este centro',
      textColor: colors.primaryDark
    };
  }

  if (specialist.centerId) {
    return {
      badgeStyle: styles.statusBadgeOther,
      icon: 'swap-horizontal-outline',
      iconColor: colors.secondaryDark,
      label: `Asignado a otro centro: ${specialist.center?.name ?? 'Centro no disponible'}`,
      textColor: colors.secondaryDark
    };
  }

  return {
    badgeStyle: styles.statusBadgeEmpty,
    icon: 'remove-circle-outline',
    iconColor: colors.textSecondary,
    label: 'Sin centro asignado',
    textColor: colors.textSecondary
  };
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
  summaryCard: {
    borderRadius: 12,
    paddingVertical: 12
  },
  summaryHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  },
  summaryCopy: {
    flex: 1
  },
  summaryLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800'
  },
  summaryCount: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    marginTop: 1
  },
  createButton: {
    backgroundColor: colors.secondary,
    borderRadius: 8,
    minHeight: 40,
    paddingHorizontal: 14
  },
  createButtonText: {
    color: colors.surface,
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
    gap: 12
  },
  centerCard: {
    borderRadius: 16,
    gap: 11,
    overflow: 'visible',
    padding: 14
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
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
    zIndex: 2
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 19,
    height: 38,
    justifyContent: 'center',
    width: 38
  },
  cardTitleWrap: {
    flex: 1,
    minWidth: 0
  },
  centerName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  centerStatus: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    borderRadius: 999,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  overflowWrap: {
    marginTop: 1,
    position: 'relative',
    zIndex: 5
  },
  overflowButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  overflowMenu: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    minWidth: 178,
    padding: 6,
    position: 'absolute',
    right: 0,
    top: 42,
    zIndex: 10
  },
  overflowMenuItem: {
    alignItems: 'center',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    minHeight: 40,
    paddingHorizontal: 10
  },
  overflowMenuText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '800'
  },
  overflowMenuDangerText: {
    color: colors.secondaryDark,
    fontSize: 14,
    fontWeight: '900'
  },
  specialistsSummaryBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.primaryLight,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  specialistsSummaryText: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '900'
  },
  detailsToggle: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  detailsToggleText: {
    color: colors.primary,
    flex: 1,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'left'
  },
  detailsPanel: {
    gap: 10
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
  mapsButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44
  },
  mapsButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900'
  },
  assignButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44
  },
  assignButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900'
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
  specialistsModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    gap: 14,
    maxHeight: '88%',
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
  modalHint: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4
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
  formRow: {
    flexDirection: 'row',
    gap: 10
  },
  formRowItem: {
    flex: 1,
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
  imagePicker: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 140,
    overflow: 'hidden'
  },
  formImagePreview: {
    height: 140,
    width: '100%'
  },
  formImagePlaceholder: {
    alignItems: 'center',
    backgroundColor: colors.primarySuperLight,
    gap: 8,
    minHeight: 140,
    justifyContent: 'center',
    padding: 16
  },
  formImagePlaceholderText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center'
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10
  },
  specialistsList: {
    gap: 12,
    paddingBottom: 4
  },
  feedbackBox: {
    alignItems: 'center',
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.success,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    padding: 12
  },
  feedbackText: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: 14,
    fontWeight: '900'
  },
  specialistItem: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  specialistItemAssigned: {
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.success
  },
  specialistItemOtherCenter: {
    backgroundColor: colors.secondarySoft,
    borderColor: colors.secondaryLight
  },
  specialistHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  specialistIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36
  },
  specialistCopy: {
    flex: 1,
    gap: 2
  },
  specialistName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  specialistEmail: {
    color: colors.textSecondary,
    fontSize: 13
  },
  specialistMetaGrid: {
    gap: 8
  },
  statusBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  statusBadgeAssigned: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.success
  },
  statusBadgeOther: {
    backgroundColor: colors.secondarySoft,
    borderColor: colors.secondaryLight
  },
  statusBadgeEmpty: {
    backgroundColor: colors.pending,
    borderColor: colors.border
  },
  statusBadgeText: {
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '900'
  },
  specialistActions: {
    flexDirection: 'row',
    gap: 8
  },
  primaryActionRow: {
    flexDirection: 'row'
  },
  primaryActionButton: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 10,
    flex: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12
  },
  secondaryActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  secondaryActionButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 135,
    paddingHorizontal: 10
  },
  secondaryActionButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center'
  },
  tertiaryActionButton: {
    alignItems: 'center',
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 96,
    paddingHorizontal: 10
  },
  tertiaryActionButtonText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center'
  },
  dangerActionButton: {
    alignItems: 'center',
    borderColor: colors.secondary,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 40,
    minWidth: 112,
    paddingHorizontal: 10
  },
  dangerActionButtonText: {
    color: colors.secondary,
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center'
  }
});
