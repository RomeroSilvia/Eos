import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiConfig } from '@/services/api/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleResetPassword() {
    if (!email.trim()) {
      Alert.alert('Error', 'Ingresa tu correo electronico.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiConfig.baseUrl}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        Alert.alert('Error del Servidor', payload.message ?? 'No pudimos enviar el correo.');
        return;
      }

      Alert.alert('Correo enviado', 'Te enviamos un enlace para restablecer tu contraseña.');
      router.push('/login');
    } catch (error) {
      console.error(error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el backend. Revisa tu consola.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <Image resizeMode="contain" source={require('@/assets/images/logo.png')} style={styles.logo} />

      <Text style={styles.title}>Restablecer Contraseña</Text>
      <Text style={styles.subtitle}>
        Introduce tu dirección de correo electrónico, y te enviaremos un enlace para restablecer tu contraseña
      </Text>

      <TextInput
        autoCapitalize="none"
        keyboardType="email-address"
        onChangeText={setEmail}
        placeholder="email@domain.com"
        placeholderTextColor="#A0AEC0"
        style={styles.input}
        value={email}
      />

      <Pressable
        disabled={isSubmitting}
        onPress={handleResetPassword}
        style={[styles.button, isSubmitting && styles.disabledButton]}
      >
        <Text style={styles.buttonText}>{isSubmitting ? 'Enviando...' : 'Restablecer'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F9FA',
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  logo: {
    alignSelf: 'center',
    height: 145,
    width: '100%',
  },
  title: {
    color: '#0B132B',
    fontSize: 30,
    fontWeight: 'bold',
    marginTop: 30,
    textAlign: 'center',
  },
  subtitle: {
    color: '#6C757D',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 14,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0B132B',
    height: 50,
    marginTop: 30,
    paddingHorizontal: 15,
    width: '100%',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 'auto',
    width: '100%',
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
