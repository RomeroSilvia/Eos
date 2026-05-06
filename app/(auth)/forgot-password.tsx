import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiConfig } from '@/services/api/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');

  async function handleResetPassword() {
    try {
      await fetch(`${apiConfig.baseUrl}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
        }),
      });

      Alert.alert('Correo enviado');
      router.push('/login');
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'No pudimos enviar el correo.');
    }
  }

  return (
    <View style={styles.screen}>
      <Image
        source={{ uri: 'https://placehold.co/100x100/F0F0F0/1A202C.png?text=EOS' }}
        style={styles.logo}
      />

      <Text style={styles.title}>Restablecer Contraseña</Text>

      <Text style={styles.description}>
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

      <Pressable onPress={handleResetPassword} style={styles.button}>
        <Text style={styles.buttonText}>Restablecer</Text>
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
    height: 100,
    marginBottom: 24,
    width: 100,
  },
  title: {
    color: '#0B132B',
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  description: {
    color: '#6C757D',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 18,
    textAlign: 'center',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#0B132B',
    height: 50,
    marginTop: 20,
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
