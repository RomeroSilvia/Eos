import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { prepareSupabaseRealtimeClient } from '@/services/supabase';
import { getMyPatients, type SpecialistPatient } from '@/services/specialist';

export default function SpecialistConsultationsScreen() {
  const router = useRouter();
  const [patients, setPatients] = useState<SpecialistPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const loadConsultations = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!options.silent) {
      setLoading(true);
      setHasError(false);
    }

    try {
      const response = await getMyPatients();
      setPatients(response.filter((patient) => patient.status === 'active' && Boolean(patient.relationId)));
    } catch {
      if (!options.silent) {
        setPatients([]);
        setHasError(true);
      }
    } finally {
      if (!options.silent) {
        setLoading(false);
      }
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadConsultations();
    }, [loadConsultations])
  );

  useEffect(() => {
    let channel: RealtimeChannel | null = null;
    let isMounted = true;

    void (async () => {
      const supabase = await prepareSupabaseRealtimeClient();

      if (!supabase || !isMounted) {
        return;
      }

      channel = supabase
        .channel('specialist-consultations-unread')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'chat_messages'
          },
          () => {
            void loadConsultations({ silent: true });
          }
        )
        .subscribe();
    })();

    return () => {
      isMounted = false;

      if (channel) {
        void channel.unsubscribe();
      }
    };
  }, [loadConsultations]);

  const consultations = useMemo(() => {
    return [...patients].sort((a, b) => {
      const first = getDateTime(b.lastActivityAt);
      const second = getDateTime(a.lastActivityAt);
      return first - second;
    });
  }, [patients]);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Consultas</Text>
          <Text style={styles.subtitle}>Chats activos con tus pacientes vinculados.</Text>
        </View>

        {loading ? (
          <StateMessage icon="hourglass-outline" message="Cargando consultas..." showSpinner />
        ) : hasError ? (
          <StateMessage icon="alert-circle-outline" message="No pudimos cargar tus consultas. Intenta nuevamente." />
        ) : consultations.length === 0 ? (
          <StateMessage icon="chatbubbles-outline" message="Todavia no tenes consultas activas." />
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={consultations}
            keyExtractor={(item) => item.relationId}
            renderItem={({ item }) => (
              <ConsultationCard
                patient={item}
                onPress={() =>
                  router.push({
                    pathname: routes.chat,
                    params: { relationId: item.relationId }
                  } as Href)
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

function ConsultationCard({ patient, onPress }: { patient: SpecialistPatient; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.cardPressed}>
      <Card style={styles.consultationCard}>
        <View style={styles.cardRow}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{getInitials(patient.fullName)}</Text>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.cardTitleRow}>
              <Text numberOfLines={1} style={styles.patientName}>
                {patient.fullName}
              </Text>
              <UnreadBadge count={patient.unreadCount ?? 0} />
              <Text style={styles.timeText}>{formatTime(patient.lastActivityAt)}</Text>
            </View>

            <Text numberOfLines={1} style={styles.skinText}>
              {formatSkinType(patient.skinType)}
            </Text>

            <View style={styles.previewRow}>
              <Ionicons color={colors.primaryDark} name="chatbubble-ellipses-outline" size={15} />
              <Text numberOfLines={1} style={styles.previewText}>
                Chat disponible
              </Text>
            </View>
          </View>

          <Ionicons color={colors.textMuted} name="chevron-forward" size={22} />
        </View>
      </Card>
    </Pressable>
  );
}

function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) {
    return null;
  }

  return (
    <View style={styles.unreadBadge}>
      <Text style={styles.unreadBadgeText}>{count > 99 ? '99+' : count}</Text>
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

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'P';
}

function formatSkinType(skinType: string | null): string {
  if (!skinType || skinType === 'not_defined' || skinType === 'undefined' || skinType === 'unknown') {
    return 'Piel no registrada';
  }

  const labels: Record<string, string> = {
    normal: 'normal',
    dry: 'seca',
    oily: 'grasa',
    mixed: 'mixta',
    sensitive: 'sensible'
  };

  return `Piel ${labels[skinType] ?? skinType}`;
}

function formatTime(value: string | null): string {
  if (!value) {
    return '';
  }

  const date = parseDate(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  return new Intl.DateTimeFormat('es-AR', isToday
    ? { hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: '2-digit' }
  ).format(date);
}

function getDateTime(value: string | null): number {
  if (!value) {
    return 0;
  }

  const date = parseDate(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function parseDate(value: string): Date {
  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (dateOnlyMatch) {
    return new Date(Number(dateOnlyMatch[1]), Number(dateOnlyMatch[2]) - 1, Number(dateOnlyMatch[3]));
  }

  return new Date(value);
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
  cardPressed: {
    opacity: 0.78
  },
  consultationCard: {
    gap: 10
  },
  cardRow: {
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
    width: 44
  },
  avatarText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900'
  },
  cardContent: {
    flex: 1,
    gap: 4
  },
  cardTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8
  },
  patientName: {
    color: colors.textPrimary,
    flex: 1,
    fontSize: 17,
    fontWeight: '900'
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700'
  },
  unreadBadge: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 9,
    height: 18,
    justifyContent: 'center',
    minWidth: 18,
    paddingHorizontal: 5
  },
  unreadBadgeText: {
    color: colors.surface,
    fontSize: 10,
    fontWeight: '900'
  },
  skinText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6
  },
  previewText: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 13,
    lineHeight: 18
  }
});
