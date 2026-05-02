import { View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';
import { Stepper } from '@/components/Stepper';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const goals = [
    { id: 1, label: 'Hidratación', icon: 'water-outline' },
    { id: 2, label: 'Piel más luminosa', icon: 'sparkles' },
    { id: 3, label: 'Control de acne', icon: 'target' },
    { id: 4, label: 'Calmar y reducir rojeces', icon: 'leaf' },
    { id: 5, label: 'Anti-edad', icon: 'emoticon-happy-outline' }
];

export default function Step2() {
    const router = useRouter();
    const [name, setName] = useState('');
    const [selected, setSelected] = useState<number | null>(null);

    const isValid = name.trim() !== '' && selected !== null;

    return (
        <SafeAreaView style={styles.screen}>
            <View style={styles.container}>

                <Text style={styles.title}>Nueva Rutina</Text>

                <View style={{ alignItems: 'center' }}>
                    <Stepper current={2} />
                </View>

                <Text style={styles.section}>Información Básica</Text>

                {/* Nombre */}
                <Text style={styles.label}>Nombre de la rutina</Text>
                <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Ej. Rutina piel sensible"
                    style={styles.input}
                />

                {/* Objetivo */}
                <Text style={styles.label}>Objetivo principal</Text>
                <Text style={styles.sub}>
                    Selecciona el objetivo que quieres lograr con esta rutina
                </Text>

                <View style={styles.list}>
                    {goals.map((goal) => (
                        <Pressable
                            key={goal.id}
                            onPress={() => setSelected(goal.id)}
                            style={[
                                styles.item,
                                selected === goal.id && styles.itemActive
                            ]}
                        >
                            <View style={styles.itemLeft}>
                                <View style={styles.icon}>
                                    <MaterialCommunityIcons
                                        name={goal.icon}
                                        size={20}
                                        color={colors.primaryDark}
                                    />
                                </View>

                                <Text style={styles.itemText}>{goal.label}</Text>
                            </View>

                            <View style={[
                                styles.radio,
                                selected === goal.id && styles.radioActive
                            ]} />
                        </Pressable>
                    ))}
                </View>

                <Pressable
                    disabled={!isValid}
                    onPress={() => router.push('/routine/Step3')}
                    style={[
                        styles.button,
                        !isValid && styles.disabled
                    ]}
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
        marginTop: 16,
        marginBottom: 10,
        color: colors.textSecondary,
        fontSize: 13
    },

    label: {
        marginTop: 10,
        fontWeight: '600',
        color: colors.textPrimary
    },

    sub: {
        color: colors.textSecondary,
        fontSize: 12,
        marginBottom: 10
    },

    input: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        padding: 12,
        borderWidth: 1,
        borderColor: colors.border,
        marginTop: 6
    },

    list: {
        marginTop: 8,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: colors.surface
    },

    item: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 14,
        borderBottomWidth: 1,
        borderColor: colors.border
    },

    itemActive: {
        backgroundColor: colors.primaryLight
    },

    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },

    icon: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: colors.primaryLight,
        alignItems: 'center',
        justifyContent: 'center'
    },

    itemText: {
        color: colors.textPrimary,
        fontSize: 14
    },

    radio: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 1,
        borderColor: colors.border
    },

    radioActive: {
        borderColor: colors.primaryDark,
        backgroundColor: colors.primaryDark
    },

    button: {
        marginTop: 'auto',
        backgroundColor: colors.secondary,
        padding: 14,
        borderRadius: 10,
        alignItems: 'center'
    },

    disabled: {
        opacity: 0.5
    },

    buttonText: {
        color: colors.surface,
        fontWeight: '700'
    }
});