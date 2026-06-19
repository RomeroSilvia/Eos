import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/colors';

export function SpecialistPlaceholderScreen({ moduleName, title }: { moduleName: string; title: string }) {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons color={colors.primaryDark} name="construct-outline" size={30} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>Esta seccion se implementara en el {moduleName}.</Text>
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
    gap: 14,
    justifyContent: 'center',
    padding: 24
  },
  iconCircle: {
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60
  },
  title: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: '900'
  },
  description: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 23,
    textAlign: 'center'
  }
});
