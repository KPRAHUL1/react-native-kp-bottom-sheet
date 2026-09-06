# react-native-kp-bottom-sheet

**[Live demo →](https://kprahul1.github.io/react-native-kp-bottom-sheet/)**  ·  [npm](https://www.npmjs.com/package/react-native-kp-bottom-sheet)

A bottom sheet for React Native that works the same on Android as it does on iOS and web.

Content-sized by default, gesture-driven, and rendered above tab bars and navigators. Ships with two ready-made sheets — an options menu and a confirmation dialog — on top of the primitive.

```sh
npm install react-native-kp-bottom-sheet
```

Peer dependencies, which an Expo app already has:

```sh
npx expo install react-native-reanimated react-native-gesture-handler react-native-safe-area-context
```

## Why not just use a `<Modal>`?

Because drag-to-dismiss silently stops working on Android.

React Native's `<Modal>` renders into a separate native surface, and `react-native-gesture-handler`'s `GestureDetector` cannot see through it — even inside a `GestureHandlerRootView`. Nothing errors. The sheet just refuses to drag on Android while working perfectly on iOS and web, which is a miserable thing to debug.

So this package renders the sheet as an ordinary absolutely-positioned view instead. That fixes the gesture, but costs you Modal's other freebie: an ordinary view obeys ordinary stacking rules, and a `zIndex` only reorders siblings under the same parent — so a sheet opened from a screen nested inside a tab navigator can never paint over the tab bar, which lives several levels up.

Which is what `SheetProvider` is for. Sheets are *declared* deep in your tree and *rendered* at the app root. That is also why setup has a required step.

## Setup

Wrap the app once, as high up as you can:

```tsx
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SheetProvider } from 'react-native-kp-bottom-sheet';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <SheetProvider>
          <Navigation />
        </SheetProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
```

Forget it and any sheet below will throw a message telling you so in development.

## Usage

```tsx
import { useState } from 'react';
import { Button, Text } from 'react-native';
import { Sheet } from 'react-native-kp-bottom-sheet';

function Screen() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button title="Open" onPress={() => setOpen(true)} />
      <Sheet visible={open} onClose={() => setOpen(false)}>
        <Text>Anything at all.</Text>
      </Sheet>
    </>
  );
}
```

The sheet is a controlled component and renders nothing where you put it. `onClose` fires on backdrop tap, drag-down and Android hardware back; flip your own state there.

Height is driven by the content — the surface is an ordinary `View`, so it wraps whatever is inside it, capped at `maxHeight`. Reach for a fixed `height` only when the content is a list that should always open at a set size.

### Sheets containing a list

Pass `dragHandleOnly` whenever the sheet holds a `ScrollView` or `FlatList`:

```tsx
<Sheet visible={open} onClose={close} height="70%" dragHandleOnly>
  <FlatList data={items} renderItem={renderItem} />
</Sheet>
```

Without it the sheet's own pan gesture competes with the list's scrolling, and a downward drag on a list that is scrolled part-way moves the sheet instead of the list. Dragging by the handle alone has nothing to compete with.

### `Sheet` props

| Prop | Type | Default | |
| --- | --- | --- | --- |
| `visible` | `boolean` | — | Required. |
| `onClose` | `() => void` | — | Backdrop tap, drag-down, or hardware back. |
| `height` | `number \| "60%"` | — | Fixed height. Omit to size to content. |
| `maxHeight` | `number \| "60%"` | `"88%"` | Ceiling for content-sized sheets. |
| `dismissible` | `boolean` | `true` | `false` pins the sheet open — no drag, no backdrop tap, no back. |
| `dragHandleOnly` | `boolean` | `false` | Drag by the handle only. Set it for scrollable content. |
| `showHandle` | `boolean` | `true` | Hides the drag pill. |
| `style` | `ViewStyle` | — | Applied to the sheet surface. |

Percentages resolve against the live window, so a sheet opened after a rotation, in split-screen, or on an unfolded foldable is sized against the window it is actually in.

## Presets

### `ActionSheet`

An options menu — the "Edit / Delete" you get from a list row.

```tsx
import { Pencil, Trash2 } from 'lucide-react-native';
import { ActionSheet } from 'react-native-kp-bottom-sheet';

<ActionSheet
  visible={open}
  onClose={() => setOpen(false)}
  title="Home"
  subtitle="221B Baker Street"
  items={[
    { key: 'edit', label: 'Edit address', icon: <Pencil size={20} />, onPress: edit },
    { key: 'delete', label: 'Delete', icon: <Trash2 size={20} />, danger: true, onPress: remove },
  ]}
/>;
```

`icon` is any node, so the package pulls in no icon library of its own. `danger` tints the tile and label. Pass `title` wherever the sheet is opened from a list — "Delete" alone does not say *which* row.

### `ConfirmSheet`

A confirmation dialog, for when the platform alert feels off-brand.

```tsx
<ConfirmSheet
  visible={open}
  title="Delete this card?"
  description="You will need to add it again to use it."
  confirmLabel="Delete"
  tone="danger"
  onCancel={() => setOpen(false)}
  onConfirm={async () => {
    await api.deleteCard(id);
    setOpen(false);
  }}
/>
```

While `onConfirm` is in flight the button shows a spinner and the sheet refuses to close — dragging it away mid-request would leave your loading state stranded.

## Theming

`SheetProvider` takes a partial override, merged over the defaults:

```tsx
<SheetProvider theme={{ surface: '#111827', textPrimary: '#F9FAFB', primary: '#22D3EE', radius: 20 }}>
```

Tokens: `surface`, `border`, `backdrop`, `handle`, `primary`, `primaryTint`, `danger`, `dangerTint`, `textPrimary`, `textSecondary`, `radius`. Import `defaultSheetTheme` to see the values, or `useSheetTheme()` to read the merged result in your own sheet content.

For a one-off, `style` on any sheet wins over the theme.

## Placing the portal yourself

`SheetProvider` renders its host as its own last child. If your app has a wrapper the sheets should escape — a max-width frame on tablet and web, say — put the host where you want it:

```tsx
<SheetProvider host={false}>
  <View style={styles.backdropColumn}>
    <View style={styles.appFrame}>
      <Navigation />
    </View>
    <SheetPortalHost />
  </View>
</SheetProvider>
```

## Not in this version

Snap points. Every sheet here is single-height, open or closed. Keyboard avoidance for inputs inside a sheet is likewise left to you for now.

## License

MIT
