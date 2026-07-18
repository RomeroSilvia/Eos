import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { LoadingState } from '@/components/LoadingState';
import { colors } from '@/constants/colors';
import {
  assignSubscription,
  createSubscriptionPlan,
  getSubscriptionPlans,
  getSubscriptions,
  getSubscriptionsErrorMessage,
  searchAssignableUsersByEmail,
  updateSubscriptionPlan,
  type AssignableUser,
  type Subscription,
  type SubscriptionPlan,
  type SubscriptionPlanFeatures
} from '@/services/subscriptions';

const PLAN_LEVEL_OPTIONS = ['basico', 'medio', 'premium'] as const;
type PlanLevelOption = (typeof PLAN_LEVEL_OPTIONS)[number];
type PlanFormErrors = {
  name?: string;
  level?: string;
  price?: string;
  durationDays?: string;
  maxMonthlyVideoCalls?: string;
  messageTokensPerMonth?: string;
  imageTokensPerMonth?: string;
};
type PlanFeatureFormValues = {
  chatEnabled: boolean;
  chatImagesEnabled: boolean;
  videoCallsEnabled: boolean;
  maxMonthlyVideoCalls: string;
  messageTokensPerMonth: string;
  imageTokensPerMonth: string;
};
type PlanFormValues = {
  name: string;
  level: PlanLevelOption;
  price: string;
  durationDays: string;
};

