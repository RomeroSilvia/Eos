import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { Stepper } from '@/components/Stepper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function Step5Products() {
    const router = useRouter();
    const { routineId } = useLocalSearchParams();
    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>

                <Text style={styles.title}>Nueva Rutina</Text>

                <View style={{ alignItems: 'center' }}>
                    <Stepper current={4} />
                </View>

                <Text style={styles.section}>Productos</Text>

                <Text style={styles.question}>
                    Agregar productos (opcional)
                </Text>

                <View style={styles.notice}>
                    <MaterialCommunityIcons name="information-outline" size={18} color={colors.primaryDark} />
                    <Text style={styles.noticeText}>
                        Agrega los productos que uses en cada paso.{"\n"}
                        Puedes hacerlo ahora o más tarde desde los detalles de la rutina.
                    </Text>
                </View>

                <ScrollView contentContainerStyle={styles.list}>

                    <Text style={styles.groupTitle}>Limpieza</Text>

                    <View style={styles.stepCard}>
                        <View style={styles.stepRow}>
                            <Text style={styles.stepTitle}>1 Primer paso</Text>
                            <MaterialCommunityIcons name="dots-vertical" size={18} color={colors.textSecondary} />
                        </View>

                        <Pressable style={styles.addProduct}>
                            <Text style={styles.addProductText}>+ Añadir producto</Text>
                        </Pressable>
                    </View>

                    <View style={styles.stepCard}>
                        <View style={styles.stepRow}>
                            <Text style={styles.stepTitle}>2 Segundo paso</Text>
                            <MaterialCommunityIcons name="dots-vertical" size={18} color={colors.textSecondary} />
                        </View>

                        <Pressable style={styles.addProduct}>
                            <Text style={styles.addProductText}>+ Añadir producto</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.groupTitle}>Hidratación</Text>

                    <Pressable style={styles.emptyAdd}>
                        <Text style={styles.addProductText}>+ Añadir producto</Text>
                    </Pressable>

                    <Text style={styles.groupTitle}>Protección solar</Text>

                    <Pressable style={styles.emptyAdd}>
                        <Text style={styles.addProductText}>+ Añadir producto</Text>
                    </Pressable>

                </ScrollView>

                <Pressable
                    style={styles.button}
                    onPress={() =>
                        router.push({
                            pathname: '/routine/Step6-confirm',
                            params: { routineId }
                        })
                    }
                >
                    <Text style={styles.buttonText}>Continuar</Text>
                </Pressable>

            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: colors.background
    },
    container: {
        flex: 1,
        padding: 20
    },

    title: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textPrimary
    },

    section: {
        marginTop: 12,
        fontSize: 13,
        color: colors.textSecondary
    },

    question: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 4
    },

    notice: {
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        borderRadius: 10,
        backgroundColor: colors.surfaceSoft,
        marginTop: 10
    },

    noticeText: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary
    },

    list: {
        marginTop: 16,
        gap: 16,
        paddingBottom: 120
    },

    groupTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary
    },

    stepCard: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden'
    },

    stepRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 14
    },

    stepTitle: {
        fontWeight: '600',
        color: colors.textPrimary
    },

    addProduct: {
        borderTopWidth: 1,
        borderColor: colors.border,
        padding: 12,
        alignItems: 'center'
    },

    emptyAdd: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 12,
        padding: 14,
        alignItems: 'center'
    },

    addProductText: {
        color: colors.primaryDark,
        fontWeight: '600'
    },

    button: {
        position: 'absolute',
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: colors.secondary,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center'
    },

    buttonText: {
        color: colors.surface,
        fontWeight: '700'
    }
});
