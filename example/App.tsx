import { useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import {
  ActionSheet,
  ConfirmSheet,
  Sheet,
  SheetProvider,
} from 'react-native-kp-bottom-sheet';

const LIST = Array.from({ length: 40 }, (_, i) => ({ id: String(i), label: `Row ${i + 1}` }));

type Which =
  | null
  | 'basic'
  | 'list'
  | 'fixed'
  | 'pinned'
  | 'noHandle'
  | 'action'
  | 'confirm';

function Demo() {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState<Which>(null);
  const [lastAction, setLastAction] = useState('—');
  const close = () => setOpen(null);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 24 }]}>
        <Text style={styles.h1}>Bottom sheet</Text>
        <Text style={styles.sub}>Last action: {lastAction}</Text>

        <Section title="1 · Basic">
          <Row label="Content-sized sheet" onPress={() => setOpen('basic')} />
          <Hint>
            Drag it down and let go before the halfway point — it should spring back. Past 120px, or
            a fast flick, dismisses. Tap the backdrop and it should slide away, not vanish.
          </Hint>
        </Section>

        <Section title="2 · Scrollable content">
          <Row label="FlatList + dragHandleOnly" onPress={() => setOpen('list')} />
          <Hint>
            Scroll the list up and down freely. Only the grey pill at the top should drag the sheet.
          </Hint>
        </Section>

        <Section title="3 · Sizing">
          <Row label="Fixed height (50%)" onPress={() => setOpen('fixed')} />
          <Row label="No handle" onPress={() => setOpen('noHandle')} />
        </Section>

        <Section title="4 · Pinned">
          <Row label="dismissible = false" onPress={() => setOpen('pinned')} />
          <Hint>
            Backdrop tap, drag and Android back should all do nothing. The button inside is the only
            way out.
          </Hint>
        </Section>

        <Section title="5 · Presets">
          <Row label="ActionSheet" onPress={() => setOpen('action')} />
          <Row label="ConfirmSheet (async)" onPress={() => setOpen('confirm')} />
          <Hint>
            Confirm runs for 1.5s. While the spinner shows, the sheet should refuse to close.
          </Hint>
        </Section>

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Not a real tab bar — just something opaque pinned to the bottom of the
          screen. If the portal is doing its job, every sheet paints over it. */}
      <View style={[styles.fakeTabBar, { paddingBottom: insets.bottom + 10 }]}>
        <Text style={styles.tabText}>Home</Text>
        <Text style={styles.tabText}>Search</Text>
        <Text style={styles.tabText}>Profile</Text>
      </View>

      <Sheet visible={open === 'basic'} onClose={close} style={styles.pad}>
        <Text style={styles.sheetTitle}>Basic sheet</Text>
        <Text style={styles.sheetBody}>
          Sized to its own content. No height given, so it is exactly as tall as this text plus the
          button below.
        </Text>
        <Row label="Close" onPress={close} />
      </Sheet>

      <Sheet visible={open === 'list'} onClose={close} height="70%" dragHandleOnly>
        <Text style={[styles.sheetTitle, styles.pad]}>40 rows</Text>
        <FlatList
          data={LIST}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.listRow}>
              <Text style={styles.listText}>{item.label}</Text>
            </View>
          )}
        />
      </Sheet>

      <Sheet visible={open === 'fixed'} onClose={close} height="50%" style={styles.pad}>
        <Text style={styles.sheetTitle}>Fixed 50%</Text>
        <Text style={styles.sheetBody}>Always half the window, whatever is inside.</Text>
      </Sheet>

      <Sheet visible={open === 'noHandle'} onClose={close} showHandle={false} style={styles.pad}>
        <Text style={styles.sheetTitle}>No handle</Text>
        <Text style={styles.sheetBody}>
          The pill is gone, but the whole surface still drags — showHandle only hides the pill.
        </Text>
        <Row label="Close" onPress={close} />
      </Sheet>

      <Sheet visible={open === 'pinned'} onClose={close} dismissible={false} style={styles.pad}>
        <Text style={styles.sheetTitle}>Pinned open</Text>
        <Text style={styles.sheetBody}>
          Try the backdrop, a drag, and the Android back button. None of them should close this.
        </Text>
        <Row label="Let me out" onPress={close} />
      </Sheet>

      <ActionSheet
        visible={open === 'action'}
        onClose={close}
        title="Home"
        subtitle="221B Baker Street, London"
        items={[
          {
            key: 'edit',
            label: 'Edit address',
            icon: <Text style={styles.emoji}>✏️</Text>,
            onPress: () => setLastAction('edit'),
          },
          {
            key: 'share',
            label: 'Share',
            icon: <Text style={styles.emoji}>🔗</Text>,
            onPress: () => setLastAction('share'),
          },
          {
            key: 'delete',
            label: 'Delete address',
            icon: <Text style={styles.emoji}>🗑️</Text>,
            danger: true,
            onPress: () => setLastAction('delete'),
          },
        ]}
      />

      <ConfirmSheet
        visible={open === 'confirm'}
        title="Delete this address?"
        description="You will need to add it again to book a service there."
        confirmLabel="Delete"
        tone="danger"
        icon={<Text style={styles.emojiLarge}>🗑️</Text>}
        onCancel={close}
        onConfirm={async () => {
          await new Promise((r) => setTimeout(r, 1500));
          setLastAction('confirmed delete');
          close();
        }}
      />
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <Text style={styles.hint}>{children}</Text>;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SheetProvider>
          <Demo />
          <StatusBar style="dark" />
        </SheetProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F4F6' },
  content: { paddingHorizontal: 20, paddingBottom: 100, gap: 4 },
  h1: { fontSize: 28, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 13, color: '#6B7280', marginBottom: 12 },
  section: { marginTop: 20, gap: 8 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  hint: { fontSize: 12.5, lineHeight: 18, color: '#6B7280' },
  btn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  btnPressed: { backgroundColor: '#1D4ED8' },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  fakeTabBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    backgroundColor: '#111827',
  },
  tabText: { color: '#F9FAFB', fontSize: 13, fontWeight: '700' },
  pad: { paddingHorizontal: 20 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#111827', marginBottom: 8 },
  sheetBody: { fontSize: 14, lineHeight: 20, color: '#6B7280', marginBottom: 16 },
  listRow: { paddingVertical: 14, paddingHorizontal: 20, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  listText: { fontSize: 15, color: '#111827' },
  emoji: { fontSize: 18 },
  emojiLarge: { fontSize: 30 },
});
