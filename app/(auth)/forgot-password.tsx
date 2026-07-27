import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { routes } from '@/constants/routes';
import { ApiRequestError, getFriendlyAuthErrorMessage } from '@/services/api/client';
import { resetPassword } from '@/services/auth';

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
      await resetPassword(email.trim());

      Alert.alert(
        'Correo enviado',
        'Si el email está registrado, vas a recibir instrucciones para recuperar tu contraseña.'
      );
      router.push(routes.login);
    } catch (error) {
      if (__DEV__) console.warn('[auth/forgot-password]', error);

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
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        value={email}
      />

      <Pressable
        accessibilityState={{ disabled: !canSubmit, busy: isSubmitting }}
        disabled={!canSubmit}
        onPress={handleResetPassword}
        style={[styles.button, !canSubmit && styles.buttonDisabled]}
      >
        {isSubmitting ? <ActivityIndicator color={colors.surface} size="small" style={styles.buttonSpinner} /> : null}
        <Text style={styles.buttonText}>{isSubmitting ? 'Enviando...' : 'Restablecer'}</Text>
      </Pressable>
    </SafeAreaView>
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
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23,
    marginTop: 16,
    textAlign: 'center'
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.textPrimary,
    fontSize: 15,
    height: 50,
    marginTop: 30,
    paddingHorizontal: 15
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