export default function AdminPlansScreen() {
  const { width } = useWindowDimensions();
  const isCompact = width < 370;

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [isAssigningSubscription, setIsAssigningSubscription] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanLevel, setNewPlanLevel] = useState<PlanLevelOption>('premium');
  const [newPlanPrice, setNewPlanPrice] = useState('');
  const [newPlanDurationDays, setNewPlanDurationDays] = useState('');
  const [newPlanChatEnabled, setNewPlanChatEnabled] = useState(false);
  const [newPlanChatImagesEnabled, setNewPlanChatImagesEnabled] = useState(false);
  const [newPlanVideoCallsEnabled, setNewPlanVideoCallsEnabled] = useState(false);
  const [newPlanMaxMonthlyVideoCalls, setNewPlanMaxMonthlyVideoCalls] = useState('');
  const [newPlanMessageTokensPerMonth, setNewPlanMessageTokensPerMonth] = useState('');
  const [newPlanImageTokensPerMonth, setNewPlanImageTokensPerMonth] = useState('');
  const [planFormMode, setPlanFormMode] = useState<'create' | 'edit'>('create');
  const [editingPlanId, setEditingPlanId] = useState<string>('');
  const [isEditFormEnabled, setIsEditFormEnabled] = useState(false);
  const [editPlanName, setEditPlanName] = useState('');
  const [editPlanLevel, setEditPlanLevel] = useState<PlanLevelOption>('premium');
  const [editPlanPrice, setEditPlanPrice] = useState('');
  const [editPlanDurationDays, setEditPlanDurationDays] = useState('');
  const [editPlanChatEnabled, setEditPlanChatEnabled] = useState(false);
  const [editPlanChatImagesEnabled, setEditPlanChatImagesEnabled] = useState(false);
  const [editPlanVideoCallsEnabled, setEditPlanVideoCallsEnabled] = useState(false);
  const [editPlanMaxMonthlyVideoCalls, setEditPlanMaxMonthlyVideoCalls] = useState('');
  const [editPlanMessageTokensPerMonth, setEditPlanMessageTokensPerMonth] = useState('');
  const [editPlanImageTokensPerMonth, setEditPlanImageTokensPerMonth] = useState('');
  const [editPlanIsActive, setEditPlanIsActive] = useState(true);
  const [editPlanSearchQuery, setEditPlanSearchQuery] = useState('');
  const [editPlanSearchResults, setEditPlanSearchResults] = useState<SubscriptionPlan[]>([]);
  const [isSearchingEditPlans, setIsSearchingEditPlans] = useState(false);

  const [ownerId, setOwnerId] = useState('');
  const [ownerEmailQuery, setOwnerEmailQuery] = useState('');
  const [showUserSearchResults, setShowUserSearchResults] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<AssignableUser[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [planSearchQuery, setPlanSearchQuery] = useState('');
  const [showPlanSearchResults, setShowPlanSearchResults] = useState(false);
  const [planSearchResults, setPlanSearchResults] = useState<SubscriptionPlan[]>([]);
  const [isSearchingPlans, setIsSearchingPlans] = useState(false);

  const [planFormErrors, setPlanFormErrors] = useState<PlanFormErrors>({});
  const [assignFormErrors, setAssignFormErrors] = useState<{
    ownerId?: string;
    planId?: string;
  }>({});
  const [editPlanErrors, setEditPlanErrors] = useState<PlanFormErrors>({});

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [plansResult, subscriptionsResult] = await Promise.all([
        getSubscriptionPlans(),
        getSubscriptions()
      ]);

      setPlans(plansResult);
      setSubscriptions(subscriptionsResult);
    } catch (loadError) {
      setError(getSubscriptionsErrorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, [selectedPlanId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      void loadData();
    }, [loadData])
  );

  useEffect(() => {
    const normalizedQuery = ownerEmailQuery.trim();
    if (normalizedQuery.length < 3) {
      setUserSearchResults([]);
      setIsSearchingUsers(false);
      return;
    }

    let isCancelled = false;
    const timeoutId = setTimeout(() => {
      setIsSearchingUsers(true);

      void searchAssignableUsersByEmail(normalizedQuery)
        .then((results) => {
          if (!isCancelled) {
            setUserSearchResults(results);
          }
        })
        .catch(() => {
          if (!isCancelled) {
            setUserSearchResults([]);
          }
        })
        .finally(() => {
          if (!isCancelled) {
            setIsSearchingUsers(false);
          }
        });
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [ownerEmailQuery]);

  const activePlans = useMemo(() => plans.filter((plan) => plan.isActive === true), [plans]);

  useEffect(() => {
    const normalizedQuery = planSearchQuery.trim().toLowerCase();
    if (normalizedQuery.length < 3) {
      setPlanSearchResults([]);
      setIsSearchingPlans(false);
      return;
    }

    let isCancelled = false;
    const timeoutId = setTimeout(() => {
      setIsSearchingPlans(true);

      const results = activePlans.filter((plan) => plan.name.toLowerCase().includes(normalizedQuery));
      if (!isCancelled) {
        setPlanSearchResults(results);
        setIsSearchingPlans(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [activePlans, planSearchQuery]);

  useEffect(() => {
    const normalizedQuery = editPlanSearchQuery.trim().toLowerCase();
    if (normalizedQuery.length < 3) {
      setEditPlanSearchResults([]);
      setIsSearchingEditPlans(false);
      return;
    }

    let isCancelled = false;
    const timeoutId = setTimeout(() => {
      setIsSearchingEditPlans(true);

      const results = plans.filter((plan) => plan.name.toLowerCase().includes(normalizedQuery));
      if (!isCancelled) {
        setEditPlanSearchResults(results);
        setIsSearchingEditPlans(false);
      }
    }, 250);

    return () => {
      isCancelled = true;
      clearTimeout(timeoutId);
    };
  }, [editPlanSearchQuery, plans]);

  const selectedPlan = useMemo(
    () => activePlans.find((plan) => plan.id === selectedPlanId) ?? null,
    [activePlans, selectedPlanId]
  );
  const subscribedPeopleCountByPlanId = useMemo(() => {
    const counts = new Map<string, number>();

    subscriptions.forEach((subscription) => {
      if (subscription.ownerType !== 'user' || subscription.status !== 'active') {
        return;
      }

      const currentCount = counts.get(subscription.planId) ?? 0;
      counts.set(subscription.planId, currentCount + 1);
    });

    return counts;
  }, [subscriptions]);
  const userSubscriptions = useMemo(
    () => subscriptions.filter((subscription) => subscription.ownerType === 'user'),
    [subscriptions]
  );
  const hasPlanSearchQuery = planSearchQuery.trim().length > 0;
  const hasOwnerEmailQuery = ownerEmailQuery.trim().length > 0;
  const hasEditPlanSearchQuery = editPlanSearchQuery.trim().length > 0;

  async function handleCreatePlan() {
    const parsedPrice = Number(newPlanPrice);
    const parsedDurationDays = newPlanDurationDays.trim() ? Number(newPlanDurationDays) : null;
    const parsedMaxMonthlyVideoCalls = newPlanMaxMonthlyVideoCalls.trim() ? Number(newPlanMaxMonthlyVideoCalls) : null;
    const parsedMessageTokensPerMonth = newPlanMessageTokensPerMonth.trim() ? Number(newPlanMessageTokensPerMonth) : null;
    const parsedImageTokensPerMonth = newPlanImageTokensPerMonth.trim() ? Number(newPlanImageTokensPerMonth) : null;
    const nextErrors: PlanFormErrors = {};

    if (!newPlanName.trim()) {
      nextErrors.name = 'Ingresa un nombre para el plan.';
    }

    if (!PLAN_LEVEL_OPTIONS.includes(newPlanLevel)) {
      nextErrors.level = 'Ingresa el nivel del plan.';
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      nextErrors.price = 'Ingresa un precio valido mayor o igual a 0.';
    }

    if (
      parsedDurationDays !== null &&
      (!Number.isFinite(parsedDurationDays) || parsedDurationDays <= 0 || !Number.isInteger(parsedDurationDays))
    ) {
      nextErrors.durationDays = 'Ingresa una duracion valida en dias (numero entero mayor a 0).';
    }

    if (
      parsedMaxMonthlyVideoCalls !== null &&
      (!Number.isFinite(parsedMaxMonthlyVideoCalls) || parsedMaxMonthlyVideoCalls < 0 || !Number.isInteger(parsedMaxMonthlyVideoCalls))
    ) {
      nextErrors.maxMonthlyVideoCalls = 'Ingresa un maximo de videollamadas valido (numero entero mayor o igual a 0).';
    }

    if (
      parsedMessageTokensPerMonth !== null &&
      (!Number.isFinite(parsedMessageTokensPerMonth) || parsedMessageTokensPerMonth < 0 || !Number.isInteger(parsedMessageTokensPerMonth))
    ) {
      nextErrors.messageTokensPerMonth = 'Ingresa una cantidad valida de tokens de mensaje (entero mayor o igual a 0).';
    }

    if (
      parsedImageTokensPerMonth !== null &&
      (!Number.isFinite(parsedImageTokensPerMonth) || parsedImageTokensPerMonth < 0 || !Number.isInteger(parsedImageTokensPerMonth))
    ) {
      nextErrors.imageTokensPerMonth = 'Ingresa una cantidad valida de tokens de imagen (entero mayor o igual a 0).';
    }

    if (Object.keys(nextErrors).length > 0) {
      setPlanFormErrors(nextErrors);
      return;
    }

    setPlanFormErrors({});

    setIsSavingPlan(true);

    try {
      await createSubscriptionPlan({
        name: newPlanName,
        level: newPlanLevel,
        price: parsedPrice,
        features: buildPlanFeatures({
          durationDays: parsedDurationDays,
          chatEnabled: newPlanChatEnabled,
          chatImagesEnabled: newPlanChatImagesEnabled,
          videoCallsEnabled: newPlanVideoCallsEnabled,
          maxMonthlyVideoCalls: parsedMaxMonthlyVideoCalls,
          messageTokensPerMonth: parsedMessageTokensPerMonth,
          imageTokensPerMonth: parsedImageTokensPerMonth
        })
      });
      resetCreatePlanForm();
      await loadData();
      Alert.alert('Plan creado', 'El plan fue creado correctamente.');
    } catch (saveError) {
      Alert.alert('No pudimos crear el plan', getSubscriptionsErrorMessage(saveError));
    } finally {
      setIsSavingPlan(false);
    }
  }

  function resetCreatePlanForm() {
    setNewPlanName('');
    setNewPlanPrice('');
    setNewPlanDurationDays('');
    setNewPlanLevel('premium');
    setNewPlanChatEnabled(false);
    setNewPlanChatImagesEnabled(false);
    setNewPlanVideoCallsEnabled(false);
    setNewPlanMaxMonthlyVideoCalls('');
    setNewPlanMessageTokensPerMonth('');
    setNewPlanImageTokensPerMonth('');
    setPlanFormErrors({});
  }

  function resetEditPlanForm() {
    setEditingPlanId('');
    setIsEditFormEnabled(false);
    setEditPlanSearchQuery('');
    setEditPlanSearchResults([]);
    setEditPlanName('');
    setEditPlanLevel('premium');
    setEditPlanPrice('');
    setEditPlanDurationDays('');
    setEditPlanChatEnabled(false);
    setEditPlanChatImagesEnabled(false);
    setEditPlanVideoCallsEnabled(false);
    setEditPlanMaxMonthlyVideoCalls('');
    setEditPlanMessageTokensPerMonth('');
    setEditPlanImageTokensPerMonth('');
    setEditPlanIsActive(true);
    setEditPlanErrors({});
  }

  function resetAssignForm() {
    setOwnerId('');
    setOwnerEmailQuery('');
    setShowUserSearchResults(false);
    setUserSearchResults([]);
    setSelectedPlanId('');
    setPlanSearchQuery('');
    setShowPlanSearchResults(false);
    setPlanSearchResults([]);
    setAssignFormErrors({});
  }

  function handleCreatePlanFieldChange(field: keyof PlanFormValues, value: string) {
    if (field === 'name') setNewPlanName(value);
    if (field === 'price') setNewPlanPrice(value);
    if (field === 'durationDays') setNewPlanDurationDays(value.replace(/[^0-9]/g, ''));
    if (field === 'level') setNewPlanLevel(value as PlanLevelOption);

    if (planFormErrors[field]) {
      setPlanFormErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleEditPlanFieldChange(field: keyof PlanFormValues, value: string) {
    if (field === 'name') setEditPlanName(value);
    if (field === 'price') setEditPlanPrice(value);
    if (field === 'durationDays') setEditPlanDurationDays(value.replace(/[^0-9]/g, ''));
    if (field === 'level') setEditPlanLevel(value as PlanLevelOption);

    if (editPlanErrors[field]) {
      setEditPlanErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function handleCreateFeatureToggleChange(field: keyof PlanFeatureFormValues, value: boolean | string) {
    if (field === 'chatEnabled') setNewPlanChatEnabled(Boolean(value));
    if (field === 'chatImagesEnabled') setNewPlanChatImagesEnabled(Boolean(value));
    if (field === 'videoCallsEnabled') setNewPlanVideoCallsEnabled(Boolean(value));
    if (field === 'maxMonthlyVideoCalls') {
      setNewPlanMaxMonthlyVideoCalls(String(value).replace(/[^0-9]/g, ''));
      if (planFormErrors.maxMonthlyVideoCalls) {
        setPlanFormErrors((prev) => ({ ...prev, maxMonthlyVideoCalls: undefined }));
      }
    }

    if (field === 'messageTokensPerMonth') {
      setNewPlanMessageTokensPerMonth(String(value).replace(/[^0-9]/g, ''));
      if (planFormErrors.messageTokensPerMonth) {
        setPlanFormErrors((prev) => ({ ...prev, messageTokensPerMonth: undefined }));
      }
    }

    if (field === 'imageTokensPerMonth') {
      setNewPlanImageTokensPerMonth(String(value).replace(/[^0-9]/g, ''));
      if (planFormErrors.imageTokensPerMonth) {
        setPlanFormErrors((prev) => ({ ...prev, imageTokensPerMonth: undefined }));
      }
    }
  }

  function handleEditFeatureToggleChange(field: keyof PlanFeatureFormValues, value: boolean | string) {
    if (field === 'chatEnabled') setEditPlanChatEnabled(Boolean(value));
    if (field === 'chatImagesEnabled') setEditPlanChatImagesEnabled(Boolean(value));
    if (field === 'videoCallsEnabled') setEditPlanVideoCallsEnabled(Boolean(value));
    if (field === 'maxMonthlyVideoCalls') {
      setEditPlanMaxMonthlyVideoCalls(String(value).replace(/[^0-9]/g, ''));
      if (editPlanErrors.maxMonthlyVideoCalls) {
        setEditPlanErrors((prev) => ({ ...prev, maxMonthlyVideoCalls: undefined }));
      }
    }

    if (field === 'messageTokensPerMonth') {
      setEditPlanMessageTokensPerMonth(String(value).replace(/[^0-9]/g, ''));
      if (editPlanErrors.messageTokensPerMonth) {
        setEditPlanErrors((prev) => ({ ...prev, messageTokensPerMonth: undefined }));
      }
    }

    if (field === 'imageTokensPerMonth') {
      setEditPlanImageTokensPerMonth(String(value).replace(/[^0-9]/g, ''));
      if (editPlanErrors.imageTokensPerMonth) {
        setEditPlanErrors((prev) => ({ ...prev, imageTokensPerMonth: undefined }));
      }
    }
  }

  async function handleAssignSubscription() {
    const nextErrors: { ownerId?: string; planId?: string } = {};

    if (!ownerId.trim()) {
      nextErrors.ownerId = 'Selecciona un usuario por email.';
    }

    if (!selectedPlanId) {
      nextErrors.planId = 'Selecciona un plan activo para asignar.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setAssignFormErrors(nextErrors);
      return;
    }

    setAssignFormErrors({});

    setIsAssigningSubscription(true);

    try {
      const startedAt = new Date().toISOString();
      const durationDays = selectedPlan ? getPlanDurationDays(selectedPlan) : null;
      const endsAt = durationDays ? addDaysFromDate(startedAt, durationDays) : undefined;

      const createdSubscription = await assignSubscription({
        ownerType: 'user',
        ownerId: ownerId.trim(),
        planId: selectedPlanId,
        status: 'active',
        startedAt,
        endsAt
      });

      setSubscriptions((current) => [
        createdSubscription,
        ...current.filter((subscription) => subscription.id !== createdSubscription.id)
      ]);
      resetAssignForm();

      try {
        await loadData();
      } catch {
        Alert.alert(
          'Suscripcion asignada',
          'La suscripcion se creo, pero no pudimos refrescar el listado automaticamente. Desliza hacia abajo o reintenta.'
        );
        return;
      }

      Alert.alert('Suscripcion asignada', 'La suscripcion activa fue actualizada.');
    } catch (saveError) {
      Alert.alert('No pudimos asignar', getSubscriptionsErrorMessage(saveError));
    } finally {
      setIsAssigningSubscription(false);
    }
  }

  function handleSelectPlanToEdit(plan: SubscriptionPlan) {
    setEditingPlanId(plan.id);
    setIsEditFormEnabled(false);
    setEditPlanSearchQuery(plan.name);
    setEditPlanSearchResults([]);
    setEditPlanName(plan.name);
    setEditPlanLevel(toPlanLevelOption(plan.level));
    setEditPlanPrice(String(plan.price ?? ''));
    setEditPlanDurationDays(getPlanDurationDays(plan)?.toString() ?? '');
    setEditPlanChatEnabled(getFeatureBoolean(plan.features, 'chatEnabled', false));
    setEditPlanChatImagesEnabled(getFeatureBoolean(plan.features, 'chatImagesEnabled', false));
    setEditPlanVideoCallsEnabled(getFeatureBoolean(plan.features, 'videoCallsEnabled', false));
    setEditPlanMaxMonthlyVideoCalls(getFeatureNumber(plan.features, 'maxMonthlyVideoCalls'));
    setEditPlanMessageTokensPerMonth(getFeatureNumber(plan.features, 'messageTokensPerMonth'));
    setEditPlanImageTokensPerMonth(getFeatureNumber(plan.features, 'imageTokensPerMonth'));
    setEditPlanIsActive(plan.isActive);
    setEditPlanErrors({});
  }

  async function handleUpdatePlan() {
    if (!editingPlanId) {
      Alert.alert('Editar plan', 'Selecciona un plan para editar.');
      return;
    }

    const parsedPrice = Number(editPlanPrice);
    const parsedDurationDays = editPlanDurationDays.trim() ? Number(editPlanDurationDays) : null;
    const parsedMaxMonthlyVideoCalls = editPlanMaxMonthlyVideoCalls.trim() ? Number(editPlanMaxMonthlyVideoCalls) : null;
    const parsedMessageTokensPerMonth = editPlanMessageTokensPerMonth.trim() ? Number(editPlanMessageTokensPerMonth) : null;
    const parsedImageTokensPerMonth = editPlanImageTokensPerMonth.trim() ? Number(editPlanImageTokensPerMonth) : null;
    const nextErrors: PlanFormErrors = {};

    if (!editPlanName.trim()) {
      nextErrors.name = 'Ingresa un nombre para el plan.';
    }

    if (!PLAN_LEVEL_OPTIONS.includes(editPlanLevel)) {
      nextErrors.level = 'Ingresa el nivel del plan.';
    }

    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      nextErrors.price = 'Ingresa un precio valido mayor o igual a 0.';
    }

    if (
      parsedDurationDays !== null &&
      (!Number.isFinite(parsedDurationDays) || parsedDurationDays <= 0 || !Number.isInteger(parsedDurationDays))
    ) {
      nextErrors.durationDays = 'Ingresa una duracion valida en dias (numero entero mayor a 0).';
    }

    if (
      parsedMaxMonthlyVideoCalls !== null &&
      (!Number.isFinite(parsedMaxMonthlyVideoCalls) || parsedMaxMonthlyVideoCalls < 0 || !Number.isInteger(parsedMaxMonthlyVideoCalls))
    ) {
      nextErrors.maxMonthlyVideoCalls = 'Ingresa un maximo de videollamadas valido (numero entero mayor o igual a 0).';
    }

    if (
      parsedMessageTokensPerMonth !== null &&
      (!Number.isFinite(parsedMessageTokensPerMonth) || parsedMessageTokensPerMonth < 0 || !Number.isInteger(parsedMessageTokensPerMonth))
    ) {
      nextErrors.messageTokensPerMonth = 'Ingresa una cantidad valida de tokens de mensaje (entero mayor o igual a 0).';
    }

    if (
      parsedImageTokensPerMonth !== null &&
      (!Number.isFinite(parsedImageTokensPerMonth) || parsedImageTokensPerMonth < 0 || !Number.isInteger(parsedImageTokensPerMonth))
    ) {
      nextErrors.imageTokensPerMonth = 'Ingresa una cantidad valida de tokens de imagen (entero mayor o igual a 0).';
    }

    if (Object.keys(nextErrors).length > 0) {
      setEditPlanErrors(nextErrors);
      return;
    }

    setEditPlanErrors({});
    setIsSavingPlan(true);

    try {
      const updatedPlan = await updateSubscriptionPlan(editingPlanId, {
        name: editPlanName.trim(),
        level: editPlanLevel,
        price: parsedPrice,
        features: buildPlanFeatures({
          durationDays: parsedDurationDays,
          chatEnabled: editPlanChatEnabled,
          chatImagesEnabled: editPlanChatImagesEnabled,
          videoCallsEnabled: editPlanVideoCallsEnabled,
          maxMonthlyVideoCalls: parsedMaxMonthlyVideoCalls,
          messageTokensPerMonth: parsedMessageTokensPerMonth,
          imageTokensPerMonth: parsedImageTokensPerMonth
        }),
        isActive: editPlanIsActive
      });

      setPlans((current) => current.map((plan) => (plan.id === updatedPlan.id ? updatedPlan : plan)));
      setSelectedPlanId((current) => (current === updatedPlan.id ? updatedPlan.id : current));
      setSubscriptions((current) =>
        current.map((subscription) => {
          if (subscription.planId !== updatedPlan.id) {
            return subscription;
          }

          return {
            ...subscription,
            plan: {
              ...updatedPlan
            }
          };
        })
      );

      resetEditPlanForm();
      void loadData();
      Alert.alert('Plan actualizado', 'Los cambios del plan fueron guardados.');
    } catch (saveError) {
      Alert.alert('No pudimos actualizar el plan', getSubscriptionsErrorMessage(saveError));
    } finally {
      setIsSavingPlan(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <FlatList
        contentContainerStyle={[styles.content, isCompact && styles.contentCompact]}
        data={isLoading ? [] : userSubscriptions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <>
            <Text style={styles.title}>Planes y Suscripciones</Text>
            <Text style={styles.subtitle}>Gestiona planes, asignaciones y vigencias desde un solo lugar.</Text>

            <Card style={[styles.card, styles.firstCard]}>
              <Text style={styles.sectionTitle}>Crear o editar plan</Text>
              <View style={styles.modeTabsRow}>
                <Pressable
                  accessibilityLabel="Modo crear plan"
                  onPress={() => {
                    setPlanFormMode('create');
                    resetEditPlanForm();
                  }}
                  style={[styles.modeTab, planFormMode === 'create' && styles.modeTabActive]}
                >
                  <Text style={[styles.modeTabText, planFormMode === 'create' && styles.modeTabTextActive]}>Crear</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Modo editar plan"
                  onPress={() => setPlanFormMode('edit')}
                  style={[styles.modeTab, planFormMode === 'edit' && styles.modeTabActive]}
                >
                  <Text style={[styles.modeTabText, planFormMode === 'edit' && styles.modeTabTextActive]}>Editar</Text>
                </Pressable>
              </View>

              {planFormMode === 'create' ? (
                <>
                  <PlanFormFields
                    errors={planFormErrors}
                    featureValues={{
                      chatEnabled: newPlanChatEnabled,
                      chatImagesEnabled: newPlanChatImagesEnabled,
                      videoCallsEnabled: newPlanVideoCallsEnabled,
                      maxMonthlyVideoCalls: newPlanMaxMonthlyVideoCalls,
                      messageTokensPerMonth: newPlanMessageTokensPerMonth,
                      imageTokensPerMonth: newPlanImageTokensPerMonth
                    }}
                    isSaving={isSavingPlan}
                    onChangeField={handleCreatePlanFieldChange}
                    onFeatureValueChange={handleCreateFeatureToggleChange}
                    values={{
                      name: newPlanName,
                      level: newPlanLevel,
                      price: newPlanPrice,
                      durationDays: newPlanDurationDays
                    }}
                  />
                  <View style={styles.formActionsRow}>
                    <Pressable
                      accessibilityLabel="Cancelar crear plan"
                      disabled={isSavingPlan}
                      onPress={resetCreatePlanForm}
                      style={[styles.secondaryActionButton, isSavingPlan && styles.buttonDisabled]}
                    >
                      <Text style={styles.secondaryActionButtonText}>Cancelar</Text>
                    </Pressable>
                    <Pressable
                      accessibilityLabel="Guardar nuevo plan"
                      disabled={isSavingPlan}
                      onPress={handleCreatePlan}
                      style={[styles.button, styles.primaryActionButton, isSavingPlan && styles.buttonDisabled]}
                    >
                      <Text style={styles.buttonText}>{isSavingPlan ? 'Guardando...' : 'Guardar'}</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.planPickerLabel}>Buscar plan para editar</Text>
                  <TextInput
                    accessibilityLabel="Buscar plan para editar"
                    editable={!isSavingPlan}
                    onChangeText={(value) => {
                      setEditPlanSearchQuery(value);
                      setEditingPlanId('');
                      setIsEditFormEnabled(false);
                    }}
                    placeholder="Buscar plan por nombre"
                    placeholderTextColor={colors.textMuted}
                    style={styles.input}
                    value={editPlanSearchQuery}
                  />

                  {hasEditPlanSearchQuery && !editingPlanId ? (
                    <View style={styles.planEditListWrap}>
                      {isSearchingEditPlans ? (
                        <View style={styles.userSearchLoadingWrap}>
                          <ActivityIndicator color={colors.primary} />
                        </View>
                      ) : editPlanSearchResults.length === 0 ? (
                        <Text style={styles.emptySearchText}>Sin resultados.</Text>
                      ) : (
                        editPlanSearchResults.map((plan) => (
                          <Pressable
                            accessibilityLabel={`Editar plan ${plan.name}`}
                            disabled={isSavingPlan}
                            key={plan.id}
                            onPress={() => handleSelectPlanToEdit(plan)}
                            style={styles.planEditItem}
                          >
                            <Text style={styles.planEditItemTitle}>{plan.name}</Text>
                            <Text style={styles.planEditItemMeta}>
                              {plan.level} - ${plan.price} - {plan.isActive ? 'Activo' : 'Inactivo'}
                            </Text>
                          </Pressable>
                        ))
                      )}
                    </View>
                  ) : null}

                  {editingPlanId ? (
                    <View style={styles.selectionSummaryCard}>
                      <Text style={styles.selectionSummaryTitle}>{editPlanName}</Text>
                      <Text style={styles.selectionSummaryMeta}>Nivel {editPlanLevel} - ${editPlanPrice}</Text>
                    </View>
                  ) : (
                    <Text style={styles.searchIdleHint}>Elige un plan para editar.</Text>
                  )}

                  {editingPlanId && !isEditFormEnabled ? (
                    <View style={styles.formActionsRow}>
                      <Pressable
                        accessibilityLabel="Cambiar plan seleccionado"
                        disabled={isSavingPlan}
                        onPress={resetEditPlanForm}
                        style={styles.secondaryActionButton}
                      >
                        <Text style={styles.secondaryActionButtonText}>Cambiar</Text>
                      </Pressable>
                      <Pressable
                        accessibilityLabel="Habilitar edicion de plan"
                        disabled={isSavingPlan}
                        onPress={() => setIsEditFormEnabled(true)}
                        style={[styles.button, styles.primaryActionButton]}
                      >
                        <Text style={styles.buttonText}>Editar</Text>
                      </Pressable>
                    </View>
                  ) : null}

                  {editingPlanId && isEditFormEnabled ? (
                    <>
                      <PlanFormFields
                        errors={editPlanErrors}
                        featureValues={{
                          chatEnabled: editPlanChatEnabled,
                          chatImagesEnabled: editPlanChatImagesEnabled,
                          videoCallsEnabled: editPlanVideoCallsEnabled,
                          maxMonthlyVideoCalls: editPlanMaxMonthlyVideoCalls,
                          messageTokensPerMonth: editPlanMessageTokensPerMonth,
                          imageTokensPerMonth: editPlanImageTokensPerMonth
                        }}
                        isSaving={isSavingPlan}
                        onChangeField={handleEditPlanFieldChange}
                        onFeatureValueChange={handleEditFeatureToggleChange}
                        values={{
                          name: editPlanName,
                          level: editPlanLevel,
                          price: editPlanPrice,
                          durationDays: editPlanDurationDays
                        }}
                      />

                      <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>Plan activo</Text>
                        <Switch
                          accessibilityLabel="Cambiar estado activo del plan"
                          disabled={isSavingPlan}
                          onValueChange={setEditPlanIsActive}
                          trackColor={{ false: colors.primaryLight, true: colors.primary }}
                          value={editPlanIsActive}
                        />
                      </View>

                      <View style={styles.formActionsRow}>
                        <Pressable
                          accessibilityLabel="Cancelar edicion de plan"
                          disabled={isSavingPlan}
                          onPress={() => setIsEditFormEnabled(false)}
                          style={[styles.secondaryActionButton, isSavingPlan && styles.buttonDisabled]}
                        >
                          <Text style={styles.secondaryActionButtonText}>Cancelar</Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel="Guardar cambios del plan"
                          disabled={isSavingPlan}
                          onPress={handleUpdatePlan}
                          style={[styles.button, styles.primaryActionButton, isSavingPlan && styles.buttonDisabled]}
                        >
                          <Text style={styles.buttonText}>{isSavingPlan ? 'Guardando...' : 'Guardar'}</Text>
                        </Pressable>
                      </View>
                    </>
                  ) : null}
                </>
              )}
            </Card>

            <Card style={[styles.card, styles.cardSpaced]}>
              <Text style={styles.sectionTitle}>Asignar suscripcion</Text>
              <Text style={styles.fieldLabel}>Usuario (email)</Text>
              <TextInput
                accessibilityLabel="Buscar usuario por email"
                editable={!isAssigningSubscription}
                onChangeText={(value) => {
                  setOwnerEmailQuery(value);
                  setOwnerId('');
                  setShowUserSearchResults(true);
                  if (assignFormErrors.ownerId) {
                    setAssignFormErrors((prev) => ({ ...prev, ownerId: undefined }));
                  }
                }}
                placeholder="Buscar usuario por email"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, assignFormErrors.ownerId && styles.inputError]}
                value={ownerEmailQuery}
              />
              {hasOwnerEmailQuery && showUserSearchResults ? (
                <View style={[styles.planResultsList, assignFormErrors.ownerId && styles.optionListWrapError]}>
                  {isSearchingUsers ? (
                    <View style={styles.userSearchLoadingWrap}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : userSearchResults.length === 0 ? (
                    <Text style={styles.emptySearchText}>Sin resultados.</Text>
                  ) : (
                    userSearchResults.map((user) => {
                      const isSelected = ownerId === user.id;

                      return (
                        <Pressable
                          accessibilityLabel={`Usuario ${user.email}`}
                          key={user.id}
                          onPress={() => {
                            setOwnerId(user.id);
                            setOwnerEmailQuery(user.email);
                            setShowUserSearchResults(false);
                            if (assignFormErrors.ownerId) {
                              setAssignFormErrors((prev) => ({ ...prev, ownerId: undefined }));
                            }
                          }}
                          style={[styles.planResultItem, isSelected && styles.planResultItemSelected]}
                        >
                          <Text style={[styles.planResultTitle, isSelected && styles.planResultTitleSelected]}>
                            {user.email}
                          </Text>
                          <Text style={[styles.planResultMeta, isSelected && styles.planResultMetaSelected]}>
                            {user.fullName || 'Sin nombre'}
                          </Text>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              ) : (
                <Text style={styles.searchIdleHint}>Busca por email.</Text>
              )}
              {assignFormErrors.ownerId ? <Text style={styles.fieldErrorText}>{assignFormErrors.ownerId}</Text> : null}

              <Text style={styles.planPickerLabel}>Selecciona plan activo</Text>
              <TextInput
                accessibilityLabel="Buscar plan por nombre"
                editable={!isAssigningSubscription}
                onChangeText={(value) => {
                  setPlanSearchQuery(value);
                  setSelectedPlanId('');
                  setShowPlanSearchResults(true);
                }}
                placeholder="Buscar plan por nombre"
                placeholderTextColor={colors.textMuted}
                style={[styles.input, assignFormErrors.planId && styles.inputError]}
                value={planSearchQuery}
              />
              {hasPlanSearchQuery && showPlanSearchResults ? (
                <View style={[styles.planResultsList, assignFormErrors.planId && styles.optionListWrapError]}>
                  {isSearchingPlans ? (
                    <View style={styles.userSearchLoadingWrap}>
                      <ActivityIndicator color={colors.primary} />
                    </View>
                  ) : planSearchResults.length === 0 ? (
                    <Text style={styles.emptySearchText}>Sin resultados.</Text>
                  ) : (
                    planSearchResults.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;

                      return (
                        <Pressable
                          accessibilityLabel={`Plan ${plan.name}`}
                          key={plan.id}
                          onPress={() => {
                            setSelectedPlanId(plan.id);
                            setPlanSearchQuery(plan.name);
                            setShowPlanSearchResults(false);
                            if (assignFormErrors.planId) {
                              setAssignFormErrors((prev) => ({ ...prev, planId: undefined }));
                            }
                          }}
                          style={[styles.planResultItem, isSelected && styles.planResultItemSelected]}
                        >
                          <Text style={[styles.planResultTitle, isSelected && styles.planResultTitleSelected]}>
                            {plan.name}
                          </Text>
                          <Text style={[styles.planResultMeta, isSelected && styles.planResultMetaSelected]}>
                            Nivel: {plan.level} - ${plan.price}
                          </Text>
                        </Pressable>
                      );
                    })
                  )}
                </View>
              ) : (
                <Text style={styles.searchIdleHint}>Busca por nombre.</Text>
              )}
              {assignFormErrors.planId ? <Text style={styles.fieldErrorText}>{assignFormErrors.planId}</Text> : null}

              <View style={styles.formActionsRow}>
                <Pressable
                  accessibilityLabel="Cancelar asignacion de suscripcion"
                  disabled={isAssigningSubscription}
                  onPress={resetAssignForm}
                  style={[styles.secondaryActionButton, isAssigningSubscription && styles.buttonDisabled]}
                >
                  <Text style={styles.secondaryActionButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel="Aceptar asignacion de suscripcion"
                  disabled={isAssigningSubscription}
                  onPress={handleAssignSubscription}
                  style={[styles.button, styles.primaryActionButton, isAssigningSubscription && styles.buttonDisabled]}
                >
                  <Text style={styles.buttonText}>{isAssigningSubscription ? 'Guardando...' : 'Aceptar'}</Text>
                </Pressable>
              </View>
            </Card>

            <Text style={[styles.sectionTitle, styles.recentSubscriptionsTitle]}>Suscripciones recientes</Text>
          </>
        }
        ListEmptyComponent={
          isLoading ? (
            <LoadingState message="Cargando datos..." />
          ) : error ? (
            <View style={styles.stateBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={loadData} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonText}>Reintentar</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.stateBox}>
              <Text style={styles.stateText}>Todavia no hay suscripciones cargadas.</Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Card style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeaderRow}>
              <Text style={styles.subscriptionTitle}>{item.plan?.name ?? 'Plan sin nombre'}</Text>
              <View style={[styles.statusBadge, getStatusBadgeStyle(item.status)]}>
                <Text style={styles.statusBadgeText}>{getSubscriptionStatusLabel(item.status)}</Text>
              </View>
            </View>

            <View style={styles.subscriptionCountPill}>
              <Text style={styles.subscriptionCountLabel}>Suscripciones activas del plan</Text>
              <Text style={styles.subscriptionCountValue}>{subscribedPeopleCountByPlanId.get(item.planId) ?? 0}</Text>
            </View>

            <View style={styles.subscriptionMetaRow}>
              {item.plan?.level ? (
                <View style={styles.subscriptionMetaPill}>
                  <Text style={styles.subscriptionMetaPillText}>Nivel {item.plan.level}</Text>
                </View>
              ) : null}
              {typeof item.plan?.price === 'number' ? (
                <View style={styles.subscriptionMetaPill}>
                  <Text style={styles.subscriptionMetaPillText}>${item.plan.price}</Text>
                </View>
              ) : null}
              {item.plan?.isActive === true ? (
                <View style={styles.subscriptionMetaPill}>
                  <Text style={styles.subscriptionMetaPillText}>Plan activo</Text>
                </View>
              ) : item.plan ? (
                <View style={styles.subscriptionMetaPill}>
                  <Text style={styles.subscriptionMetaPillText}>Plan inactivo</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.subscriptionDetailLabel}>Vigencia</Text>
            <Text style={styles.subscriptionDateText}>
              {formatShortDate(item.startedAt)} - {item.endsAt ? formatShortDate(item.endsAt) : 'Sin fin'}
            </Text>

            <Text style={styles.subscriptionDetailLabel}>Capacidades del plan</Text>
            <View style={styles.featureListWrap}>
              <View style={styles.capabilityRow}>
                <Text style={styles.capabilityLabel}>Chat</Text>
                <Text style={styles.capabilityValue}>{item.plan?.features?.chatEnabled ? 'Habilitado' : 'No incluido'}</Text>
              </View>
              <View style={styles.capabilityRow}>
                <Text style={styles.capabilityLabel}>Imagenes en chat</Text>
                <Text style={styles.capabilityValue}>{item.plan?.features?.chatImagesEnabled ? 'Habilitado' : 'No incluido'}</Text>
              </View>
              <View style={styles.capabilityRow}>
                <Text style={styles.capabilityLabel}>Videollamadas</Text>
                <Text style={styles.capabilityValue}>{item.plan?.features?.videoCallsEnabled ? 'Habilitado' : 'No incluido'}</Text>
              </View>
              <View style={styles.capabilityRow}>
                <Text style={styles.capabilityLabel}>Max videollamadas por mes</Text>
                <Text style={styles.capabilityValue}>{formatFeatureNumber(item.plan?.features?.maxMonthlyVideoCalls)}</Text>
              </View>
              <View style={styles.capabilityRow}>
                <Text style={styles.capabilityLabel}>Tokens de mensajes</Text>
                <Text style={styles.capabilityValue}>{formatFeatureNumber(item.plan?.features?.messageTokensPerMonth)}</Text>
              </View>
              <View style={styles.capabilityRow}>
                <Text style={styles.capabilityLabel}>Tokens de imagenes</Text>
                <Text style={styles.capabilityValue}>{formatFeatureNumber(item.plan?.features?.imageTokensPerMonth)}</Text>
              </View>
              <View style={[styles.capabilityRow, styles.capabilityRowLast]}>
                <Text style={styles.capabilityLabel}>Duracion en dias</Text>
                <Text style={styles.capabilityValue}>{formatFeatureNumber(item.plan?.features?.durationDays)}</Text>
              </View>
            </View>
          </Card>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background
  },
  content: {
    padding: 20,
    paddingBottom: 120,
    gap: 14
  },
  contentCompact: {
    paddingHorizontal: 14
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4
  },
  card: {
    gap: 10
  },
  firstCard: {
    marginTop: 12
  },
  cardSpaced: {
    marginTop: 10
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4
  },
  recentSubscriptionsTitle: {
    marginTop: 14
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  input: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  inputError: {
    borderColor: colors.error
  },
  fieldErrorText: {
    color: colors.error,
    fontSize: 12,
    marginTop: -4
  },
  button: {
    backgroundColor: colors.primaryDark,
    borderRadius: 12,
    minHeight: 46,
    justifyContent: 'center',
    alignItems: 'center'
  },
  buttonDisabled: {
    opacity: 0.6
  },
  primaryActionButton: {
    flex: 1
  },
  formActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4
  },
  secondaryActionButton: {
    alignItems: 'center',
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: 12
  },
  secondaryActionButtonText: {
    color: colors.primaryDark,
    fontWeight: '700'
  },
  buttonText: {
    color: colors.surface,
    fontWeight: '700'
  },
  stateBox: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  stateText: {
    color: colors.textSecondary
  },
  errorText: {
    color: colors.error,
    textAlign: 'center'
  },
  secondaryButton: {
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 44,
    minWidth: 120,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontWeight: '600'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  switchLabel: {
    color: colors.textPrimary,
    fontWeight: '600'
  },
  modeTabsRow: {
    backgroundColor: colors.primaryLight,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    padding: 6
  },
  modeTab: {
    alignItems: 'center',
    borderRadius: 10,
    flex: 1,
    minHeight: 38,
    justifyContent: 'center'
  },
  modeTabActive: {
    backgroundColor: colors.primaryDark
  },
  modeTabText: {
    color: colors.textPrimary,
    fontWeight: '700'
  },
  modeTabTextActive: {
    color: colors.surface
  },
  planPickerLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2
  },
  planListWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  optionListWrapError: {
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1,
    padding: 8
  },
  planResultsList: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    maxHeight: 220,
    overflow: 'hidden'
  },
  planEditListWrap: {
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden'
  },
  planEditItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  planEditItemSelected: {
    backgroundColor: colors.primary
  },
  planEditItemTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  planEditItemTitleSelected: {
    color: colors.surface
  },
  planEditItemMeta: {
    color: colors.textSecondary,
    fontSize: 12
  },
  planEditItemMetaSelected: {
    color: colors.surface
  },
  emptySearchText: {
    color: colors.textSecondary,
    fontSize: 12,
    padding: 12
  },
  searchIdleHint: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: -2
  },
  selectionSummaryCard: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  selectionSummaryTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  selectionSummaryMeta: {
    color: colors.textSecondary,
    fontSize: 12
  },
  userSearchLoadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 70
  },
  planResultItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 2,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  planResultItemSelected: {
    backgroundColor: colors.primary
  },
  planResultTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  planResultTitleSelected: {
    color: colors.surface
  },
  planResultMeta: {
    color: colors.textSecondary,
    fontSize: 12
  },
  planResultMetaSelected: {
    color: colors.surface
  },
  planChip: {
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  planChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  planChipText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600'
  },
  planChipTextSelected: {
    color: colors.surface
  },
  subscriptionCard: {
    marginTop: 8,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  subscriptionHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between'
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 0,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  statusBadgeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: '700'
  },
  subscriptionMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  subscriptionMetaPill: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  subscriptionMetaPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  subscriptionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700'
  },
  subscriptionCountPill: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  subscriptionCountLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  subscriptionCountValue: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: '800'
  },
  featureListWrap: {
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 0,
    backgroundColor: colors.background
  },
  capabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border
  },
  capabilityRowLast: {
    borderBottomWidth: 0
  },
  capabilityLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    paddingRight: 12
  },
  capabilityValue: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700'
  },
  subscriptionDetailLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  },
  subscriptionDateText: {
    color: colors.textPrimary,
    fontSize: 13
  }
});

function formatFeatureNumber(value: unknown): string {
  const asNumber = Number(value);

  if (!Number.isFinite(asNumber) || asNumber < 0) {
    return '-';
  }

  return String(Math.floor(asNumber));
}

function addDaysFromDate(startedAtIso: string, days: number): string {
  const target = new Date(startedAtIso);
  target.setDate(target.getDate() + days);
  return target.toISOString();
}

function getSubscriptionStatusLabel(status: string): string {
  switch (status) {
    case 'active':
      return 'Activa';
    case 'pending':
      return 'Pendiente';
    case 'canceled':
      return 'Cancelada';
    case 'expired':
      return 'Expirada';
    case 'past_due':
      return 'Con deuda';
    default:
      return status;
  }
}

function getStatusBadgeStyle(status: string): { backgroundColor: string; borderColor: string } {
  if (status === 'active') {
    return { backgroundColor: '#E8F4EA', borderColor: 'transparent' };
  }

  if (status === 'canceled' || status === 'expired') {
    return { backgroundColor: '#FDECEC', borderColor: 'transparent' };
  }

  if (status === 'pending') {
    return { backgroundColor: '#FFF5E6', borderColor: 'transparent' };
  }

  return { backgroundColor: colors.surface, borderColor: 'transparent' };
}

function getPlanDurationDays(plan: SubscriptionPlan): number | null {
  const raw = plan.features?.durationDays;
  const asNumber = Number(raw);

  if (!Number.isFinite(asNumber) || asNumber <= 0) {
    return null;
  }

  return Math.floor(asNumber);
}

function getFeatureBoolean(features: SubscriptionPlanFeatures, key: keyof SubscriptionPlanFeatures, fallback: boolean): boolean {
  const value = features?.[key];
  return typeof value === 'boolean' ? value : fallback;
}

function getFeatureNumber(features: SubscriptionPlanFeatures, key: keyof SubscriptionPlanFeatures): string {
  const value = Number(features?.[key]);
  if (!Number.isFinite(value) || value < 0) {
    return '';
  }

  return String(Math.floor(value));
}

function buildPlanFeatures(input: {
  durationDays: number | null;
  chatEnabled: boolean;
  chatImagesEnabled: boolean;
  videoCallsEnabled: boolean;
  maxMonthlyVideoCalls: number | null;
  messageTokensPerMonth: number | null;
  imageTokensPerMonth: number | null;
}): SubscriptionPlanFeatures {
  const features: SubscriptionPlanFeatures = {
    chatEnabled: input.chatEnabled,
    chatImagesEnabled: input.chatImagesEnabled,
    videoCallsEnabled: input.videoCallsEnabled
  };

  if (input.durationDays && input.durationDays > 0) {
    features.durationDays = input.durationDays;
  }

  if (input.maxMonthlyVideoCalls !== null && input.maxMonthlyVideoCalls >= 0) {
    features.maxMonthlyVideoCalls = input.maxMonthlyVideoCalls;
  }

  if (input.messageTokensPerMonth !== null && input.messageTokensPerMonth >= 0) {
    features.messageTokensPerMonth = input.messageTokensPerMonth;
  }

  if (input.imageTokensPerMonth !== null && input.imageTokensPerMonth >= 0) {
    features.imageTokensPerMonth = input.imageTokensPerMonth;
  }

  return features;
}

function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString();
}

function toPlanLevelOption(level: string): PlanLevelOption {
  if (PLAN_LEVEL_OPTIONS.includes(level as PlanLevelOption)) {
    return level as PlanLevelOption;
  }

  return 'premium';
}

type PlanFormFieldsProps = {
  values: PlanFormValues;
  errors: PlanFormErrors;
  featureValues: PlanFeatureFormValues;
  isSaving: boolean;
  onChangeField: (field: keyof PlanFormValues, value: string) => void;
  onFeatureValueChange: (field: keyof PlanFeatureFormValues, value: boolean | string) => void;
};

function PlanFormFields({
  values,
  errors,
  featureValues,
  isSaving,
  onChangeField,
  onFeatureValueChange
}: PlanFormFieldsProps) {
  return (
    <>
      <Text style={styles.fieldLabel}>Nombre del plan</Text>
      <TextInput
        accessibilityLabel="Nombre del plan"
        editable={!isSaving}
        onChangeText={(value) => onChangeField('name', value)}
        placeholder="Nombre del plan"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, errors.name && styles.inputError]}
        value={values.name}
      />
      {errors.name ? <Text style={styles.fieldErrorText}>{errors.name}</Text> : null}

      <Text style={styles.planPickerLabel}>Nivel del plan</Text>
      <View style={[styles.planListWrap, errors.level && styles.optionListWrapError]}>
        {PLAN_LEVEL_OPTIONS.map((levelOption) => {
          const isSelected = values.level === levelOption;

          return (
            <Pressable
              accessibilityLabel={`Nivel ${levelOption}`}
              disabled={isSaving}
              key={`form-level-${levelOption}`}
              onPress={() => onChangeField('level', levelOption)}
              style={[styles.planChip, isSelected && styles.planChipSelected]}
            >
              <Text style={[styles.planChipText, isSelected && styles.planChipTextSelected]}>{levelOption}</Text>
            </Pressable>
          );
        })}
      </View>
      {errors.level ? <Text style={styles.fieldErrorText}>{errors.level}</Text> : null}

      <Text style={styles.fieldLabel}>Precio</Text>
      <TextInput
        accessibilityLabel="Precio del plan"
        editable={!isSaving}
        keyboardType="decimal-pad"
        onChangeText={(value) => onChangeField('price', value)}
        placeholder="Precio"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, errors.price && styles.inputError]}
        value={values.price}
      />
      {errors.price ? <Text style={styles.fieldErrorText}>{errors.price}</Text> : null}

      <Text style={styles.fieldLabel}>Duracion del plan (dias)</Text>
      <TextInput
        accessibilityLabel="Duracion en dias del plan"
        editable={!isSaving}
        keyboardType="number-pad"
        onChangeText={(value) => onChangeField('durationDays', value)}
        placeholder="Ejemplo: 30"
        placeholderTextColor={colors.textMuted}
        style={[styles.input, errors.durationDays && styles.inputError]}
        value={values.durationDays}
      />
      {errors.durationDays ? <Text style={styles.fieldErrorText}>{errors.durationDays}</Text> : null}

      <Text style={styles.planPickerLabel}>Capacidades de comunicacion</Text>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Chat habilitado</Text>
        <Switch
          accessibilityLabel="Habilitar chat para el plan"
          disabled={isSaving}
          onValueChange={(value) => onFeatureValueChange('chatEnabled', value)}
          trackColor={{ false: colors.primaryLight, true: colors.primary }}
          value={featureValues.chatEnabled}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Imagenes en chat</Text>
        <Switch
          accessibilityLabel="Habilitar imagenes en chat"
          disabled={isSaving}
          onValueChange={(value) => onFeatureValueChange('chatImagesEnabled', value)}
          trackColor={{ false: colors.primaryLight, true: colors.primary }}
          value={featureValues.chatImagesEnabled}
        />
      </View>

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Videollamadas habilitadas</Text>
        <Switch
          accessibilityLabel="Habilitar videollamadas para el plan"
          disabled={isSaving}
          onValueChange={(value) => onFeatureValueChange('videoCallsEnabled', value)}
          trackColor={{ false: colors.primaryLight, true: colors.primary }}
          value={featureValues.videoCallsEnabled}
        />
      </View>

      {featureValues.videoCallsEnabled ? (
        <>
          <Text style={styles.fieldLabel}>Maximo de videollamadas por mes (opcional)</Text>
          <TextInput
            accessibilityLabel="Maximo mensual de videollamadas"
            editable={!isSaving}
            keyboardType="number-pad"
            onChangeText={(value) => onFeatureValueChange('maxMonthlyVideoCalls', value)}
            placeholder="Ejemplo: 8"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, errors.maxMonthlyVideoCalls && styles.inputError]}
            value={featureValues.maxMonthlyVideoCalls}
          />
          {errors.maxMonthlyVideoCalls ? <Text style={styles.fieldErrorText}>{errors.maxMonthlyVideoCalls}</Text> : null}
        </>
      ) : null}

      {featureValues.chatEnabled ? (
        <>
          <Text style={styles.fieldLabel}>Tokens de mensajes por ventana (24h)</Text>
          <TextInput
            accessibilityLabel="Tokens de mensajes"
            editable={!isSaving}
            keyboardType="number-pad"
            onChangeText={(value) => onFeatureValueChange('messageTokensPerMonth', value)}
            placeholder="Ejemplo: 30"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, errors.messageTokensPerMonth && styles.inputError]}
            value={featureValues.messageTokensPerMonth}
          />
          {errors.messageTokensPerMonth ? <Text style={styles.fieldErrorText}>{errors.messageTokensPerMonth}</Text> : null}
        </>
      ) : null}

      {featureValues.chatImagesEnabled ? (
        <>
          <Text style={styles.fieldLabel}>Tokens de imagenes por ventana (24h)</Text>
          <TextInput
            accessibilityLabel="Tokens de imagenes"
            editable={!isSaving}
            keyboardType="number-pad"
            onChangeText={(value) => onFeatureValueChange('imageTokensPerMonth', value)}
            placeholder="Ejemplo: 8"
            placeholderTextColor={colors.textMuted}
            style={[styles.input, errors.imageTokensPerMonth && styles.inputError]}
            value={featureValues.imageTokensPerMonth}
          />
          {errors.imageTokensPerMonth ? <Text style={styles.fieldErrorText}>{errors.imageTokensPerMonth}</Text> : null}
        </>
      ) : null}

    </>
  );
}
