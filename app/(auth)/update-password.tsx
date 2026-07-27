import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { ApiRequestError, getFriendlyAuthErrorMessage } from '@/services/api/client';
import { updatePasswordWithRecoveryToken } from '@/services/auth';
import { isValidPassword } from '@/utils/password';

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

      await updatePasswordWithRecoveryToken(password, accessToken);

      Alert.alert('Contraseña actualizada', 'Tu contraseña fue actualizada.');
      router.replace(routes.login);
    } catch (error) {
      if (__DEV__) console.warn('[auth/update-password]', error);

      const status = error instanceof ApiRequestError ? error.status : undefined;
      Alert.alert('Error', getFriendlyAuthErrorMessage(status));
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
            accessibilityLabel="Nueva contraseña"
            onChangeText={setPassword}
            placeholder="contraseña"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showPassword}
            style={styles.input}
            value={password}
          />
          <Pressable
            accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityRole="button"
            onPress={() => setShowPassword((value) => !value)}
            style={styles.eyeButton}
          >
            <Ionicons color={colors.textSecondary} name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} />
          </Pressable>
        </View>

        <Text style={styles.validationText}>
          {'° Mínimo 8 caracteres\n° Al menos un número\n° Una letra mayúscula\n° Un carácter especial (ej. !@#$%^&*)'}
        </Text>

        <Text style={styles.label}>Confirmar contraseña</Text>
        <View style={styles.inputContainer}>
          <TextInput
            accessibilityLabel="Confirmar contraseña"
            onChangeText={setConfirmPassword}
            placeholder="contraseña"
            placeholderTextColor={colors.textMuted}
            secureTextEntry={!showConfirmPassword}
            style={styles.input}
            value={confirmPassword}
          />
          <Pressable
            accessibilityLabel={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            accessibilityRole="button"
            onPress={() => setShowConfirmPassword((value) => !value)}
            style={styles.eyeButton}
          >
            <Ionicons color={colors.textSecondary} name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={22} />
          </Pressable>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Guardar contraseña"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
        disabled={!canSubmit}
        onPress={handleSavePassword}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
      >
        {isSubmitting ? <ActivityIndicator color={colors.surface} size="small" style={styles.buttonSpinner} /> : null}
        <Text style={styles.buttonText}>{isSubmitting ? 'Guardando...' : 'Guardar Contraseña'}</Text>
      </Pressable>
    </SafeAreaView>
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
    backgroundColor: colors.background,
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
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center'
  },
  form: {
    marginTop: 44
  },
  label: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 8
  },
  inputContainer: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    paddingLeft: 15
  },
  input: {
    color: colors.textPrimary,
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
    color: colors.textSecondary,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 22,
    marginTop: 10
  },
  button: {
    alignItems: 'center',
    backgroundColor: colors.secondary,
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
    color: colors.surface,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center'
  }
});
