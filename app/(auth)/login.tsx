import { Ionicons } from '@expo/vector-icons';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiConfig } from '@/services/api/client';

const AUTH_TOKEN_KEY = 'eos.auth.token';
const AUTH_REFRESH_TOKEN_KEY = 'eos.auth.refreshToken';
const AUTH_USER_KEY = 'eos.auth.user';

type LoginResponse = {
  status: 'success';
  message: string;
  data: {
    token: string;
    refreshToken: string;
    expiresAt: number | null;
    user: {
      id: string;
      email: string;
      full_name: string;
      role: string;
      skinType: string;
    };
  };
};

type GoogleLoginResponse = {
  status: 'success';
  message: string;
  data: {
    access_token: string;
    refresh_token?: string;
    isNewUser: boolean;
    user?: unknown;
  };
};

async function setStoredItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: 'TU_GOOGLE_WEB_CLIENT_ID_AQUI',
    });
  }, []);

  async function handleSubmit() {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Ingresa tu email y contrasena.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiConfig.baseUrl}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const payload = (await response.json()) as LoginResponse | { message?: string };

      if (!response.ok || !('data' in payload)) {
        throw new Error(payload.message ?? 'No pudimos iniciar sesion.');
      }

      const profile = {
        id: payload.data.user.id,
        name: payload.data.user.full_name,
        email: payload.data.user.email,
        role: payload.data.user.role,
        skinType: payload.data.user.skinType,
      };

      await Promise.all([
        setStoredItem(AUTH_TOKEN_KEY, payload.data.token),
        setStoredItem(AUTH_REFRESH_TOKEN_KEY, payload.data.refreshToken),
        setStoredItem(AUTH_USER_KEY, JSON.stringify(profile)),
      ]);

      router.replace('/(tabs)/home');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    setIsGoogleSubmitting(true);

    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = (userInfo as any).idToken ?? (userInfo as any).data?.idToken;

      if (!idToken) {
        throw new Error('No pudimos obtener el token de Google.');
      }

      const response = await fetch(`${apiConfig.baseUrl}/auth/google`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken }),
      });

      const payload = (await response.json()) as GoogleLoginResponse | { message?: string };

      if (!response.ok || !('data' in payload)) {
        throw new Error(payload.message ?? 'No pudimos iniciar sesion con Google.');
      }

      await Promise.all([
        setStoredItem(AUTH_TOKEN_KEY, payload.data.access_token),
        payload.data.refresh_token
          ? setStoredItem(AUTH_REFRESH_TOKEN_KEY, payload.data.refresh_token)
          : Promise.resolve(),
        payload.data.user ? setStoredItem(AUTH_USER_KEY, JSON.stringify(payload.data.user)) : Promise.resolve(),
      ]);

      if (payload.data.isNewUser) {
        router.replace('/start-quiz');
        return;
      }

      router.replace('/home');
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'No pudimos iniciar sesion con Google.');
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.container}>
        <Image
          source={{ uri: 'https://placehold.co/100x100/F0F0F0/1A202C.png?text=EOS' }}
          style={styles.logo}
        />

        <Text style={styles.title}>Iniciar Sesion</Text>

        <Pressable
          disabled={isGoogleSubmitting}
          onPress={handleGoogleLogin}
          style={[styles.socialButton, isGoogleSubmitting && styles.disabledButton]}
        >
          <Ionicons color="#000000" name="logo-google" size={22} style={styles.socialIcon} />
          <Text style={styles.socialText}>
            {isGoogleSubmitting ? 'Conectando...' : 'Continuar con Google'}
          </Text>
        </Pressable>

        <Pressable style={styles.socialButton}>
          <Ionicons color="#000000" name="logo-apple" size={24} style={styles.socialIcon} />
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

        <View style={styles.passwordInput}>
          <TextInput
            onChangeText={setPassword}
            placeholder="Contrasena"
            placeholderTextColor="#A0AEC0"
            secureTextEntry={!isPasswordVisible}
            style={styles.passwordTextInput}
            value={password}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsPasswordVisible((current) => !current)}
            style={styles.eyeButton}
          >
            <Ionicons
              color="#718096"
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
            />
          </Pressable>
        </View>

        <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.forgotPasswordLink}>
          <Text style={styles.forgotPassword}>¿Olvidaste tu contraseña?</Text>
        </Pressable>

        <View style={styles.actionLinks}>
          <Pressable onPress={() => router.push('/(auth)/register')}>
            <Text style={styles.registerLink}>Registrarme</Text>
          </Pressable>
        </View>

        <Text style={styles.legalText}>
          Al hacer clic en continuar, aceptas nuestros Terminos de Servicio y nuestra Politica de Privacidad
        </Text>

        <Pressable
          disabled={isSubmitting}
          onPress={handleSubmit}
          style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Continuando...' : 'Continuar'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F9F9F9',
    flex: 1,
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  logo: {
    height: 100,
    marginBottom: 18,
    width: 100,
  },
  title: {
    color: '#1A202C',
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  socialButton: {
    alignItems: 'center',
    backgroundColor: '#EAF0EC',
    borderRadius: 8,
    justifyContent: 'center',
    marginBottom: 12,
    padding: 15,
    position: 'relative',
    width: '100%',
  },
  socialIcon: {
    left: 16,
    position: 'absolute',
  },
  socialText: {
    color: '#000000',
    fontSize: 15,
    textAlign: 'center',
  },
  divider: {
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 20,
    width: '100%',
  },
  dividerLine: {
    backgroundColor: '#E2E8F0',
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: '#A0AEC0',
    fontSize: 13,
    marginHorizontal: 12,
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
    width: '100%',
  },
  passwordInput: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    width: '100%',
  },
  passwordTextInput: {
    color: '#1A202C',
    flex: 1,
    height: '100%',
    paddingLeft: 14,
    paddingRight: 48,
  },
  eyeButton: {
    alignItems: 'center',
    height: 50,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 48,
  },
  actionLinks: {
    alignItems: 'flex-start',
    flexDirection: 'column',
    width: '100%',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    marginTop: 10,
  },
  forgotPassword: {
    color: '#9F5F61',
    fontSize: 14,
  },
  registerLink: {
    color: '#C98F90',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
  legalText: {
    color: '#718096',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 30,
    textAlign: 'center',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 8,
    height: 50,
    justifyContent: 'center',
    marginTop: 18,
    width: '100%',
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
