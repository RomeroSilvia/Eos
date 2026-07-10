import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import {
  assignSpecialistCenter,
  approveSpecialist,
  getAdminErrorMessage,
  getSpecialistDocuments,
  getPendingSpecialists,
  rejectSpecialist,
  type SpecialistDocuments,
  type PendingSpecialist
} from '@/services/admin';
import { getCenters, getCentersErrorMessage, type Center } from '@/services/centers';

export default function AdminHomeScreen() {
  const router = useRouter();
  const [specialists, setSpecialists] = useState<PendingSpecialist[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [centersError, setCentersError] = useState<string | null>(null);
  const [rejectingSpecialist, setRejectingSpecialist] = useState<PendingSpecialist | null>(null);
  const [assigningSpecialist, setAssigningSpecialist] = useState<PendingSpecialist | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [documentSpecialist, setDocumentSpecialist] = useState<PendingSpecialist | null>(null);
  const [documents, setDocuments] = useState<SpecialistDocuments | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  const loadSpecialists = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setCentersError(null);

    try {
      const [nextSpecialists, nextCenters] = await Promise.all([
        getPendingSpecialists(),
        getCenters()
      ]);
      setSpecialists(nextSpecialists);
      setCenters(nextCenters);
    } catch (loadError) {
      setError(getAdminErrorMessage(loadError));
      setCentersError(getCentersErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSpecialists();
  }, [loadSpecialists]);

  const activeCenters = centers.filter((center) => center.isActive);

  async function handleApprove(specialist: PendingSpecialist) {
    setActionId(specialist.specialistProfileId);

    try {
      await approveSpecialist(specialist.specialistProfileId);
      Alert.alert('Solicitud aprobada', 'La matrícula fue verificada correctamente.');
      await loadSpecialists();
    } catch (approveError) {
      Alert.alert('No pudimos aprobar', getAdminErrorMessage(approveError));
    } finally {
      setActionId(null);
    }
  }

  function openRejectModal(specialist: PendingSpecialist) {
    setRejectingSpecialist(specialist);
    setRejectionReason('');
    setRejectionError(null);
  }

  function openAssignCenterModal(specialist: PendingSpecialist) {
    setAssigningSpecialist(specialist);
    setCentersError(null);
  }

  async function openDocumentsModal(specialist: PendingSpecialist) {
    setDocumentSpecialist(specialist);
    setDocuments(null);
    await loadDocuments(specialist.specialistProfileId);
  }

  async function loadDocuments(specialistProfileId: string) {
    setDocumentsLoading(true);
    setDocumentsError(null);

    try {
      setDocuments(await getSpecialistDocuments(specialistProfileId));
    } catch (documentsLoadError) {
      setDocumentsError(getDocumentErrorMessage(documentsLoadError));
      setDocuments(null);
    } finally {
      setDocumentsLoading(false);
    }
  }

  function closeDocumentsModal() {
    setDocumentSpecialist(null);
    setDocuments(null);
    setDocumentsError(null);
    setDocumentsLoading(false);
  }

  async function handleAssignCenter(centerId: string | null) {
    if (!assigningSpecialist) return;

    setActionId(assigningSpecialist.specialistProfileId);

    try {
      const updated = await assignSpecialistCenter(assigningSpecialist.specialistProfileId, centerId);
      setSpecialists((current) => current.map((specialist) => (
        specialist.specialistProfileId === updated.specialistProfileId ? updated : specialist
      )));
      setAssigningSpecialist(null);
      Alert.alert('Centro actualizado', 'La asignacion fue guardada correctamente.');
    } catch (assignError) {
      setCentersError(getAdminErrorMessage(assignError));
    } finally {
      setActionId(null);
    }
  }

  async function handleReject() {
    const reason = rejectionReason.trim();

    if (!rejectingSpecialist) return;

    if (!reason) {
      setRejectionError('Escribí un motivo para rechazar la solicitud.');
      return;
    }

    setActionId(rejectingSpecialist.specialistProfileId);

    try {
      await rejectSpecialist(rejectingSpecialist.specialistProfileId, reason);
      setRejectingSpecialist(null);
      Alert.alert('Solicitud rechazada', 'El motivo fue guardado correctamente.');
      await loadSpecialists();
    } catch (rejectError) {
      setRejectionError(getAdminErrorMessage(rejectError));
    } finally {
      setActionId(null);
    }
  }

  const isRejecting = actionId === rejectingSpecialist?.specialistProfileId;

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>Panel administrativo</Text>
          <Text style={styles.panelSubtitle}>Gestiona especialistas, centros y metricas de EOS</Text>
        </View>

    

        <Card variant="soft" style={styles.summaryCard}>
          <View style={styles.adminCardHeader}>
            <View style={styles.navIcon}>
              <Ionicons color={colors.primaryDark} name="shield-checkmark-outline" size={22} />
            </View>
            <View style={styles.navCopy}>
              <Text style={styles.navTitle}>Especialistas</Text>
              <Text style={styles.navDescription}>Validar solicitudes y asociar centros</Text>
            </View>
          </View>
          <Text style={styles.summaryLabel}>Solicitudes pendientes</Text>
          <Text style={styles.summaryCount}>{specialists.length}</Text>
        </Card>

        <Pressable
          accessibilityLabel="Abrir gestion de planes"
          accessibilityRole="button"
          onPress={() => router.push(routes.adminPlans as never)}
          style={styles.navCard}
        >
          <View style={styles.navIcon}>
            <Ionicons color={colors.primaryDark} name="card-outline" size={22} />
          </View>
          <View style={styles.navCopy}>
            <Text style={styles.navTitle}>Planes</Text>
            <Text style={styles.navDescription}>Crear y asignar suscripciones</Text>
          </View>
          <Ionicons color={colors.textSecondary} name="chevron-forward" size={22} />
        </Pressable>

        <Pressable
          accessibilityLabel="Abrir gestion de centros"
          accessibilityRole="button"
          onPress={() => router.push('/(tabs-admin)/centers' as never)}
          style={styles.navCard}
        >
          <View style={styles.navIcon}>
            <Ionicons color={colors.primaryDark} name="business-outline" size={22} />
          </View>
          <View style={styles.navCopy}>
            <Text style={styles.navTitle}>Centros</Text>
            <Text style={styles.navDescription}>Crear, editar y dar de baja centros esteticos</Text>
          </View>
          <Ionicons color={colors.textSecondary} name="chevron-forward" size={22} />
        </Pressable>

        <Pressable
          accessibilityLabel="Abrir metricas por centro"
          accessibilityRole="button"
          onPress={() => router.push('/(tabs-admin)/metrics' as never)}
          style={styles.navCard}
        >
          <View style={styles.navIcon}>
            <Ionicons color={colors.primaryDark} name="stats-chart-outline" size={22} />
          </View>
          <View style={styles.navCopy}>
            <Text style={styles.navTitle}>Metricas</Text>
            <Text style={styles.navDescription}>Ver resumen basico filtrado por centro</Text>
          </View>
          <Ionicons color={colors.textSecondary} name="chevron-forward" size={22} />
        </Pressable>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Validacion de especialistas</Text>
          <Text style={styles.sectionSubtitle}>Revisa documentos, aprueba solicitudes y asigna centros</Text>
        </View>

        {isLoading ? (
          <View style={styles.stateBox}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Cargando solicitudes...</Text>
          </View>
        ) : null}

        {!isLoading && error ? (
          <View style={styles.stateBox}>
            <Ionicons color={colors.error} name="alert-circle-outline" size={28} />
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.secondaryButton} onPress={loadSpecialists}>
              <Text style={styles.secondaryButtonText}>Reintentar</Text>
            </Pressable>
          </View>
        ) : null}

        {!isLoading && !error && specialists.length === 0 ? (
          <View style={styles.stateBox}>
            <Ionicons color={colors.primaryDark} name="checkmark-circle-outline" size={30} />
            <Text style={styles.stateText}>No hay especialistas pendientes por validar</Text>
          </View>
        ) : null}

        {!isLoading && !error && specialists.length > 0 ? (
          <View style={styles.list}>
            {specialists.map((specialist) => (
              <SpecialistRequestCard
                key={specialist.specialistProfileId}
                disabled={actionId === specialist.specialistProfileId}
                centerActionLabel={specialist.centerId ? 'Cambiar centro' : 'Asignar centro'}
                centerName={getCenterName(activeCenters, specialist.centerId)}
                onApprove={() => handleApprove(specialist)}
                onAssignCenter={() => openAssignCenterModal(specialist)}
                onViewDocuments={() => openDocumentsModal(specialist)}
                onReject={() => openRejectModal(specialist)}
                specialist={specialist}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        animationType="fade"
        onRequestClose={() => setRejectingSpecialist(null)}
        transparent
        visible={rejectingSpecialist !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rechazar solicitud</Text>
            <Text style={styles.modalDescription}>Escribí el motivo para que el especialista pueda corregirla.</Text>
            <TextInput
              multiline
              onChangeText={(value) => {
                setRejectionReason(value);
                setRejectionError(null);
              }}
              placeholder="Ej: Documento ilegible"
              placeholderTextColor={colors.textMuted}
              style={styles.reasonInput}
              value={rejectionReason}
            />
            {rejectionError ? <Text style={styles.errorText}>{rejectionError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                disabled={isRejecting}
                onPress={() => setRejectingSpecialist(null)}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable disabled={isRejecting} onPress={handleReject} style={styles.rejectButton}>
                <Text style={styles.actionButtonText}>{isRejecting ? 'Rechazando...' : 'Rechazar'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="fade"
        onRequestClose={() => setAssigningSpecialist(null)}
        transparent
        visible={assigningSpecialist !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.documentsHeader}>
              <View style={styles.documentsHeaderCopy}>
                <Text style={styles.modalTitle}>Asignar centro</Text>
                <Text style={styles.modalDescription}>
                  Elegi el centro asociado a este especialista.
                </Text>
              </View>
              <Pressable
                accessibilityLabel="Cerrar asignacion de centro"
                onPress={() => setAssigningSpecialist(null)}
                style={styles.iconButton}
              >
                <Ionicons color={colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>

            {assigningSpecialist ? (
              <Text style={styles.documentsSpecialistName}>
                {assigningSpecialist.fullName ?? assigningSpecialist.email ?? 'Especialista'}
              </Text>
            ) : null}

            {centersError ? <Text style={styles.errorText}>{centersError}</Text> : null}

            <View style={styles.centerOptions}>
              <CenterOption
                active={assigningSpecialist?.centerId === null}
                disabled={actionId === assigningSpecialist?.specialistProfileId}
                label="Sin centro"
                onPress={() => handleAssignCenter(null)}
              />
              {activeCenters.map((center) => (
                <CenterOption
                  active={assigningSpecialist?.centerId === center.id}
                  disabled={actionId === assigningSpecialist?.specialistProfileId}
                  key={center.id}
                  label={center.name}
                  onPress={() => handleAssignCenter(center.id)}
                />
              ))}
            </View>

            {activeCenters.length === 0 ? (
              <Text style={styles.stateText}>Primero crea un centro.</Text>
            ) : null}

            <Pressable
              disabled={actionId === assigningSpecialist?.specialistProfileId}
              onPress={() => setAssigningSpecialist(null)}
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        onRequestClose={closeDocumentsModal}
        transparent
        visible={documentSpecialist !== null}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.documentsModalCard}>
            <View style={styles.documentsHeader}>
              <View style={styles.documentsHeaderCopy}>
                <Text style={styles.modalTitle}>Documentos</Text>
                <Text style={styles.modalDescription}>
                  Documentos visibles solo para validación administrativa.
                </Text>
              </View>
              <Pressable accessibilityLabel="Cerrar documentos" onPress={closeDocumentsModal} style={styles.iconButton}>
                <Ionicons color={colors.textSecondary} name="close" size={22} />
              </Pressable>
            </View>

            {documentSpecialist ? (
              <Text style={styles.documentsSpecialistName}>
                {documentSpecialist.fullName ?? documentSpecialist.email ?? 'Especialista'}
              </Text>
            ) : null}

            {documentsLoading ? (
              <View style={styles.documentsStateBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={styles.stateText}>Cargando documentos...</Text>
              </View>
            ) : null}

            {!documentsLoading && documentsError ? (
              <View style={styles.documentsStateBox}>
                <Ionicons color={colors.error} name="alert-circle-outline" size={26} />
                <Text style={styles.errorText}>{documentsError}</Text>
                {documentSpecialist ? (
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => loadDocuments(documentSpecialist.specialistProfileId)}
                  >
                    <Text style={styles.secondaryButtonText}>Recargar documentos</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {!documentsLoading && !documentsError && documents ? (
              <ScrollView contentContainerStyle={styles.documentsContent} showsVerticalScrollIndicator={false}>
                <DocumentImageSection document={documents.dniPhoto} label="Foto del DNI" />
                <DocumentImageSection document={documents.titlePhoto} label="Foto del título" />
                <Text style={styles.expirationText}>
                  Los enlaces temporales vencen en {documents.expiresIn} segundos.
                </Text>
                {documentSpecialist ? (
                  <Pressable
                    style={styles.secondaryButton}
                    onPress={() => loadDocuments(documentSpecialist.specialistProfileId)}
                  >
                    <Text style={styles.secondaryButtonText}>Recargar documentos</Text>
                  </Pressable>
                ) : null}
              </ScrollView>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function SpecialistRequestCard({
  centerActionLabel,
  centerName,
  disabled,
  onApprove,
  onAssignCenter,
  onViewDocuments,
  onReject,
  specialist
}: {
  centerActionLabel: string;
  centerName: string;
  disabled: boolean;
  onApprove: () => void;
  onAssignCenter: () => void;
  onViewDocuments: () => void;
  onReject: () => void;
  specialist: PendingSpecialist;
}) {
  return (
    <Card style={styles.requestCard}>
      <View style={styles.cardHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(specialist.fullName ?? specialist.email)}</Text>
        </View>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.specialistName}>{specialist.fullName ?? 'Sin nombre informado'}</Text>
          <Text style={styles.specialistEmail}>{specialist.email ?? 'Email no informado'}</Text>
        </View>
      </View>

      <View style={styles.metaGrid}>
        <MetaItem label="Especialidad" value={getSpecialtyLabel(specialist.specialty)} />
        <MetaItem label="Matrícula" value={specialist.licenseNumber} />
        <MetaItem label="Fecha" value={formatDate(specialist.createdAt)} />
      </View>

      <View style={styles.centerAssignment}>
        <View style={styles.centerAssignmentCopy}>
          <Text style={styles.centerAssignmentLabel}>Centro actual</Text>
          <Text style={styles.centerAssignmentValue}>{centerName}</Text>
        </View>
        <Pressable disabled={disabled} onPress={onAssignCenter} style={[styles.centerAssignmentButton, disabled && styles.disabled]}>
          <Ionicons color={colors.primary} name="business-outline" size={18} />
          <Text style={styles.centerAssignmentButtonText}>{centerActionLabel}</Text>
        </Pressable>
      </View>

      <Pressable disabled={disabled} onPress={onViewDocuments} style={[styles.documentButton, disabled && styles.disabled]}>
        <Ionicons color={colors.primary} name="images-outline" size={18} />
        <Text style={styles.documentButtonText}>Ver documentos</Text>
      </Pressable>

      <View style={styles.cardActions}>
        <Pressable disabled={disabled} onPress={onReject} style={[styles.rejectButton, disabled && styles.disabled]}>
          <Text style={styles.actionButtonText}>Rechazar</Text>
        </Pressable>
        <Pressable disabled={disabled} onPress={onApprove} style={[styles.approveButton, disabled && styles.disabled]}>
          <Text style={styles.actionButtonText}>{disabled ? 'Procesando...' : 'Aprobar'}</Text>
        </Pressable>
      </View>
    </Card>
  );
}

function DocumentImageSection({
  document,
  label
}: {
  document: SpecialistDocuments['dniPhoto'];
  label: string;
}) {
  const documentUrl = document.available ? document.url : null;

  return (
    <View style={styles.documentSection}>
      <Text style={styles.documentLabel}>{label}</Text>
      {documentUrl ? (
        <Image resizeMode="contain" source={{ uri: documentUrl }} style={styles.documentImage} />
      ) : (
        <View style={styles.documentUnavailable}>
          <Ionicons color={colors.textSecondary} name="image-outline" size={28} />
          <Text style={styles.stateText}>
            {document.errorMessage ?? 'No se pudo cargar este documento. Es posible que el archivo no exista o haya sido removido.'}
          </Text>
        </View>
      )}
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

function CenterOption({
  active,
  disabled,
  label,
  onPress
}: {
  active: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.centerOption, active && styles.centerOptionActive, disabled && styles.disabled]}
    >
      <Text style={[styles.centerOptionText, active && styles.centerOptionTextActive]}>{label}</Text>
      {active ? <Ionicons color={colors.primaryDark} name="checkmark-circle" size={20} /> : null}
    </Pressable>
  );
}

function getCenterName(centers: Center[], centerId: string | null): string {
  if (!centerId) return 'Sin centro asignado';
  return centers.find((center) => center.id === centerId)?.name ?? 'Centro no disponible';
}

function getSpecialtyLabel(value: string): string {
  if (value === 'dermatologo') return 'Dermatólogo/a';
  if (value === 'cosmetologo') return 'Cosmetólogo/a';
  return 'No informado';
}

function formatDate(value: string | null): string {
  if (!value) return 'No informada';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'No informada';

  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
}

function getInitials(value: string | null | undefined): string {
  const parts = value?.trim().split(/\s+/).filter(Boolean) ?? [];
  const initials = parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('');
  return initials || 'AD';
}

function getDocumentErrorMessage(error: unknown): string {
  if (error instanceof Error && 'status' in error && error.status === 403) {
    return 'No tenés permisos para ver estos documentos.';
  }

  return getAdminErrorMessage(error);
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
  panelHeader: {
    gap: 6
  },
  panelTitle: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900'
  },
  panelSubtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21
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
  adminCardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8
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
  navCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 76,
    padding: 14,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2
  },
  navIcon: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 22,
    height: 44,
    justifyContent: 'center',
    width: 44
  },
  navCopy: {
    flex: 1
  },
  navTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  navDescription: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2
  },
  sectionHeader: {
    gap: 3,
    marginTop: 2
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  sectionSubtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
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
  requestCard: {
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
  avatarText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900'
  },
  cardTitleWrap: {
    flex: 1
  },
  specialistName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  specialistEmail: {
    color: colors.textSecondary,
    fontSize: 13,
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
  documentButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44
  },
  documentButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900'
  },
  centerAssignment: {
    alignItems: 'stretch',
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
    padding: 12
  },
  centerAssignmentCopy: {
    gap: 3
  },
  centerAssignmentLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800'
  },
  centerAssignmentValue: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  centerAssignmentButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44
  },
  centerAssignmentButtonText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '900'
  },
  approveButton: {
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
  documentsModalCard: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    gap: 14,
    maxHeight: '88%',
    padding: 18,
    width: '100%'
  },
  documentsHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12
  },
  documentsHeaderCopy: {
    flex: 1
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
  documentsSpecialistName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  documentsStateBox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    padding: 18
  },
  documentsContent: {
    gap: 14,
    paddingBottom: 4
  },
  centerOptions: {
    gap: 10
  },
  centerOption: {
    alignItems: 'center',
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    minHeight: 46,
    paddingHorizontal: 12
  },
  centerOptionActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary
  },
  centerOptionText: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 15,
    fontWeight: '800'
  },
  centerOptionTextActive: {
    color: colors.primaryDark,
    fontWeight: '900'
  },
  documentSection: {
    gap: 8
  },
  documentLabel: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  documentImage: {
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    height: 260,
    width: '100%'
  },
  documentUnavailable: {
    alignItems: 'center',
    backgroundColor: colors.primarySuperLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
    minHeight: 150,
    justifyContent: 'center',
    padding: 16
  },
  expirationText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center'
  },
  reasonInput: {
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 96,
    padding: 12,
    textAlignVertical: 'top'
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10
  }
});
