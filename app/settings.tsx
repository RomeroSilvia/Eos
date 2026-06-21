import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppHeader } from '@/components/navigation/AppHeader';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';
import { changePassword } from '@/services/auth';
import { areNotificationsEnabled, setNotificationsEnabled } from '@/services/notifications';
import { updateProfile } from '@/services/profile';
import { getFriendlyErrorMessage } from '@/services/api/client';

export default function SettingsScreen() {
  const router = useRouter();
  const { isLoading, profile } = useProfile();
  const [fullName, setFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notificationsEnabled, setNotificationsEnabledState] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isSavingNotifications, setIsSavingNotifications] = useState(false);

  const isSpecialist = profile?.role === 'specialist';
  const isUser = profile?.role === 'user';

  useEffect(() => {
    setFullName(profile?.name ?? '');
  }, [profile?.name]);

  useEffect(() => {
    let active = true;

    void areNotificationsEnabled()
      .then((enabled) => {
        if (active) setNotificationsEnabledState(enabled);
      })
      .catch(() => {
        if (active) setNotificationsEnabledState(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handleSaveProfile() {
    if (!fullName.trim()) {
      Alert.alert('Configuracion', 'El nombre es obligatorio.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updatedProfile = await updateProfile({ fullName });
      setFullName(updatedProfile.name);
      Alert.alert('Configuracion', 'Perfil actualizado.');
    } catch (error) {
      Alert.alert('Configuracion', getFriendlyErrorMessage(error, 'No pudimos actualizar tu perfil.'));
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (newPassword.length < 6) {
      Alert.alert('Configuracion', 'La contrasena debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Configuracion', 'Las contrasenas no coinciden.');
      return;
    }

    setIsSavingPassword(true);
    try {
      await changePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Configuracion', 'Contrasena actualizada.');
    } catch (error) {
      Alert.alert('Configuracion', getFriendlyErrorMessage(error, 'No pudimos cambiar la contrasena.'));
    } finally {
      setIsSavingPassword(false);
    }
  }

  async function handleToggleNotifications(nextValue: boolean) {
    setIsSavingNotifications(true);
    try {
      const enabled = await setNotificationsEnabled(nextValue);
      setNotificationsEnabledState(enabled);

      if (nextValue && !enabled) {
        Alert.alert('Notificaciones', 'No pudimos activar las notificaciones porque el permiso fue denegado.');
      } else {
        Alert.alert('Notificaciones', enabled ? 'Notificaciones activadas.' : 'Notificaciones desactivadas.');
      }
    } catch (error) {
      setNotificationsEnabledState(!nextValue);
      Alert.alert('Notificaciones', getFriendlyErrorMessage(error, 'No pudimos actualizar las notificaciones.'));
    } finally {
      setIsSavingNotifications(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb="Perfil" title="Configuracion" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconWrap}>
              <Ionicons color={colors.primaryDark} name="person-outline" size={20} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Perfil</Text>
              <Text style={styles.sectionText}>
                {isSpecialist
                  ? 'Tus datos profesionales se gestionan desde la verificacion.'
                  : 'Actualiza los datos visibles de tu cuenta.'}
              </Text>
            </View>
          </View>

          {isSpecialist ? (
            <View style={styles.readOnlyBox}>
              <Text style={styles.readOnlyName}>{profile?.name ?? 'Especialista'}</Text>
              <Text style={styles.readOnlyText}>Nombre, apellido y matricula no se pueden editar desde aca.</Text>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Nombre y apellido</Text>
              <TextInput
                editable={!isLoading && !isSavingProfile}
                onChangeText={setFullName}
                placeholder="Nombre y apellido"
                style={styles.input}
                value={fullName}
              />
              <Button disabled={isSavingProfile || isLoading} onPress={handleSaveProfile} style={styles.button}>
                {isSavingProfile ? 'Guardando...' : 'Guardar perfil'}
              </Button>
            </>
          )}
        </Card>

        <Card style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconWrap}>
              <Ionicons color={colors.primaryDark} name="lock-closed-outline" size={20} />
            </View>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Contrasena</Text>
              <Text style={styles.sectionText}>Cambia tu contrasena de acceso.</Text>
            </View>
          </View>

          <Text style={styles.label}>Nueva contrasena</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setNewPassword}
            placeholder="Minimo 6 caracteres"
            secureTextEntry
            style={styles.input}
            value={newPassword}
          />
          <Text style={styles.label}>Confirmar contrasena</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setConfirmPassword}
            placeholder="Repeti la contrasena"
            secureTextEntry
            style={styles.input}
            value={confirmPassword}
          />
          <Button disabled={isSavingPassword} onPress={handleChangePassword} style={styles.button}>
            {isSavingPassword ? 'Actualizando...' : 'Cambiar contrasena'}
          </Button>
        </Card>

        <Card style={styles.card}>
          <View style={styles.notificationRow}>
            <View style={styles.sectionHeaderCompact}>
              <View style={styles.iconWrap}>
                <Ionicons color={colors.primaryDark} name="notifications-outline" size={20} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Notificaciones</Text>
                <Text style={styles.sectionText}>Recibi avisos de rutinas y consultas.</Text>
              </View>
            </View>
            <Switch
              disabled={isSavingNotifications}
              onValueChange={handleToggleNotifications}
              thumbColor={notificationsEnabled ? colors.primaryDark : colors.surface}
              trackColor={{ false: colors.border, true: colors.primaryLight }}
              value={notificationsEnabled}
            />
          </View>
        </Card>

        {isUser ? (
          <Card style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconWrap}>
                <Ionicons color={colors.primaryDark} name="sparkles-outline" size={20} />
              </View>
              <View style={styles.sectionCopy}>
                <Text style={styles.sectionTitle}>Test de piel</Text>
                <Text style={styles.sectionText}>Volver a responderlo actualiza tu perfil de piel.</Text>
              </View>
            </View>
            <Button onPress={() => router.push('/quiz')} style={styles.button} variant="ghost">
              Volver a tomar test de piel
            </Button>
          </Card>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    gap: 14,
    padding: 20,
    paddingBottom: 40
  },
  card: {
    gap: 12
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12
  },
  sectionHeaderCompact: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 12
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  sectionCopy: {
    flex: 1,
    gap: 2
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '900'
  },
  sectionText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  label: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '800'
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    minHeight: 46,
    paddingHorizontal: 12
  },
  button: {
    width: '100%'
  },
  readOnlyBox: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    gap: 4,
    padding: 12
  },
  readOnlyName: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '900'
  },
  readOnlyText: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18
  },
  notificationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between'
  }
});
