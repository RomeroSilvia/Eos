import { AntDesign, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useState } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiConfig } from '@/services/api/client';

type LoginResponse = {
  token?: string | null;
  session?: {
    access_token?: string | null;
  } | null;
  user?: unknown;
  message?: string;
};

const accessTokenKey = 'eos-access-token';
const sessionKey = 'eos-session';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      Alert.alert('Datos incompletos', 'Ingresa tu email y contrasena para continuar.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiConfig.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email.trim(),
          password
        })
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok) {
        Alert.alert('Error del Servidor', data.message ?? 'No se pudo iniciar sesion.');
        return;
      }

      const token = data.token ?? data.session?.access_token;

      if (!token) {
        Alert.alert('Error del servidor', 'No se recibio un token de sesion.');
        return;
      }

      await saveSession(token, data);
      router.replace('/home');
    } catch (error) {
      console.error(error);
      Alert.alert('Error de Conexión', 'No se pudo conectar con el backend. Revisa tu consola.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />

        <Text style={styles.title}>Iniciar Sesion</Text>

        <Pressable style={styles.socialButton}>
          <AntDesign color="#111111" name="google" size={20} style={styles.socialIcon} />
          <Text style={styles.socialText}>Continuar con Google</Text>
        </Pressable>

        <Pressable style={styles.socialButton}>
          <Ionicons color="#111111" name="logo-apple" size={22} style={styles.socialIcon} />
          <Text style={styles.socialText}>Continuar con Apple</Text>
        </Pressable>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor="#A0AEC0"
          style={styles.input}
          value={email}
        />

        <View style={styles.passwordWrapper}>
          <TextInput
            onChangeText={setPassword}
            placeholder="Contrasena"
            placeholderTextColor="#A0AEC0"
            secureTextEntry={!isPasswordVisible}
            style={styles.passwordInput}
            value={password}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={isPasswordVisible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
            onPress={() => setIsPasswordVisible((current) => !current)}
            style={styles.eyeButton}
          >
            <Ionicons color="#718096" name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'} size={22} />
          </Pressable>
        </View>

        <View style={styles.actionLinks}>
          <Pressable onPress={() => router.push('/forgot-password')}>
            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

          <Pressable onPress={() => router.push('/register')}>
            <Text style={styles.registerText}>Registrarme</Text>
          </Pressable>
        </View>

        <Text style={styles.legalText}>
          Al hacer clic en continuar, aceptas nuestros Terminos de Servicio y nuestra Politica de
          Privacidad
        </Text>

        <Pressable
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Continuando...' : 'Continuar'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

async function saveSession(token: string, data: LoginResponse): Promise<void> {
  const serializedSession = JSON.stringify({
    token,
    session: data.session ?? null,
    user: data.user ?? null
  });

  if (Platform.OS === 'web') {
    localStorage.setItem(accessTokenKey, token);
    localStorage.setItem(sessionKey, serializedSession);
    return;
  }

  await SecureStore.setItemAsync(accessTokenKey, token);
  await SecureStore.setItemAsync(sessionKey, serializedSession);
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F9F9F9',
    flex: 1
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  logo: {
    height: 145,
    marginBottom: 18,
    resizeMode: 'contain',
    width: 145
  },
  title: {
    color: '#1A202C',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center'
  },
  socialButton: {
    alignItems: 'center',
    backgroundColor: '#EAF0EC',
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
    padding: 15,
    width: '100%'
  },
  socialIcon: {
    left: 16,
    position: 'absolute'
  },
  socialText: {
    color: '#111111',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center'
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 20,
    width: '100%'
  },
  dividerLine: {
    backgroundColor: '#E2E8F0',
    flex: 1,
    height: 1
  },
  dividerText: {
    color: '#A0AEC0',
    fontSize: 13,
    marginHorizontal: 12
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1A202C',
    height: 50,
    marginBottom: 12,
    paddingHorizontal: 14,
    width: '100%'
  },
  passwordWrapper: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    width: '100%'
  },
  passwordInput: {
    color: '#1A202C',
    flex: 1,
    height: '100%',
    paddingLeft: 14,
    paddingRight: 50
  },
  eyeButton: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 50
  },
  actionLinks: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    marginTop: 10,
    width: '100%'
  },
  forgotPasswordText: {
    color: '#C98F90',
    fontSize: 16
  },
  registerText: {
    color: '#C98F90',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10
  },
  legalText: {
    color: '#718096',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 30,
    textAlign: 'center'
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    marginTop: 16,
    width: '100%'
  },
  primaryButtonDisabled: {
    opacity: 0.7
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center'
  }
});
