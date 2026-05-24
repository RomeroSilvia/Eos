import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ApiRequestError } from '@/services/api/client';
import { register as registerUser } from '@/services/auth';

const roleOptions = ['No, soy usuario', 'Si, soy dermatologo/a'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterErrors = {
  username?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  form?: string;
};

export default function RegisterScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState(roleOptions[0]);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handlePickImage() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tus fotos para cargar una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    if (!result.canceled) {
      setProfileImageUri(result.assets[0].uri);
    }
  }

  async function handleContinue() {
    const validationErrors = validateRegister({
      username,
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      role
    });

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      await registerUser({
        email: email.trim().toLowerCase(),
        password,
        username: username.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role
      });

      router.push('/start-diagnosis');
    } catch (error) {
      console.error(error);
      const isDuplicateEmail = error instanceof ApiRequestError && error.status === 409;
      const message =
        isDuplicateEmail
          ? 'Este correo ya esta registrado. Inicia sesion o usa otro email.'
          : error instanceof Error
            ? error.message
            : 'No se pudo crear la cuenta.';

      setErrors({ form: message });
      Alert.alert(isDuplicateEmail ? 'Correo ya registrado' : 'Error del Servidor', message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={24}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            accessibilityLabel="Volver a la landing"
            onPress={() => router.replace('/landing')}
            style={styles.backButton}
          >
            <Ionicons color="#0B132B" name="chevron-back" size={26} />
          </Pressable>

          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              {profileImageUri ? (
                <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons color="#6D8D76" name="person-outline" size={58} />
              )}
            </View>
            <Pressable style={styles.editButton} onPress={handlePickImage}>
              <MaterialIcons color="#495057" name="edit" size={18} />
            </Pressable>
          </View>

          <FieldLabel text="Usuario" />
          <TextInput
            autoCapitalize="none"
            onChangeText={(value) => {
              setUsername(value);
              setErrors((current) => ({ ...current, username: undefined, form: undefined }));
            }}
            placeholder="@example_example"
            placeholderTextColor="#A0AEC0"
            style={[styles.input, errors.username ? styles.inputError : null]}
            value={username}
          />
          {errors.username ? <Text style={styles.errorText}>{errors.username}</Text> : null}

          <FieldLabel text="Nombre" />
          <TextInput
            onChangeText={(value) => {
              setFirstName(value);
              setErrors((current) => ({ ...current, firstName: undefined, form: undefined }));
            }}
            placeholder="Example"
            placeholderTextColor="#A0AEC0"
            style={[styles.input, errors.firstName ? styles.inputError : null]}
            value={firstName}
          />
          {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}

          <FieldLabel text="Apellido" />
          <TextInput
            onChangeText={(value) => {
              setLastName(value);
              setErrors((current) => ({ ...current, lastName: undefined, form: undefined }));
            }}
            placeholder="Example"
            placeholderTextColor="#A0AEC0"
            style={[styles.input, errors.lastName ? styles.inputError : null]}
            value={lastName}
          />
          {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}

          <FieldLabel text="Email" />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            onChangeText={(value) => {
              setEmail(value);
              setErrors((current) => ({ ...current, email: undefined, form: undefined }));
            }}
            placeholder="email@domain.com"
            placeholderTextColor="#A0AEC0"
            style={[styles.input, errors.email ? styles.inputError : null]}
            value={email}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

          <FieldLabel text="Contrasena" />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              setPassword(value);
              setErrors((current) => ({
                ...current,
                password: undefined,
                confirmPassword: undefined,
                form: undefined
              }));
            }}
            placeholder="Minimo 6 caracteres"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
            style={[styles.input, errors.password ? styles.inputError : null]}
            value={password}
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

          <FieldLabel text="Confirmar contrasena" />
          <TextInput
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={(value) => {
              setConfirmPassword(value);
              setErrors((current) => ({ ...current, confirmPassword: undefined, form: undefined }));
            }}
            placeholder="Repeti tu contrasena"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
            style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
            value={confirmPassword}
          />
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

          <FieldLabel text="¿Eres Dermatologo?" />
          <Pressable style={styles.selectInput} onPress={() => setIsRoleMenuOpen((current) => !current)}>
            <Text style={styles.selectText}>{role}</Text>
            <Ionicons color="#495057" name="chevron-down" size={20} />
          </Pressable>
          {errors.role ? <Text style={styles.errorText}>{errors.role}</Text> : null}

          {isRoleMenuOpen ? (
            <View style={styles.roleMenu}>
              {roleOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setRole(option);
                    setErrors((current) => ({ ...current, role: undefined, form: undefined }));
                    setIsRoleMenuOpen(false);
                  }}
                  style={styles.roleOption}
                >
                  <Text style={styles.roleOptionText}>{option}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          {errors.form ? <Text style={styles.formErrorText}>{errors.form}</Text> : null}

          <Pressable
            disabled={isSubmitting}
            onPress={handleContinue}
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          >
            <Text style={styles.submitButtonText}>{isSubmitting ? 'Creando cuenta...' : 'Continuar'}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={styles.label}>
      {text} <Text style={styles.required}>*</Text>
    </Text>
  );
}

