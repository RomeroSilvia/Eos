import { AntDesign, Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getLoginErrorMessage, getPostLoginRoute, login as loginUser } from '@/services/auth';
import { getAppleSignInErrorMessage, isAppleSignInAvailable, signInWithApple } from '@/services/appleAuth';
import { getGoogleSignInErrorMessage, signInWithGoogle } from '@/services/googleAuth';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type LoginErrors = {
  email?: string;
  password?: string;
  form?: string;
};

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isAppleAvailable, setIsAppleAvailable] = useState(false);
  const [isAppleSubmitting, setIsAppleSubmitting] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const isAuthActionDisabled = isSubmitting || isGoogleSubmitting || isAppleSubmitting;

  useEffect(() => {
    let isMounted = true;

    isAppleSignInAvailable()
      .then((isAvailable) => {
        if (isMounted) {
          setIsAppleAvailable(isAvailable);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAppleAvailable(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleSubmit() {
    if (isAuthActionDisabled) {
      return;
    }

    const validationErrors = validateLogin(email, password);

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      const profile = await loginUser({
        email: email.trim().toLowerCase(),
        password
      });
      await navigateAfterLogin(profile);
    } catch (error) {
      const message = getLoginErrorMessage(error);
      setErrors({ form: message });
      Alert.alert('Error de Conexión', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    if (isAuthActionDisabled) {
      return;
    }

    setErrors({});
    setIsGoogleSubmitting(true);

    try {
      const profile = await signInWithGoogle();

      if (!profile) {
        return;
      }

      await navigateAfterLogin(profile);
    } catch (error) {
      const message = getGoogleSignInErrorMessage(error);
      setErrors({ form: message });
      Alert.alert('Google Sign-In', message);
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  async function handleAppleSignIn() {
    if (isAuthActionDisabled) {
      return;
    }

    setErrors({});
    setIsAppleSubmitting(true);

    try {
      const profile = await signInWithApple();

      if (!profile) {
        return;
      }

      await navigateAfterLogin(profile);
    } catch (error) {
      const message = getAppleSignInErrorMessage(error);
      setErrors({ form: message });
      Alert.alert('Apple Sign-In', message);
    } finally {
      setIsAppleSubmitting(false);
    }
  }

  async function navigateAfterLogin(profile: Parameters<typeof getPostLoginRoute>[0]) {
    const route = await getPostLoginRoute(profile);
    router.replace(route as never);
  }

  return (
    <SafeAreaView style={styles.screen}>
      <Pressable
        accessibilityLabel="Volver a la landing"
        onPress={() => router.replace('/landing')}
        style={styles.backButton}
      >
        <Ionicons color="#0B132B" name="chevron-back" size={26} />
      </Pressable>

      <View style={styles.container}>
        <Image source={require('@/assets/images/logo.png')} style={styles.logo} />

        <Text style={styles.title}>Iniciar Sesion</Text>

        <Pressable
          accessibilityLabel={isGoogleSubmitting ? 'Conectando con Google' : 'Continuar con Google'}
          accessibilityRole="button"
          accessibilityState={{ busy: isGoogleSubmitting, disabled: isAuthActionDisabled }}
          disabled={isAuthActionDisabled}
          onPress={handleGoogleSignIn}
          style={[styles.socialButton, isAuthActionDisabled && styles.socialButtonDisabled]}
        >
          <AntDesign color="#111111" name="google" size={20} style={styles.socialIcon} />
          <Text style={styles.socialText}>{isGoogleSubmitting ? 'Conectando...' : 'Continuar con Google'}</Text>
        </Pressable>

        {isAppleAvailable ? (
          <AppleAuthentication.AppleAuthenticationButton
            accessibilityLabel={isAppleSubmitting ? 'Conectando con Apple' : 'Continuar con Apple'}
            accessibilityState={{ busy: isAppleSubmitting, disabled: isAuthActionDisabled }}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            cornerRadius={8}
            onPress={handleAppleSignIn}
            style={[styles.appleButton, isAuthActionDisabled && styles.socialButtonDisabled]}
          />
        ) : null}

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>o</Text>
          <View style={styles.dividerLine} />
        </View>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={(value) => {
            setEmail(value);
            setErrors((current) => ({ ...current, email: undefined, form: undefined }));
          }}
          placeholder="Email"
          placeholderTextColor="#A0AEC0"
          style={[styles.input, errors.email ? styles.inputError : null]}
          value={email}
        />
        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

        <View style={styles.passwordWrapper}>
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              setPassword(value);
              setErrors((current) => ({ ...current, password: undefined, form: undefined }));
            }}
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
        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        {errors.form ? <Text style={styles.formErrorText}>{errors.form}</Text> : null}

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
          disabled={isAuthActionDisabled}
          onPress={handleSubmit}
          style={[styles.primaryButton, isAuthActionDisabled && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Continuando...' : 'Continuar'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function validateLogin(email: string, password: string): LoginErrors {
  const nextErrors: LoginErrors = {};
  const trimmedEmail = email.trim();

  if (!trimmedEmail) {
    nextErrors.email = 'El email es obligatorio.';
  } else if (!emailPattern.test(trimmedEmail)) {
    nextErrors.email = 'Ingresa un email valido.';
  }

  if (!password) {
    nextErrors.password = 'La contrasena es obligatoria.';
  }

  return nextErrors;
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
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    left: 16,
    position: 'absolute',
    top: 52,
    width: 44,
    zIndex: 2
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
  socialButtonDisabled: {
    opacity: 0.7
  },
  appleButton: {
    height: 50,
    marginBottom: 12,
    width: '100%'
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
  inputError: {
    borderColor: '#C98F90'
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
  errorText: {
    alignSelf: 'flex-start',
    color: '#B42318',
    fontSize: 12,
    marginBottom: 8,
    marginTop: -6
  },
  formErrorText: {
    alignSelf: 'flex-start',
    color: '#B42318',
    fontSize: 13,
    marginTop: 10
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
