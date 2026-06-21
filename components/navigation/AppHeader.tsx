import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { BellButton } from '@/components/BellButton';
import { colors } from '@/constants/colors';
import { useProfile } from '@/hooks/useProfile';

type AppHeaderProps = {
  title: string;
  breadcrumb?: string;
  showBack?: boolean;
  showNotifications?: boolean;
  fallbackRoute?: Href;
  rightAction?: ReactNode;
  style?: ViewStyle;
};

export function AppHeader({
  title,
  breadcrumb,
  showBack = true,
  showNotifications = true,
  fallbackRoute,
  rightAction,
  style
}: AppHeaderProps) {
  const router = useRouter();
  const { profile } = useProfile();

  function goBack() {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    router.replace(fallbackRoute ?? getFallbackRoute(profile?.role));
  }

  const resolvedRightAction = rightAction ?? (showNotifications ? <BellButton style={styles.bellButton} /> : null);

  return (
    <View style={[styles.header, style]}>
      {showBack ? (
        <Pressable accessibilityLabel="Volver" accessibilityRole="button" onPress={goBack} style={styles.backButton}>
          <Ionicons color={colors.primaryDark} name="chevron-back" size={22} />
        </Pressable>
      ) : (
        <View style={styles.sideSpacer} />
      )}

      <View style={styles.titleBlock}>
        {breadcrumb ? <Text numberOfLines={1} style={styles.breadcrumb}>{breadcrumb}</Text> : null}
        <Text numberOfLines={2} style={styles.title}>{title}</Text>
      </View>

      <View style={styles.rightSlot}>{resolvedRightAction}</View>
    </View>
  );
}

function getFallbackRoute(role?: string | null): Href {
  if (role === 'specialist') {
    return '/(tabs-specialist)' as Href;
  }

  if (role === 'center_admin') {
    return '/(tabs-admin)' as Href;
  }

  return '/(tabs)/home' as Href;
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingTop: 8
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  sideSpacer: {
    width: 40
  },
  titleBlock: {
    flex: 1,
    minWidth: 0
  },
  breadcrumb: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 1
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 24
  },
  rightSlot: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40
  },
  bellButton: {
    alignItems: 'center',
    height: 40,
    justifyContent: 'center',
    width: 40
  }
});
