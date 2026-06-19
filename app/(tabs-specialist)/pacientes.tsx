import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { getMyPatients, type SpecialistPatient } from '@/services/specialist';

export default function SpecialistPatientsScreen() {
  const router = useRouter();
  const [patients, setPatients] = useState<SpecialistPatient[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPatients = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getMyPatients();
      setPatients(response);
    } catch {
      setPatients([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadPatients();
    }, [loadPatients])
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Pacientes vinculados</Text>

        {loading ? (
          <View style={styles.centeredState}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.infoText}>Cargando pacientes...</Text>
          </View>
        ) : patients.length === 0 ? (
          <View style={styles.centeredState}>
            <Text style={styles.infoText}>Todavia no tenes pacientes vinculados.</Text>
          </View>
        ) : (
          <FlatList
            data={patients}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <Card style={styles.patientCard}>
                <View style={styles.patientHeaderRow}>
                  <View style={styles.avatarWrap}>
                    {item.profileImageUrl ? (
                      <Image source={{ uri: item.profileImageUrl }} style={styles.avatarImage} />
                    ) : (
                      <Ionicons color={colors.primaryDark} name="person-outline" size={24} />
                    )}
                  </View>

                  <View style={styles.patientMainInfo}>
                    <Text style={styles.patientName}>{item.fullName}</Text>
                    <Text style={styles.patientMeta}>{item.email ?? 'Sin email'}</Text>
                  </View>

                  <View style={styles.skinPill}>
                    <Text style={styles.skinPillText}>{formatSkinType(item.skinType)}</Text>
                  </View>
                </View>

                <Text style={styles.secondaryText}>ID relacion: {item.relationId}</Text>

                <View style={styles.actionsRow}>
                  <Button
                    onPress={() =>
                      router.push(
                        {
                          pathname: '/chat',
                          params: { relationId: item.relationId }
                        } as Href
                      )
                    }
                    style={styles.chatButton}
                  >
                    Chatear con paciente
                  </Button>
                </View>
              </Card>
            )}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    flex: 1,
    padding: 16
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 12
  },
  centeredState: {
    alignItems: 'center',
    flex: 1,
    gap: 10,
    justifyContent: 'center'
  },
  infoText: {
    color: colors.textSecondary,
    fontSize: 14
  },
  listContent: {
    gap: 10,
    paddingBottom: 120
  },
  patientCard: {
    gap: 8
  },
  patientHeaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  avatarWrap: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 48
  },
  avatarImage: {
    height: '100%',
    width: '100%'
  },
  patientMainInfo: {
    flex: 1,
    gap: 2
  },
  patientName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '800'
  },
  patientMeta: {
    color: colors.textSecondary,
    fontSize: 13
  },
  skinPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  skinPillText: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '700'
  },
  secondaryText: {
    color: colors.textMuted,
    fontSize: 11
  },
  actionsRow: {
    marginTop: 4
  },
  chatButton: {
    width: '100%'
  }
});

function formatSkinType(skinType: string | null): string {
  if (!skinType) {
    return 'Piel mixta';
  }

  const labels: Record<string, string> = {
    normal: 'Piel normal',
    dry: 'Piel seca',
    oily: 'Piel grasa',
    mixed: 'Piel mixta',
    sensitive: 'Piel sensible'
  };

  return labels[skinType] ?? `Piel ${skinType}`;
}
