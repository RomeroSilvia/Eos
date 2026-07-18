import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiConfig, getFriendlyAuthErrorMessage } from '@/services/api/client';

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit = password.length > 0 && confirmPassword.length > 0 && !isSubmitting;

  async function handleSavePassword() {
    if (!canSubmit) {
      if (!isSubmitting) {
        Alert.alert('Datos incompletos', 'Completa ambos campos de contrasena para continuar.');
      }
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    if (!isValidPassword(password)) {
      Alert.alert('Error', 'La contraseña no cumple los requisitos.');
      return;
    }

    setIsSubmitting(true);

    try {
      const accessToken = getRecoveryAccessToken();

      if (!accessToken) {
        Alert.alert(
          'Link inválido',
          'No encontramos el token de recuperación. Abrí nuevamente el enlace desde tu correo.'
        );
        return;
      }

      const response = await fetch(`${apiConfig.baseUrl}/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({ newPassword: password, accessToken })
      });

      if (!response.ok) {
        await logAuthResponseInDevelopment(response, 'update-password');
        Alert.alert('Error del Servidor', getFriendlyAuthErrorMessage(response.status));
        return;
      }

      Alert.alert('Contraseña actualizada', 'Tu contraseña fue actualizada.');
      router.replace('/login');
    } catch (error) {
      logAuthErrorInDevelopment(error, 'update-password');
      Alert.alert('Error de Conexión', 'Ocurrió un error. Intentá nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
        <Text style={styles.title}>Restablecer Contraseña</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Nueva contraseña</Text>
        <View style={styles.inputContainer}>
          <TextInput
            onChangeText={setPassword}
            placeholder="contraseña"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showPassword}
            style={styles.input}
            value={password}
          />
          <Pressable
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setShowPassword((value) => !value)}
            style={styles.eyeButton}
          >
            <Ionicons color="#6C757D" name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} />
          </Pressable>
        </View>

        <Text style={styles.validationText}>
          {'° Mínimo 8 caracteres\n° Al menos un número\n° Una letra mayúscula\n° Un carácter especial (ej. !@#$%^&*)'}
        </Text>

        <Text style={styles.label}>Confirmar contraseña</Text>
        <View style={styles.inputContainer}>
          <TextInput
            onChangeText={setConfirmPassword}
            placeholder="contraseña"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
            value={confirmPassword}
          />
          <Pressable
            accessibilityLabel={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onPress={() => setShowConfirmPassword((value) => !value)}
            style={styles.eyeButton}
          >
            <Ionicons color="#6C757D" name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={22} />
          </Pressable>
        </View>
      </View>

      <Pressable
        accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
        disabled={!canSubmit}
        onPress={handleSavePassword}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
      >
        {isSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" style={styles.buttonSpinner} /> : null}
        <Text style={styles.buttonText}>{isSubmitting ? 'Guardando...' : 'Guardar Contraseña'}</Text>
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

function isValidPassword(value: string) {
  return (
    value.length >= 8 &&
    /\d/.test(value) &&
    /[A-Z]/.test(value) &&
    /[!@#$%^&*]/.test(value)
  );
}

function getRecoveryAccessToken(): string | null {
  if (Platform.OS !== 'web') {
    return null;
  }

  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const searchParams = new URLSearchParams(window.location.search);

  return (
    hashParams.get('access_token') ??
    searchParams.get('access_token') ??
    searchParams.get('token') ??
    null
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
  form: {
    marginTop: 44
  },
  label: {
    color: '#495057',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    paddingLeft: 15
  },
  input: {
    color: '#0B132B',
    flex: 1,
    fontSize: 15,
    height: '100%'
  },
  eyeButton: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: 48
  },
  validationText: {
    color: '#6C757D',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 22,
    marginTop: 10
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 12,
    flexDirection: 'row',
    height: 54,
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 'auto'
  },
  buttonDisabled: {
    opacity: 0.55
  },
  buttonSpinner: {
    marginRight: 10
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  }
});
