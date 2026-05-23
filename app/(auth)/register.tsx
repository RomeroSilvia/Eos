import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Link } from 'expo-router';
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

const roleOptions = ['No, soy usuario', 'Si, soy dermatologo/a'];

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState(roleOptions[0]);
  const [isRoleMenuOpen, setIsRoleMenuOpen] = useState(false);
  const [profileImageUri, setProfileImageUri] = useState<string | null>(null);

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
            onChangeText={setUsername}
            placeholder="@example_example"
            placeholderTextColor="#A0AEC0"
            style={styles.input}
            value={username}
          />

          <FieldLabel text="Nombre" />
          <TextInput
            onChangeText={setFirstName}
            placeholder="Example"
            placeholderTextColor="#A0AEC0"
            style={styles.input}
            value={firstName}
          />

          <FieldLabel text="Apellido" />
          <TextInput
            onChangeText={setLastName}
            placeholder="Example"
            placeholderTextColor="#A0AEC0"
            style={styles.input}
            value={lastName}
          />

          <FieldLabel text="¿Eres Dermatologo?" />
          <Pressable style={styles.selectInput} onPress={() => setIsRoleMenuOpen((current) => !current)}>
            <Text style={styles.selectText}>{role}</Text>
            <Ionicons color="#495057" name="chevron-down" size={20} />
          </Pressable>

          {isRoleMenuOpen ? (
            <View style={styles.roleMenu}>
              {roleOptions.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    setRole(option);
                    setIsRoleMenuOpen(false);
                  }}
                  style={styles.roleOption}
                >
                  <Text style={styles.roleOptionText}>{option}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <Link href="/start-diagnosis" asChild>
            <Pressable style={styles.submitButton}>
              <Text style={styles.submitButtonText}>Continuar</Text>
            </Pressable>
          </Link>
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
  avatarWrapper: {
    alignItems: 'center',
    alignSelf: 'center',
    height: 132,
    justifyContent: 'center',
    marginBottom: 22,
    marginTop: 40,
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
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold'
  }
});
