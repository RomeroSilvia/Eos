import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "@/constants/colors";
import type { ProgressHistoryItem } from "@/types/progress";

type ProgressHistoryPreviewProps = {
  items: ProgressHistoryItem[];
  onPressViewAll?: () => void;
};

const historyStatusStyle: Record<
  ProgressHistoryItem["status"],
  {
    label: string;
    backgroundColor: string;
    borderColor: string;
    color: string;
    icon: keyof typeof Ionicons.glyphMap;
  }
> = {
  completed: {
    label: "Completado",
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.surface,
    icon: "checkmark",
  },
  partial: {
    label: "Parcial",
    backgroundColor: colors.primaryLight,
    borderColor: colors.primaryLight,
    color: colors.primaryDark,
    icon: "remove",
  },
  pending: {
    label: "Pendiente",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    color: colors.textMuted,
    icon: "time-outline",
  },
  empty: {
    label: "Vacio",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    color: colors.textMuted,
    icon: "time-outline",
  },
};

export function ProgressHistoryPreview({
  items,
  onPressViewAll,
}: ProgressHistoryPreviewProps) {
  if (items.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Historial</Text>
        <Text style={styles.empty}>Todavía no hay registros de progreso.</Text>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Historial</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onPressViewAll}
          style={styles.linkButton}
        >
          <Text style={styles.linkText}>Ver todo</Text>
        </Pressable>
      </View>

      {items.map((item) => {
        const variant = historyStatusStyle[item.status];

        return (
          <View key={item.id} style={styles.item}>
            <View
              style={[
                styles.itemIcon,
                {
                  backgroundColor: variant.backgroundColor,
                  borderColor: variant.borderColor,
                },
              ]}
            >
              <Ionicons color={variant.color} name={variant.icon} size={18} />
            </View>

            <View style={styles.itemContent}>
              <Text style={styles.itemTitle}>{item.routineName}</Text>
              <Text style={styles.itemMeta}>
                {item.date} · {item.completedSteps}/{item.totalSteps} pasos
              </Text>
            </View>

            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: variant.backgroundColor,
                  borderColor: variant.borderColor,
                },
              ]}
            >
              <Text style={[styles.statusText, { color: variant.color }]}>
                {variant.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  title: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "900",
  },
  linkButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  linkText: {
    color: colors.secondary,
    fontSize: 13,
    fontWeight: "900",
  },
  empty: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  item: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  itemIcon: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },

  itemContent: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "800",
  },
  itemMeta: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  statusBadge: {
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 999,
  borderWidth: 1,
  minHeight: 24,
  paddingHorizontal: 8,
  paddingVertical: 2,
},

statusText: {
  fontSize: 11,
  fontWeight: "500",
  lineHeight: 14,
  textAlign: "center",
},
});
