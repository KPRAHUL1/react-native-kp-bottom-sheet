import type { ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSheetTheme } from '../portal';
import { Sheet } from '../sheet';

export type ActionSheetItem = {
  key: string;
  label: string;
  /**
   * Rendered inside the tinted tile. Any node — an icon from whichever icon
   * library the app already uses. Deliberately not a name from a fixed icon
   * set, so this package pulls in no icon dependency of its own.
   */
  icon?: ReactNode;
  /** Tints the tile and the label red, so a destructive row reads as one. */
  danger?: boolean;
  onPress: () => void;
};

export type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  items: ActionSheetItem[];
  /**
   * What is being acted on — "Home", a card's last four digits, an address.
   *
   * Worth passing wherever the sheet is opened from a list. "Delete Address"
   * on its own does not say *which* address, and this sheet is usually reached
   * by tapping a small menu button on one row among several.
   */
  title?: string;
  /** A second line under the title — the address itself, say. */
  subtitle?: string;
};

/**
 * A small options menu in a sheet — "Edit" / "Delete" for a list row.
 * The slide-up, drag-to-dismiss and backdrop all come from `Sheet`; this is
 * just the rows.
 *
 * Each action is a tinted icon tile plus a label on its own rounded row. The
 * tile is what separates the actions from each other: hairline dividers did
 * the same job in an earlier version, but they made a two-item menu read as a
 * table of settings rather than a short list of things you can do, and gave a
 * destructive action exactly the same weight as a benign one.
 */
export function ActionSheet({ visible, onClose, items, title, subtitle }: ActionSheetProps) {
  const theme = useSheetTheme();

  return (
    <Sheet visible={visible} onClose={onClose} style={styles.sheet}>
      {title ? (
        <View style={[styles.head, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: theme.textSecondary }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      ) : null}

      {items.map((item) => (
        <Pressable
          key={item.key}
          accessibilityRole="button"
          onPress={() => {
            onClose();
            item.onPress();
          }}
          style={({ pressed }) => [
            styles.row,
            // A wash rather than an opacity dip: the sheet is light, and fading
            // a light row against a light sheet shows nothing.
            pressed && { backgroundColor: item.danger ? theme.dangerTint : theme.primaryTint },
          ]}
        >
          {item.icon ? (
            <View
              style={[
                styles.iconTile,
                { backgroundColor: item.danger ? theme.dangerTint : theme.primaryTint },
              ]}
            >
              {item.icon}
            </View>
          ) : null}
          <Text
            style={[styles.rowText, { color: item.danger ? theme.danger : theme.textPrimary }]}
          >
            {item.label}
          </Text>
        </Pressable>
      ))}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 12 },
  head: { paddingHorizontal: 8, paddingBottom: 12, marginBottom: 4, borderBottomWidth: 1, gap: 2 },
  title: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
  subtitle: { fontSize: 12.5, lineHeight: 17 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    // Padding rather than a fixed height, so the row grows with the label at a
    // large system font instead of clipping it.
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    ...Platform.select({ web: { cursor: 'pointer' as const }, default: {} }),
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, fontSize: 15, fontWeight: '700' },
});
