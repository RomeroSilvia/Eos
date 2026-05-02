import { View, Text, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { Stepper } from '@/components/Stepper';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export default function Step3() {
    const router = useRouter();
    const [type, setType] = useState<'mañana' | 'noche'>('mañana');
    const [reminder, setReminder] = useState(false);

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>
                <Text style={styles.title}>Nueva Rutina</Text>

                <View style={{ alignItems: 'center' }}>
                    <Stepper current={3} />
                </View>

                <Text style={styles.section}>Tipo de rutina</Text>

                <Text style={styles.question} numberOfLines={0 }>
                    ¿Cuándo quieres usar esta rutina?
                </Text>

                <Pressable
                    onPress={() => setType('mañana')}
                    style={[styles.card, type === 'mañana' && styles.cardActive]}
                >
                    <View style={styles.cardLeft}>
                        <View
                            style={[
                                styles.icon,
                                type === 'mañana' ? styles.iconActive : styles.iconInactive
                            ]}
                            >
                            <MaterialCommunityIcons name="weather-sunset-up" size={26} color={colors.surface} />
                        </View>

                        <View style={styles.textContainer}>
                            <Text style={styles.cardTitle}>Rutina matutina</Text>
                            <Text style={styles.cardDesc} numberOfLines={0}>
                                Para proteger y preparar tu piel durante el día
                            </Text>
                        </View>
                    </View>

                    {type === 'mañana' && (
                        <View style={styles.checkAbsolute}>
                            <MaterialCommunityIcons name="check" size={16} color={colors.surface} />
                        </View>
                    )}
                </Pressable>

                <Pressable
                    onPress={() => setType('noche')}
                    style={[styles.card, type === 'noche' && styles.cardActive]}
                >
                    <View style={styles.cardLeft}>
                        <View
                            style={[
                                styles.icon,
                                type === 'noche' ? styles.iconActive : styles.iconInactive
                            ]}
                            >
                            <MaterialCommunityIcons name="weather-night" size={26} color={colors.surface} />
                        </View>

                        <View style={styles.textContainer}>
                            <Text style={styles.cardTitle}>Rutina nocturna</Text>
                            <Text style={styles.cardDesc} numberOfLines={0}>
                                Para reparar y renovar tu piel durante la noche
                            </Text>
                        </View>
                    </View>

                    {type === 'noche' && (
                        <View style={styles.checkAbsolute}>
                            <MaterialCommunityIcons name="check" size={16} color={colors.surface} />
                        </View>
                    )}
                </Pressable>

                <Text style={styles.question}>¿Quieres añadir recordatorio?</Text>

                <View style={styles.notice}>
                    <MaterialCommunityIcons name="bell-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.noticeText} numberOfLines={0}>
                        Activa notificaciones para no olvidarte de tu rutina. Podras cambiarlas cuando quieras
                    </Text>
                </View>

                <Pressable
                    onPress={() => setReminder(!reminder)}
                    style={styles.reminderRow}
                >
                    <View style={[styles.radio, reminder && styles.radioActive]} />
                    <Text>Agregar recordatorio</Text>
                </Pressable>

                <Pressable style={styles.button} onPress={() => router.push('/routine/Step4')}>
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
        padding: 20,
        gap: 16
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        color: colors.textPrimary
    },
    section: {
        marginTop: 12,
        color: colors.textSecondary,
        fontSize: 13
    },
    question: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary
    },
    card: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        position: 'relative'
    },
    cardActive: {
        borderColor: colors.primaryDark
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
        minWidth: 0
    },
    textContainer: {
        flex: 1,
        minWidth: 0
    },
    icon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: colors.primaryDark,
        alignItems: 'center',
        justifyContent: 'center'
    },
    iconGray: {
        backgroundColor: colors.textMuted
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.textPrimary,
        flexShrink: 1
    },
    cardDesc: {
        color: colors.textSecondary,
        fontSize: 13,
        flexShrink: 1,
        flexWrap: 'wrap',
        includeFontPadding: false,
        maxWidth: '90%'
    },
  checkAbsolute: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primaryDark,
        alignItems: 'center',
        justifyContent: 'center'
    },
    radio: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.border
    },
    radioActive: {
        backgroundColor: colors.primaryDark,
        borderColor: colors.primaryDark
    },
    notice: {
        flexDirection: 'row',
        gap: 10,
        padding: 12,
        borderRadius: 10,
        backgroundColor: colors.surfaceSoft
    },
    noticeText: {
        flex: 1,
        fontSize: 12,
        color: colors.textSecondary
    },
    reminderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    button: {
        marginTop: 'auto',
        backgroundColor: colors.secondary,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center'
    },
    buttonText: {
        color: colors.surface,
        fontWeight: '700'
    },

    iconActive: {
    backgroundColor: colors.secondaryLight
    },

    iconInactive: {
    backgroundColor: colors.textMuted
    }
});