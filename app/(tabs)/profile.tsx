import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { getUserProfile, signOut } from '@/services/auth';
import type { UserProfile } from '@/types/user';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const userProfile = await getUserProfile();
        setProfile(userProfile);
      } catch (error: any) {
        Alert.alert('Error', error.message);
      }
    }

    fetchProfile();
  }, []);

  async function handleLogout() {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.screen}>
        <View style={styles.content}>
          <Text style={styles.loading}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Perfil</Text>
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Ionicons color={colors.primary} name="person" size={30} />
          </View>
          <View>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.email}>{profile.email}</Text>
            <Text style={styles.meta}>
              {profile.skinType} - {profile.role}
            </Text>
          </View>
        </Card>
        <Button onPress={handleLogout} style={{ backgroundColor: colors.primary }}>
          Cerrar sesion
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
    paddingBottom: 116,
  },
  loading: {
    color: colors.text,
  },
  title: {
    color: colors.text,
    fontSize: 30,
    fontWeight: '900',
    paddingTop: 8,
  },
  profileCard: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  name: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  email: {
    color: colors.text,
    fontSize: 16,
  },
  meta: {
    color: colors.secondary,
    fontSize: 14,
  },
});
