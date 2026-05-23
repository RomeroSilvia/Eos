import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiConfig } from '@/services/api/client';

type ResetPasswordResponse = {
  message?: string;
};

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  async function handleResetPassword() {
    try {
      const response = await fetch(`${apiConfig.baseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      });

      const data = (await response.json().catch(() => null)) as ResetPasswordResponse | null;

      if (!response.ok) {
        Alert.alert('Error del Servidor', data?.message ?? 'No pudimos enviar el correo.');
        return;
      }

      Alert.alert('Correo enviado', data?.message ?? 'Te enviamos un enlace para restablecer tu contraseña.');
      router.push('/login');
    } catch (error) {
      console.error(error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el backend. Revisa tu consola.');
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Restablecer Contraseña</Text>
        <Text style={styles.description}>
          Introduce tu dirección de correo electrónico, y te enviaremos un enlace para restablecer
          tu contraseña
        </Text>
      </View>

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="email@domain.com"
        placeholderTextColor="#94A3B8"
        style={styles.input}
        value={email}
      />

      <Pressable onPress={handleResetPassword} style={styles.button}>
        <Text style={styles.buttonText}>Restablecer</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F9FA',
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60
  },
  header: {
    alignItems: 'center'
  },
  logo: {
    height: 145,
    marginBottom: 24,
    resizeMode: 'contain',
    width: 145
  },
  title: {
    color: '#0B132B',
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center'
  },
  description: {
    color: '#6C757D',
    fontSize: 16,
    lineHeight: 23,
    marginTop: 16,
    textAlign: 'center'
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0B132B',
    fontSize: 15,
    height: 50,
    marginTop: 30,
    paddingHorizontal: 15
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 'auto'
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  }
});