function validateRegister(values: {
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}): RegisterErrors {
  const nextErrors: RegisterErrors = {};
  const trimmedEmail = values.email.trim();

  if (!values.username.trim()) {
    nextErrors.username = 'El usuario es obligatorio.';
  }

  if (!values.firstName.trim()) {
    nextErrors.firstName = 'El nombre es obligatorio.';
  }

  if (!values.lastName.trim()) {
    nextErrors.lastName = 'El apellido es obligatorio.';
  }

  if (!trimmedEmail) {
    nextErrors.email = 'El email es obligatorio.';
  } else if (!emailPattern.test(trimmedEmail)) {
    nextErrors.email = 'Ingresa un email valido.';
  }

  if (!values.password) {
    nextErrors.password = 'La contrasena es obligatoria.';
  } else if (values.password.length < 6) {
    nextErrors.password = 'La contrasena debe tener al menos 6 caracteres.';
  }

  if (!values.confirmPassword) {
    nextErrors.confirmPassword = 'Confirma tu contrasena.';
  } else if (values.password !== values.confirmPassword) {
    nextErrors.confirmPassword = 'Las contrasenas no coinciden.';
  }

  if (!values.role.trim()) {
    nextErrors.role = 'Selecciona un rol para continuar.';
  }

  return nextErrors;
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F9FA',
    flex: 1
  },
  keyboardView: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    paddingBottom: 180,
    paddingHorizontal: 24
  },
  backButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    marginLeft: -10,
    marginTop: 8,
    width: 44
  },
  avatarWrapper: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 132,
    justifyContent: 'center',
    marginBottom: 22,
    marginTop: 8,
    position: 'relative',
    width: 132
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EBF4EC',
    borderColor: '#C3E0C5',
    borderRadius: 60,
    borderWidth: 2,
    height: 120,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 120
  },
  avatarImage: {
    height: '100%',
    width: '100%'
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    bottom: 4,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 4,
    zIndex: 2,
    shadowColor: '#000000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    width: 36
  },
  label: {
    color: '#495057',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16
  },
  required: {
    color: '#C98F90'
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1A202C',
    height: 50,
    paddingHorizontal: 14,
    width: '100%'
  },
  inputError: {
    borderColor: '#C98F90'
  },
  selectInput: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    height: 50,
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    width: '100%'
  },
  selectText: {
    color: '#1A202C',
    fontSize: 15
  },
  roleMenu: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
    width: '100%'
  },
  roleOption: {
    paddingHorizontal: 14,
    paddingVertical: 14
  },
  roleOptionText: {
    color: '#495057',
    fontSize: 15
  },
  errorText: {
    color: '#B42318',
    fontSize: 12,
    marginTop: 6
  },
  formErrorText: {
    color: '#B42318',
    fontSize: 13,
    marginTop: 18
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 40,
    width: '100%'
  },
  submitButtonDisabled: {
    opacity: 0.7
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
