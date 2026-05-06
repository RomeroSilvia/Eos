import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiConfig } from '@/services/api/client';

const ROLE_OPTIONS = ['No, soy usuario', 'Si, soy dermatologo/a'] as const;
const AUTH_TOKEN_KEY = 'eos.auth.token';
const AUTH_REFRESH_TOKEN_KEY = 'eos.auth.refreshToken';
const AUTH_USER_KEY = 'eos.auth.user';

type RoleOption = (typeof ROLE_OPTIONS)[number];

type FieldLabelProps = {
  children: string;
};

type RegisterResponse = {
  status: 'success';
  message: string;
  data: {
    session: {
      access_token: string;
      refresh_token: string;
    };
    user: {
      id: string;
      email: string;
      username: string;
      firstName: string;
      lastName: string;
      full_name: string;
      role: string;
    };
  };
};

function FieldLabel({ children }: FieldLabelProps) {
  return (
    <Text style={styles.label}>
      {children} <Text style={styles.required}>*</Text>
    </Text>
  );
}

async function setStoredItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

function mapRole(option: RoleOption) {
  return option === 'Si, soy dermatologo/a' ? 'specialist' : 'user';
}

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<RoleOption>('No, soy usuario');
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleRoleSelect(nextRole: RoleOption) {
    setRole(nextRole);
    setIsRoleMenuOpen(false);
  }

  async function handleSubmit() {
    if (!email.trim() || !password || !username.trim() || !firstName.trim() || !lastName.trim()) {
      Alert.alert('Error', 'Completa todos los campos obligatorios.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiConfig.baseUrl}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
          username: username.trim(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role: mapRole(role),
        }),
      });

      const payload = (await response.json()) as RegisterResponse | { message?: string };

      if (!response.ok || !('data' in payload)) {
        throw new Error(payload.message ?? 'No pudimos completar el registro.');
      }

      await Promise.all([
        setStoredItem(AUTH_TOKEN_KEY, payload.data.session.access_token),
        setStoredItem(AUTH_REFRESH_TOKEN_KEY, payload.data.session.refresh_token),
        setStoredItem(AUTH_USER_KEY, JSON.stringify(payload.data.user)),
      ]);

      router.push('/start-quiz');
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'No pudimos completar el registro.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    >
      <View style={styles.avatarContainer}>
        <Ionicons color="#6F8F78" name="person-outline" size={64} />
        <Pressable style={styles.editButton}>
          <MaterialIcons color="#495057" name="edit" size={18} />
        </Pressable>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <FieldLabel>Email</FieldLabel>
          <TextInput
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="example@email.com"
            placeholderTextColor="#A0AEC0"
            style={styles.input}
            value={email}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel>Contrasena</FieldLabel>
          <TextInput
            onChangeText={setPassword}
            placeholder="********"
            placeholderTextColor="#A0AEC0"
            secureTextEntry
            style={styles.input}
            value={password}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel>Usuario</FieldLabel>
          <TextInput
            autoCapitalize="none"
            onChangeText={setUsername}
            placeholder="@example_example"
            placeholderTextColor="#A0AEC0"
            style={styles.input}
            value={username}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel>Nombre</FieldLabel>
          <TextInput
            autoCapitalize="words"
            onChangeText={setFirstName}
            placeholder="Example"
            placeholderTextColor="#A0AEC0"
            style={styles.input}
            value={firstName}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel>Apellido</FieldLabel>
          <TextInput
            autoCapitalize="words"
            onChangeText={setLastName}
            placeholder="Example"
            placeholderTextColor="#A0AEC0"
            style={styles.input}
            value={lastName}
          />
        </View>

        <View style={styles.field}>
          <FieldLabel>¿Eres Dermatologo?</FieldLabel>
          <Pressable onPress={() => setIsRoleMenuOpen((current) => !current)} style={styles.selectInput}>
            <Text style={styles.selectText}>{role}</Text>
            <Ionicons color="#495057" name="chevron-down" size={20} />
          </Pressable>

          {isRoleMenuOpen && (
            <View style={styles.roleMenu}>
              {ROLE_OPTIONS.map((option) => (
                <Pressable key={option} onPress={() => handleRoleSelect(option)} style={styles.roleOption}>
                  <Text style={styles.roleOptionText}>{option}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <Pressable
        disabled={isSubmitting}
        onPress={handleSubmit}
        style={[styles.submitButton, isSubmitting && styles.disabledButton]}
      >
        <Text style={styles.submitButtonText}>{isSubmitting ? 'Registrando...' : 'Continuar'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F9FA',
    flex: 1,
  },
  content: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#EBF4EC',
    borderColor: '#C3E0C5',
    borderRadius: 60,
    borderWidth: 2,
    height: 120,
    justifyContent: 'center',
    marginTop: 40,
    width: 120,
  },
  editButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    bottom: 0,
    elevation: 4,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    width: 36,
  },
  form: {
    marginTop: 36,
    width: '100%',
  },
  field: {
    marginBottom: 18,
    width: '100%',
  },
  label: {
    color: '#495057',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#C98F90',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1A202C',
    height: 50,
    paddingHorizontal: 14,
    width: '100%',
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
    width: '100%',
  },
  selectText: {
    color: '#1A202C',
    fontSize: 15,
  },
  roleMenu: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
    width: '100%',
  },
  roleOption: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  roleOptionText: {
    color: '#495057',
    fontSize: 15,
  },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 40,
    width: '100%',
  },
  disabledButton: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
