import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { apiConfig } from '@/services/api/client';

export default function UpdatePasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  async function handleSavePassword() {
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden.');
      return;
    }

    try {
      await fetch(`${apiConfig.baseUrl}/auth/update-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password,
        }),
      });

      router.replace('/login');
    } catch (error: any) {
      Alert.alert('Error', error.message ?? 'No pudimos actualizar tu contraseña.');
    }
  }

  return (
    <View style={styles.screen}>
      <Image
        source={{ uri: 'https://placehold.co/100x100/F0F0F0/1A202C.png?text=EOS' }}
        style={styles.logo}
      />

      <Text style={styles.title}>Restablecer Contraseña</Text>

      <View style={styles.form}>
        <Text style={styles.label}>Nueva contraseña</Text>
        <View style={styles.passwordInput}>
          <TextInput
            onChangeText={setPassword}
            placeholder="contraseña"
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

        <Text style={styles.validationText}>
          ° Mínimo 8 caracteres{'\n'}
          ° Al menos un número{'\n'}
          ° Una letra mayúscula{'\n'}
          ° Un carácter especial (ej. !@#$%^&*)
        </Text>

        <Text style={styles.label}>Confirmar contraseña</Text>
        <View style={styles.passwordInput}>
          <TextInput
            onChangeText={setConfirmPassword}
            placeholder="contraseña"
            placeholderTextColor="#A0AEC0"
            secureTextEntry={!isConfirmPasswordVisible}
            style={styles.passwordTextInput}
            value={confirmPassword}
          />
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsConfirmPasswordVisible((current) => !current)}
            style={styles.eyeButton}
          >
            <Ionicons
              color="#718096"
              name={isConfirmPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={22}
            />
          </Pressable>
        </View>
      </View>

      <Pressable onPress={handleSavePassword} style={styles.button}>
        <Text style={styles.buttonText}>Guardar Contraseña</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#F8F9FA',
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
  },
  logo: {
    alignSelf: 'center',
    height: 100,
    marginBottom: 24,
    width: 100,
  },
  title: {
    color: '#0B132B',
    fontSize: 30,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  form: {
    marginTop: 36,
    width: '100%',
  },
  label: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
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
    color: '#0B132B',
    flex: 1,
    height: '100%',
    paddingLeft: 15,
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
  validationText: {
    color: '#6C757D',
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    marginBottom: 24,
    marginTop: 10,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#C98F90',
    borderRadius: 12,
    height: 54,
    justifyContent: 'center',
    marginBottom: 40,
    marginTop: 'auto',
    width: '100%',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
