import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { AppHeader } from '@/components/navigation/AppHeader';
import { colors } from '@/constants/colors';

export default function ProductResultScreen() {
  const { status, mode, returnTo } = useLocalSearchParams<{ status: 'success' | 'error'; mode?: 'create' | 'edit'; returnTo?: string }>();
  const isSuccess = status === 'success';
  const isEdit = mode === 'edit';
  const fromAddStep = returnTo === 'add-step';
  const fromSpecialistProducts = returnTo === 'specialist-products';
  const productsRoute = fromSpecialistProducts ? '/products' : '/(tabs)/products';

  return (
    <SafeAreaView style={styles.screen}>
      <AppHeader breadcrumb="Productos" title={isSuccess ? 'Resultado' : 'Error'} />
      <View style={styles.content}>
        <View style={[styles.iconRing, isSuccess ? styles.ringSuccess : styles.ringError]}>
          <View style={[styles.iconCircle, isSuccess ? styles.circleSuccess : styles.circleError]}>
            <Text style={styles.icon}>{isSuccess ? '✓' : '!'}</Text>
          </View>
        </View>

        <Text style={styles.title}>
          {isSuccess
            ? isEdit ? '¡Producto editado\ncon éxito!' : '¡Producto creado\ncon éxito!'
            : isEdit ? 'Error al editar el\nproducto' : 'Error al crear el\nproducto'}
        </Text>

        <Text style={styles.description}>
          {isSuccess
            ? isEdit
              ? 'Los cambios han sido guardados con éxito'
              : 'El nuevo producto ha sido añadido con éxito, ya podés asociarlo a tu rutina'
            : isEdit
              ? 'Ocurrió un error al guardar los cambios. Intentalo de nuevo.'
              : 'Ocurrió un error al crear el producto. Intentalo de nuevo.'}
        </Text>
      </View>

      <View style={styles.footer}>
        <Button
          onPress={() => fromAddStep ? router.back() : router.replace(productsRoute as never)}
          style={{ ...styles.button, ...(isSuccess ? styles.buttonSuccess : styles.buttonError) }}
        >
          {fromAddStep ? 'Volver al paso' : 'Ver mis productos'}
        </Button>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    alignItems: 'center',
    flex: 1,
    gap: 20,
    justifyContent: 'center',
    paddingHorizontal: 32
  },
  iconRing: {
    alignItems: 'center',
    borderRadius: 999,
    height: 200,
    justifyContent: 'center',
    width: 200
  },
  ringSuccess: {
    backgroundColor: colors.surfaceSoft
  },
  ringError: {
    backgroundColor: '#F5D0CE'
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 999,
    height: 130,
    justifyContent: 'center',
    width: 130
  },
  circleSuccess: {
    backgroundColor: colors.primary
  },
  circleError: {
    backgroundColor: '#BA2A06'
  },
  icon: {
    color: colors.surface,
    fontSize: 56,
    fontWeight: '900'
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center'
  },
  description: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center'
  },
  footer: {
    padding: 20,
    paddingBottom: 32
  },
  button: {
    borderRadius: 16,
    paddingVertical: 16
  },
  buttonSuccess: {
    backgroundColor: colors.secondary
  },
  buttonError: {
    backgroundColor: colors.secondary
  }
});
