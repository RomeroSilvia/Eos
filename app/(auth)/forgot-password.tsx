import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiConfig, getFriendlyAuthErrorMessage } from '@/services/api/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = email.trim().length > 0 && !isSubmitting;

  async function handleResetPassword() {
    if (!email.trim()) {
      Alert.alert('Datos incompletos', 'Ingresa tu email para continuar.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiConfig.baseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email.trim() })
      });

      if (!response.ok) {
        await logAuthResponseInDevelopment(response, 'forgot-password');
        Alert.alert('Error del Servidor', getFriendlyAuthErrorMessage(response.status));
        return;
      }

      Alert.alert(
        'Correo enviado',
        'Si el email está registrado, vas a recibir instrucciones para recuperar tu contraseña.'
      );
      router.push('/login');
    } catch (error) {
      logAuthErrorInDevelopment(error, 'forgot-password');
      Alert.alert('Error de Conexion', 'Ocurrió un error. Intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Restablecer Contrasena</Text>
        <Text style={styles.description}>
          Introduce tu direccion de correo electronico, y te enviaremos un enlace para restablecer
          tu contrasena
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

      <Pressable
        disabled={!canSubmit}
        onPress={handleResetPassword}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
      >
        <Text style={styles.buttonText}>{isSubmitting ? 'Enviando...' : 'Restablecer'}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

async function logAuthResponseInDevelopment(response: Response, flow: string): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    return;
  }

  const body = await response.clone().json().catch(() => null);
  console.warn(`[auth/${flow}]`, {
    status: response.status,
    body
  });
}

function logAuthErrorInDevelopment(error: unknown, flow: string): void {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[auth/${flow}]`, error);
  }
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
  buttonDisabled: {
    opacity: 0.55
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  }
});
