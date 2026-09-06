import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSheetTheme } from '../portal';
import { Sheet } from '../sheet';

export type ConfirmSheetProps = {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Visual tone of the confirm button and the icon halo. Defaults to primary. */
  tone?: 'primary' | 'danger';
  /** Optional icon shown in the coloured circle at the top. */
  icon?: ReactNode;
  onCancel: () => void;
  /**
   * The action. While the returned promise is pending the confirm button shows
   * a spinner and the sheet refuses to close — see below.
   */
  onConfirm: () => Promise<void> | void;
};

/**
 * A confirmation dialog as a sheet, for destructive or important actions where
 * the platform's native alert feels off-brand.
 *
 * The one non-obvious behaviour: while `onConfirm` is in flight the sheet
 * becomes non-dismissible. Letting the user drag it away mid-request would
 * leave the caller holding a promise whose result has nowhere to go, and a
 * loading state nothing will ever clear.
 */
export function ConfirmSheet({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  tone = 'primary',
  icon,
  onCancel,
  onConfirm,
}: ConfirmSheetProps) {
  const theme = useSheetTheme();
  const [loading, setLoading] = useState(false);

  const accent = tone === 'danger' ? theme.danger : theme.primary;
  const halo = tone === 'danger' ? theme.dangerTint : theme.primaryTint;

  const dismiss = () => {
    if (loading) return;
    onCancel();
  };

  const handleConfirm = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet visible={visible} onClose={dismiss} style={styles.sheet} dismissible={!loading}>
      <View style={styles.body}>
        {icon ? <View style={[styles.halo, { backgroundColor: halo }]}>{icon}</View> : null}

        <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
        {description ? (
          <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
        ) : null}

        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={handleConfirm}
            disabled={loading}
            style={[styles.confirmBtn, { backgroundColor: loading ? theme.border : accent }]}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            )}
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={dismiss}
            disabled={loading}
            style={[styles.cancelBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
          >
            <Text style={[styles.cancelText, { color: theme.textSecondary }]}>{cancelLabel}</Text>
          </Pressable>
        </View>
      </View>
    </Sheet>
  );
}

const pressable = Platform.select({ web: { cursor: 'pointer' as const }, default: {} });

const styles = StyleSheet.create({
  sheet: { paddingHorizontal: 24 },
  body: { alignItems: 'center', gap: 20, paddingBottom: 8 },
  halo: { width: 72, height: 72, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    paddingHorizontal: 8,
    // Pulls the description up under the title, against the 20px body gap.
    marginTop: -8,
  },
  actions: { width: '100%', gap: 12 },
  confirmBtn: {
    minHeight: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    ...pressable,
  },
  confirmText: { fontSize: 17, fontWeight: '800', color: '#FFFFFF' },
  cancelBtn: {
    minHeight: 52,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
    ...pressable,
  },
  cancelText: { fontSize: 17, fontWeight: '800' },
});
