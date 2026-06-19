import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useState } from 'react';
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
import { ApiRequestError, getFriendlyErrorMessage } from '@/services/api/client';
import { register as registerUser } from '@/services/auth';
import {
  prepareSpecialistDocumentImage,
  registerSpecialist,
  type SpecialistDocumentImage,
  type SpecialistSpecialty
} from '@/services/specialist';

const roleOptions: { label: string; value: 'user' | 'specialist' }[] = [
  { label: 'No, soy usuario', value: 'user' },
  { label: 'Si, soy especialista', value: 'specialist' }
];

const specialtyOptions: { label: string; value: SpecialistSpecialty }[] = [
  { label: 'Dermatologo/a', value: 'dermatologo' },
  { label: 'Cosmetologo/a', value: 'cosmetologo' }
];

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RegisterErrors = {
  username?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
  specialty?: string;
  licenseNumber?: string;
  dniPhoto?: string;
  titlePhoto?: string;
  form?: string;
};

export default function RegisterScreen() {
  const router = useRouter();
  const { mode, requestOnly } = useLocalSearchParams<{ mode?: string; requestOnly?: string }>();
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<'user' | 'specialist'>(mode === 'specialist' ? 'specialist' : 'user');
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [specialty, setSpecialty] = useState<SpecialistSpecialty>('dermatologo');
  const [isSpecialtyMenuOpen, setIsSpecialtyMenuOpen] = useState(false);
  const [licenseNumber, setLicenseNumber] = useState('');
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);
  const [dniPhoto, setDniPhoto] = useState<SpecialistDocumentImage | null>(null);
  const [titlePhoto, setTitlePhoto] = useState<SpecialistDocumentImage | null>(null);
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [compressingDocument, setCompressingDocument] = useState<'dni' | 'title' | null>(null);
  const [isSpecialistAccountReady, setIsSpecialistAccountReady] = useState(requestOnly === '1');

  const isSpecialistRequestOnly = role === 'specialist' && (requestOnly === '1' || isSpecialistAccountReady);
  const needsAccountFields = role === 'user' || !isSpecialistRequestOnly;

  useEffect(() => {
    if (mode === 'specialist') {
      setRole('specialist');
    }
  }, [mode]);

  async function handlePickImage() {
    const asset = await pickImage('Necesitamos acceso a tus fotos para cargar una imagen.');

    if (asset) {
      setProfileImageUri(asset.uri);
    }
  }

  async function handlePickSpecialistDocument(kind: 'dni' | 'title') {
    const asset = await pickImage('Necesitamos acceso a tus fotos para cargar la documentacion.');

    if (!asset) {
      return;
    }

    setCompressingDocument(kind);

    try {
      const document = await prepareSpecialistDocumentImage(asset, kind === 'dni' ? 'dni' : 'titulo');

      if (kind === 'dni') {
        setDniPhoto(document);
        setErrors((current) => ({ ...current, dniPhoto: undefined, form: undefined }));
        return;
      }

      setTitlePhoto(document);
      setErrors((current) => ({ ...current, titlePhoto: undefined, form: undefined }));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'No pudimos preparar la imagen. Elegi otra foto e intenta nuevamente.';

      if (kind === 'dni') {
        setDniPhoto(null);
        setErrors((current) => ({ ...current, dniPhoto: message, form: undefined }));
      } else {
        setTitlePhoto(null);
        setErrors((current) => ({ ...current, titlePhoto: message, form: undefined }));
      }

      Alert.alert('Imagen no disponible', message);
    } finally {
      setCompressingDocument(null);
    }
  }

  async function pickImage(permissionMessage: string): Promise<ImagePicker.ImagePickerAsset | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permiso requerido', permissionMessage);
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8
    });

    return result.canceled ? null : result.assets[0];
  }

  async function handleContinue() {
    if (compressingDocument) {
      Alert.alert('Preparando imagen', 'Esperá a que terminemos de comprimir la imagen antes de enviar.');
      return;
    }

    const validationErrors = validateRegister({
      username,
      fullName,
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      role,
      specialty,
      licenseNumber,
      dniPhoto,
      titlePhoto,
      requestOnly: isSpecialistRequestOnly
    });

    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      if (!isSpecialistRequestOnly) {
        const specialistName = splitFullName(fullName);

        await registerUser({
          email: email.trim().toLowerCase(),
          password,
          username: role === 'specialist' ? buildSpecialistUsername(fullName, email) : username.trim(),
          firstName: role === 'specialist' ? specialistName.firstName : firstName.trim(),
          lastName: role === 'specialist' ? specialistName.lastName : lastName.trim(),
          role,
          specialty: role === 'specialist' ? specialty : undefined
        });
      }

      if (role === 'specialist') {
        try {
          await registerSpecialist({
            specialty,
            licenseNumber: licenseNumber.trim(),
            dniPhoto: dniPhoto as SpecialistDocumentImage,
            titlePhoto: titlePhoto as SpecialistDocumentImage
          });
        } catch (specialistError) {
          setIsSpecialistAccountReady(true);
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[register/specialist]', specialistError);
          }

          const message = getFriendlyErrorMessage(
            specialistError,
            'La cuenta fue creada, pero no pudimos enviar la solicitud de especialista.'
          );
          const retryMessage = `${message} Corregi los datos o las fotos y volve a enviar la solicitud.`;
          setErrors({ form: retryMessage });
          Alert.alert('Solicitud pendiente de envio', retryMessage);
          return;
        }

        router.replace('/specialist-status' as never);
        return;
      }

      router.push('/start-diagnosis');
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.error(error);
      }
      const isDuplicateEmail = error instanceof ApiRequestError && error.status === 409;
      const message =
        isDuplicateEmail
          ? 'Este correo ya esta registrado. Inicia sesion o usa otro email.'
          : getFriendlyErrorMessage(error, 'No se pudo crear la cuenta.');

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

          {role === 'user' ? (
            <UserAvatar profileImageUri={profileImageUri} onPickImage={handlePickImage} />
          ) : (
            <SpecialistIntro />
          )}

          {role === 'user' ? (
            <>
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
            </>
          ) : null}

          {role === 'specialist' && !isSpecialistRequestOnly ? (
            <>
              <FieldLabel text="Nombre completo" />
              <TextInput
                onChangeText={(value) => {
                  setFullName(value);
                  setErrors((current) => ({ ...current, fullName: undefined, form: undefined }));
                }}
                placeholder="Dra. Marta Lopez"
                placeholderTextColor="#A0AEC0"
                style={[styles.input, errors.fullName ? styles.inputError : null]}
                value={fullName}
              />
              {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}
            </>
          ) : null}

          {isSpecialistRequestOnly ? (
            <View style={styles.retryNotice}>
              <Ionicons color="#6D8D76" name="information-circle-outline" size={22} />
              <Text style={styles.retryText}>
                Tu cuenta ya esta creada. Envia o reintenta la solicitud con tu matricula y documentos.
              </Text>
            </View>
          ) : null}

          {needsAccountFields ? (
            <>
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
              <PasswordField
                error={errors.password}
                isVisible={showPassword}
                onChangeText={(value) => {
                  setPassword(value);
                  setErrors((current) => ({
                    ...current,
                    password: undefined,
                    confirmPassword: undefined,
                    form: undefined
                  }));
                }}
                onToggleVisibility={() => setShowPassword((current) => !current)}
                placeholder="Minimo 6 caracteres"
                value={password}
              />
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

              <FieldLabel text="Confirmar contrasena" />
              <PasswordField
                error={errors.confirmPassword}
                isVisible={showConfirmPassword}
                onChangeText={(value) => {
                  setConfirmPassword(value);
                  setErrors((current) => ({ ...current, confirmPassword: undefined, form: undefined }));
                }}
                onToggleVisibility={() => setShowConfirmPassword((current) => !current)}
                placeholder="Repeti tu contrasena"
                value={confirmPassword}
              />
              {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
            </>
          ) : null}

          {mode ? null : (
            <>
              <FieldLabel text="Tipo de cuenta" />
              <Pressable style={styles.selectInput} onPress={() => setIsRoleMenuOpen((current) => !current)}>
                <Text style={styles.selectText}>{getRoleLabel(role)}</Text>
                <Ionicons color="#495057" name="chevron-down" size={20} />
              </Pressable>
              {errors.role ? <Text style={styles.errorText}>{errors.role}</Text> : null}

              {isRoleMenuOpen ? (
                <View style={styles.roleMenu}>
                  {roleOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => {
                        setRole(option.value);
                        setErrors((current) => ({ ...current, role: undefined, form: undefined }));
                        setIsRoleMenuOpen(false);
                      }}
                      style={styles.roleOption}
                    >
                      <Text style={styles.roleOptionText}>{option.label}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </>
          )}

          {role === 'specialist' ? (
            <SpecialistFields
              compressingDocument={compressingDocument}
              dniPhoto={dniPhoto}
              errors={errors}
              isSpecialtyMenuOpen={isSpecialtyMenuOpen}
              licenseNumber={licenseNumber}
              onPickDocument={handlePickSpecialistDocument}
              onSetErrors={setErrors}
              setIsSpecialtyMenuOpen={setIsSpecialtyMenuOpen}
              setLicenseNumber={setLicenseNumber}
              setSpecialty={setSpecialty}
              specialty={specialty}
              titlePhoto={titlePhoto}
            />
          ) : null}

          {errors.form ? <Text style={styles.formErrorText}>{errors.form}</Text> : null}

          <Pressable
            disabled={isSubmitting || compressingDocument !== null}
            onPress={handleContinue}
            style={[styles.submitButton, (isSubmitting || compressingDocument !== null) && styles.submitButtonDisabled]}
          >
            <Text style={styles.submitButtonText}>
              {compressingDocument ? 'Preparando imagen...' : getSubmitLabel(isSubmitting, role, isSpecialistRequestOnly)}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function UserAvatar({ onPickImage, profileImageUri }: { onPickImage: () => void; profileImageUri: string | null }) {
  return (
    <View style={styles.avatarWrapper}>
      <View style={styles.avatar}>
        {profileImageUri ? (
          <Image source={{ uri: profileImageUri }} style={styles.avatarImage} />
        ) : (
          <Ionicons color="#6D8D76" name="person-outline" size={58} />
        )}
      </View>
      <Pressable style={styles.editButton} onPress={onPickImage}>
        <MaterialIcons color="#495057" name="edit" size={18} />
      </Pressable>
    </View>
  );
}

function SpecialistIntro() {
  return (
    <View style={styles.specialistIntro}>
      <View style={styles.specialistIcon}>
        <Ionicons color="#6D8D76" name="medkit-outline" size={30} />
      </View>
      <View style={styles.specialistIntroCopy}>
        <Text style={styles.specialistTitle}>Registro de especialista</Text>
        <Text style={styles.specialistSubtitle}>
          Completa tu documentacion profesional para que podamos verificar tu matricula.
        </Text>
      </View>
    </View>
  );
}

function SpecialistFields({
  compressingDocument,
  dniPhoto,
  errors,
  isSpecialtyMenuOpen,
  licenseNumber,
  onPickDocument,
  onSetErrors,
  setIsSpecialtyMenuOpen,
  setLicenseNumber,
  setSpecialty,
  specialty,
  titlePhoto
}: {
  compressingDocument: 'dni' | 'title' | null;
  dniPhoto: SpecialistDocumentImage | null;
  errors: RegisterErrors;
  isSpecialtyMenuOpen: boolean;
  licenseNumber: string;
  onPickDocument: (kind: 'dni' | 'title') => void;
  onSetErrors: Dispatch<SetStateAction<RegisterErrors>>;
  setIsSpecialtyMenuOpen: Dispatch<SetStateAction<boolean>>;
  setLicenseNumber: Dispatch<SetStateAction<string>>;
  setSpecialty: Dispatch<SetStateAction<SpecialistSpecialty>>;
  specialty: SpecialistSpecialty;
  titlePhoto: SpecialistDocumentImage | null;
}) {
  return (
    <View style={styles.specialistSection}>
      <FieldLabel text="Especialidad" />
      <Pressable style={styles.selectInput} onPress={() => setIsSpecialtyMenuOpen((current) => !current)}>
        <Text style={styles.selectText}>{getSpecialtyLabel(specialty)}</Text>
        <Ionicons color="#495057" name="chevron-down" size={20} />
      </Pressable>
      {errors.specialty ? <Text style={styles.errorText}>{errors.specialty}</Text> : null}

      {isSpecialtyMenuOpen ? (
        <View style={styles.roleMenu}>
          {specialtyOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                setSpecialty(option.value);
                onSetErrors((current) => ({ ...current, specialty: undefined, form: undefined }));
                setIsSpecialtyMenuOpen(false);
              }}
              style={styles.roleOption}
            >
              <Text style={styles.roleOptionText}>{option.label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <FieldLabel text="Numero de matricula" />
      <TextInput
        autoCapitalize="characters"
        onChangeText={(value) => {
          setLicenseNumber(value);
          onSetErrors((current) => ({ ...current, licenseNumber: undefined, form: undefined }));
        }}
        placeholder="MN-12345"
        placeholderTextColor="#A0AEC0"
        style={[styles.input, errors.licenseNumber ? styles.inputError : null]}
        value={licenseNumber}
      />
      {errors.licenseNumber ? <Text style={styles.errorText}>{errors.licenseNumber}</Text> : null}

      <DocumentPickerButton
        document={dniPhoto}
        error={errors.dniPhoto}
        isCompressing={compressingDocument === 'dni'}
        label="Foto del DNI"
        onPress={() => onPickDocument('dni')}
        selectedLabel="DNI seleccionado"
      />
      <DocumentPickerButton
        document={titlePhoto}
        error={errors.titlePhoto}
        isCompressing={compressingDocument === 'title'}
        label="Foto del titulo profesional"
        onPress={() => onPickDocument('title')}
        selectedLabel="Título seleccionado"
      />
    </View>
  );
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text style={styles.label}>
      {text} <Text style={styles.required}>*</Text>
    </Text>
  );
}

function PasswordField({
  error,
  isVisible,
  onChangeText,
  onToggleVisibility,
  placeholder,
  value
}: {
  error?: string;
  isVisible: boolean;
  onChangeText: (value: string) => void;
  onToggleVisibility: () => void;
  placeholder: string;
  value: string;
}) {
  return (
    <View style={[styles.passwordWrapper, error ? styles.inputError : null]}>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A0AEC0"
        secureTextEntry={!isVisible}
        style={styles.passwordInput}
        value={value}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isVisible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
        onPress={onToggleVisibility}
        style={styles.passwordToggle}
      >
        <Text style={styles.passwordToggleText}>{isVisible ? 'Ocultar' : 'Mostrar'}</Text>
      </Pressable>
    </View>
  );
}

function DocumentPickerButton({
  document,
  error,
  isCompressing,
  label,
  onPress,
  selectedLabel
}: {
  document: SpecialistDocumentImage | null;
  error?: string;
  isCompressing: boolean;
  label: string;
  onPress: () => void;
  selectedLabel: string;
}) {
  return (
    <View>
      <FieldLabel text={label} />
      <Pressable
        disabled={isCompressing}
        style={[styles.documentButton, error ? styles.inputError : null, isCompressing ? styles.documentButtonDisabled : null]}
        onPress={onPress}
      >
        {document ? (
          <Image source={{ uri: document.uri }} style={styles.documentPreview} />
        ) : (
          <Ionicons color="#6D8D76" name="image-outline" size={24} />
        )}
        <View style={styles.documentCopy}>
          <Text style={styles.documentButtonText}>
            {isCompressing ? 'Comprimiendo imagen...' : document ? selectedLabel : 'Seleccionar imagen'}
          </Text>
          {document ? <Text style={styles.documentMeta}>{formatFileSize(document.size)}</Text> : null}
        </View>
      </Pressable>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

function validateRegister(values: {
  username: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: 'user' | 'specialist';
  specialty: SpecialistSpecialty;
  licenseNumber: string;
  dniPhoto: SpecialistDocumentImage | null;
  titlePhoto: SpecialistDocumentImage | null;
  requestOnly: boolean;
}): RegisterErrors {
  const nextErrors: RegisterErrors = {};
  const trimmedEmail = values.email.trim();

  if (values.role === 'user') {
    if (!values.username.trim()) nextErrors.username = 'El usuario es obligatorio.';
    if (!values.firstName.trim()) nextErrors.firstName = 'El nombre es obligatorio.';
    if (!values.lastName.trim()) nextErrors.lastName = 'El apellido es obligatorio.';
  }

  if (values.role === 'specialist' && !values.requestOnly && !values.fullName.trim()) {
    nextErrors.fullName = 'El nombre completo es obligatorio.';
  }

  if (!values.requestOnly) {
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
  }

  if (!values.role.trim()) {
    nextErrors.role = 'Selecciona un rol para continuar.';
  }

  if (values.role === 'specialist') {
    if (!values.specialty) nextErrors.specialty = 'Selecciona una especialidad.';
    if (!values.licenseNumber.trim()) nextErrors.licenseNumber = 'La matricula es obligatoria.';
    if (!values.dniPhoto) nextErrors.dniPhoto = 'Carga una foto del DNI.';
    if (!values.titlePhoto) nextErrors.titlePhoto = 'Carga una foto del titulo profesional.';
  }

  return nextErrors;
}

function splitFullName(value: string): { firstName: string; lastName: string } {
  const cleanName = value.trim().replace(/^dra?\.?\s+/i, '');
  const [firstName = cleanName, ...lastNameParts] = cleanName.split(/\s+/);
  return {
    firstName,
    lastName: lastNameParts.join(' ') || firstName
  };
}

function buildSpecialistUsername(fullName: string, email: string): string {
  const emailUsername = email.trim().split('@')[0];
  const nameUsername = fullName
    .trim()
    .toLowerCase()
    .replace(/^dra?\.?\s+/i, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return nameUsername ? `@${nameUsername}` : `@${emailUsername || 'especialista'}`;
}

function getRoleLabel(value: 'user' | 'specialist'): string {
  return roleOptions.find((option) => option.value === value)?.label ?? roleOptions[0].label;
}

function getSpecialtyLabel(value: SpecialistSpecialty): string {
  return specialtyOptions.find((option) => option.value === value)?.label ?? specialtyOptions[0].label;
}

function getSubmitLabel(isSubmitting: boolean, role: 'user' | 'specialist', requestOnly: boolean): string {
  if (isSubmitting) return role === 'specialist' ? 'Enviando solicitud...' : 'Creando cuenta...';
  if (role === 'specialist') return requestOnly ? 'Reenviar solicitud' : 'Enviar solicitud';
  return 'Continuar';
}

function formatFileSize(size: number | null): string {
  if (size === null) {
    return 'Imagen comprimida';
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
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
    shadowColor: '#000000',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    width: 36,
    zIndex: 2
  },
  specialistIntro: {
    alignItems: 'center',
    backgroundColor: '#EBF4EC',
    borderColor: '#DDEADD',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 14,
    marginBottom: 8,
    marginTop: 10,
    padding: 16
  },
  specialistIcon: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 26,
    height: 52,
    justifyContent: 'center',
    width: 52
  },
  specialistIntroCopy: {
    flex: 1
  },
  specialistTitle: {
    color: '#0B132B',
    fontSize: 19,
    fontWeight: '900'
  },
  specialistSubtitle: {
    color: '#6C757D',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4
  },
  retryNotice: {
    alignItems: 'flex-start',
    backgroundColor: '#EBF4EC',
    borderColor: '#C3E0C5',
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    padding: 12
  },
  retryText: {
    color: '#495057',
    flex: 1,
    fontSize: 13,
    lineHeight: 19
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
    paddingRight: 90
  },
  passwordToggle: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 12,
    position: 'absolute',
    right: 0
  },
  passwordToggleText: {
    color: '#6D8D76',
    fontSize: 13,
    fontWeight: '800'
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
  specialistSection: {
    width: '100%'
  },
  documentButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
    width: '100%'
  },
  documentButtonDisabled: {
    opacity: 0.7
  },
  documentCopy: {
    flex: 1
  },
  documentPreview: {
    borderRadius: 6,
    height: 40,
    width: 40
  },
  documentButtonText: {
    color: '#495057',
    fontSize: 15,
    fontWeight: '600'
  },
  documentMeta: {
    color: '#6C757D',
    fontSize: 12,
    marginTop: 2
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
