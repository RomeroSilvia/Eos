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
  approveSpecialist,
  getAdminErrorMessage,
  getSpecialistDocuments,
  getPendingSpecialists,
  rejectSpecialist,
  type SpecialistDocuments,
  type PendingSpecialist
} from '@/services/admin';

export default function AdminHomeScreen() {
  const router = useRouter();
  const [specialists, setSpecialists] = useState<PendingSpecialist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rejectingSpecialist, setRejectingSpecialist] = useState<PendingSpecialist | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState<string | null>(null);
  const [documentSpecialist, setDocumentSpecialist] = useState<PendingSpecialist | null>(null);
  const [documents, setDocuments] = useState<SpecialistDocuments | null>(null);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [documentsLoading, setDocumentsLoading] = useState(false);

  const loadSpecialists = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setSpecialists(await getPendingSpecialists());
    } catch (loadError) {
      setError(getAdminErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSpecialists();
  }, [loadSpecialists]);

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
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons color={colors.primaryDark} name="shield-checkmark-outline" size={26} />
          </View>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Validación de especialistas</Text>
            <Text style={styles.subtitle}>Revisá las solicitudes pendientes</Text>
          </View>
        </View>

        <Card variant="soft" style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Solicitudes pendientes</Text>
          <Text style={styles.summaryCount}>{specialists.length}</Text>
        </Card>

        <View style={styles.quickLinksRow}>
          <Pressable
            accessibilityLabel="Ir a gestion de planes"
            onPress={() => router.push(routes.adminPlans as never)}
            style={styles.quickLinkCard}
          >
            <Ionicons color={colors.primaryDark} name="card-outline" size={20} />
            <Text style={styles.quickLinkTitle}>Planes</Text>
            <Text style={styles.quickLinkText}>Crear y asignar suscripciones</Text>
          </Pressable>

          <Pressable
            accessibilityLabel="Ir a reportes por centro"
            onPress={() => router.push(routes.adminReports as never)}
            style={styles.quickLinkCard}
          >
            <Ionicons color={colors.primaryDark} name="stats-chart-outline" size={20} />
            <Text style={styles.quickLinkTitle}>Reportes</Text>
            <Text style={styles.quickLinkText}>Ver metricas globales por centro</Text>
          </Pressable>
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
                onApprove={() => handleApprove(specialist)}
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
  disabled,
  onApprove,
  onViewDocuments,
  onReject,
  specialist
}: {
  disabled: boolean;
  onApprove: () => void;
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
  quickLinksRow: {
    flexDirection: 'row',
    gap: 10
  },
  quickLinkCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minHeight: 104,
    padding: 12
  },
  quickLinkTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '900'
  },
  quickLinkText: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16
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
