import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { loginMock } from '@/services/auth';

export default function LoginScreen() {
  const [email, setEmail] = useState('marta@eos.app');

  async function handleLogin() {
    await loginMock(email);
    router.replace('/home');
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <Text style={styles.title}>Eos</Text>
        <Text style={styles.subtitle}>Ingresa para seguir tu rutina de skincare.</Text>
        <Card style={styles.card}>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={email}
          />
          <Button onPress={handleLogin}>Ingresar</Button>
          <Button variant="ghost" onPress={() => router.push('/register')}>
            Crear cuenta
          </Button>
        </Card>
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
    justifyContent: 'center',
    padding: 20
  },
  title: {
    color: colors.primaryDark,
    fontSize: 44,
    fontWeight: '900'
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    marginBottom: 22,
    marginTop: 8
  },
  card: {
    gap: 12
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14
  }
});
