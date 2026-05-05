import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

const ROLE_OPTIONS = ['No, soy usuario', 'Si, soy dermatologo/a'] as const;

type RoleOption = (typeof ROLE_OPTIONS)[number];

type FieldLabelProps = {
  children: string;
};

function FieldLabel({ children }: FieldLabelProps) {
  return (
    <Text style={styles.label}>
      {children} <Text style={styles.required}>*</Text>
    </Text>
  );
}

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<RoleOption>('No, soy usuario');
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);

  function handleRoleSelect(nextRole: RoleOption) {
    setRole(nextRole);
    setIsRoleMenuOpen(false);
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

      <Pressable onPress={() => router.push('/start-quiz')} style={styles.submitButton}>
        <Text style={styles.submitButtonText}>Continuar</Text>
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
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
