import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import {
  getMySpecialist,
  getSpecialists,
  linkSpecialist,
  unlinkSpecialist,
  type MySpecialist,
  type SpecialistDirectoryItem,
  type SpecialistSpecialty
} from '@/services/specialist';

export default function SpecialistsScreen() {
  const router = useRouter();
  const [mySpecialist, setMySpecialist] = useState<MySpecialist | null>(null);
  const [specialists, setSpecialists] = useState<SpecialistDirectoryItem[]>([]);
  const [nameQuery, setNameQuery] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<SpecialistSpecialty | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const loadMySpecialist = useCallback(async () => {
    try {
      const nextMySpecialist = await getMySpecialist();
      setMySpecialist(nextMySpecialist);
    } catch {
      setMySpecialist(null);
    }
  }, []);

  const loadSpecialists = useCallback(async () => {
    setLoading(true);
    setSearchError(null);

    try {
      const nextSpecialists = await getSpecialists({ name: nameQuery, specialty: specialtyFilter });
      setSpecialists(nextSpecialists);
    } catch {
      setSearchError('No pudimos buscar especialistas en este momento.');
    } finally {
      setLoading(false);
    }
  }, [nameQuery, specialtyFilter]);

  useEffect(() => {
    void loadMySpecialist();
    void loadSpecialists();
  }, [loadMySpecialist, loadSpecialists]);

  useFocusEffect(
    useCallback(() => {
      void loadMySpecialist();
      void loadSpecialists();
    }, [loadMySpecialist, loadSpecialists])
  );

  async function handleSearch() {
    await loadSpecialists();
  }

  async function handleLink(specialistId: string) {
    setLinkingId(specialistId);

    try {
      await linkSpecialist(specialistId);
      const selected = specialists.find((item) => item.id === specialistId);

      if (selected) {
        setMySpecialist({
          id: selected.id,
          fullName: selected.fullName,
          email: selected.email ?? null,
          specialty: selected.specialty
        });
      }

      await loadMySpecialist();
    } finally {
      setLinkingId(null);
    }
  }

  async function handleUnlink() {
    setLinkingId('unlink');

    try {
      await unlinkSpecialist();
      setMySpecialist(null);
      await loadMySpecialist();
    } finally {
      setLinkingId(null);
    }
  }

  const displayedSpecialists = (() => {
    const base = specialists.map((item) => ({ ...item, pinned: false }));

    if (!mySpecialist) {
      return base;
    }

    const currentIndex = base.findIndex((item) => item.id === mySpecialist.id);

    if (currentIndex >= 0) {
      const [current] = base.splice(currentIndex, 1);
      return [{ ...current, pinned: true }, ...base];
    }

    return [
      {
        id: mySpecialist.id,
        fullName: mySpecialist.fullName,
        email: mySpecialist.email ?? null,
        specialty: mySpecialist.specialty,
        pinned: true
      },
      ...base
    ];
  })();

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Especialistas</Text>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Buscar especialista</Text>
          <TextInput
            value={nameQuery}
            onChangeText={setNameQuery}
            placeholder="Buscar por nombre"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
          <View style={styles.filterRow}>
            <Button variant={specialtyFilter === 'all' ? 'primary' : 'ghost'} onPress={() => setSpecialtyFilter('all')}>
              Todos
            </Button>
            <Button
              variant={specialtyFilter === 'dermatologo' ? 'primary' : 'ghost'}
              onPress={() => setSpecialtyFilter('dermatologo')}
            >
              Dermatologia
            </Button>
            <Button
              variant={specialtyFilter === 'cosmetologo' ? 'primary' : 'ghost'}
              onPress={() => setSpecialtyFilter('cosmetologo')}
            >
              Cosmetologia
            </Button>
          </View>
          <Button onPress={handleSearch}>Buscar</Button>
          {searchError ? <Text style={styles.errorText}>{searchError}</Text> : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Sos especialista?</Text>
          <Text style={styles.description}>
            Si queres registrarte o revisar el estado de tu matricula, segui desde esta opcion.
          </Text>
          <Button onPress={() => router.push('/specialist-status' as never)} style={styles.button}>
            Ver estado de especialista
          </Button>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Mi especialista</Text>
          {mySpecialist ? (
            <View style={styles.mySpecialistCard}>
              <View style={styles.row}>
                <View style={styles.mySpecialistIconWrap}>
                  <Ionicons color={colors.primaryDark} name="medkit-outline" size={22} />
                </View>
                <View style={styles.textBlock}>
                  <Text style={styles.mySpecialistName}>{mySpecialist.fullName}</Text>
                  <View style={styles.specialtyPill}>
                    <Text style={styles.specialtyPillText}>
                      {mySpecialist.specialty ? getSpecialtyLabel(mySpecialist.specialty) : 'Especialidad no informada'}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.description}>Este es tu especialista vinculado actualmente.</Text>
            </View>
          ) : (
            <Text style={styles.description}>Todavia no tenes especialista vinculado.</Text>
          )}
          {mySpecialist ? (
            <Button disabled={linkingId === 'unlink'} onPress={handleUnlink} variant="ghost">
              {linkingId === 'unlink' ? 'Desvinculando...' : 'Desvincular'}
            </Button>
          ) : null}
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Resultados</Text>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.description}>Buscando especialistas...</Text>
            </View>
          ) : displayedSpecialists.length === 0 ? (
            <Text style={styles.description}>No encontramos especialistas para ese filtro.</Text>
          ) : (
            displayedSpecialists.map((item) => {
              const isCurrent = mySpecialist?.id === item.id;

              return (
                <View key={item.id} style={styles.resultItem}>
                  <View style={styles.row}>
                    <View style={styles.iconWrap}>
                      <Ionicons color={colors.primaryDark} name="person-outline" size={22} />
                    </View>
                    <View style={styles.textBlock}>
                      <Text style={styles.resultName}>{item.fullName}</Text>
                      <Text style={styles.description}>
                        {item.specialty ? getSpecialtyLabel(item.specialty) : 'Especialidad no informada'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.resultActionsRow}>
                    <Button
                      onPress={() =>
                        router.push({
                          pathname: '/specialists/[id]' as never,
                          params: {
                            id: item.id,
                            fullName: item.fullName,
                            specialty: item.specialty,
                            email: item.email ?? ''
                          }
                        })
                      }
                      style={styles.resultActionButton}
                      variant="ghost"
                    >
                      Ver perfil
                    </Button>
                    <Button
                      disabled={isCurrent || linkingId === item.id}
                      onPress={() => handleLink(item.id)}
                      style={styles.resultActionButton}
                      variant={isCurrent ? 'secondary' : 'primary'}
                    >
                      {isCurrent
                        ? 'Vinculada'
                        : linkingId === item.id
                          ? 'Vinculando...'
                          : 'Elegir especialista'}
                    </Button>
                  </View>
                </View>
              );
            })
          )}
        </Card>

      </ScrollView>
    </SafeAreaView>
  );
}

function getSpecialtyLabel(specialty: SpecialistSpecialty): string {
  if (specialty === 'dermatologo') {
    return 'Dermatologo/a';
  }

  return 'Cosmetologo/a';
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 14,
    padding: 20,
    paddingBottom: 110
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '900',
    paddingTop: 8
  },
  card: {
    gap: 10
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  textBlock: {
    flex: 1,
    gap: 4
  },
  cardTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '800'
  },
  description: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
  },
  button: {
    marginTop: 4,
    alignSelf: 'flex-start'
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
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  loadingRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10
  },
  errorText: {
    color: '#B3261E',
    fontSize: 13
  },
  resultItem: {
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  resultActionsRow: {
    flexDirection: 'row',
    gap: 8
  },
  resultActionButton: {
    flex: 1
  },
  resultName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '800'
  },
  mySpecialistCard: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 12
  },
  mySpecialistIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 16,
    height: 42,
    justifyContent: 'center',
    width: 42
  },
  mySpecialistName: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: '900'
  },
  specialtyPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  specialtyPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700'
  }
});
