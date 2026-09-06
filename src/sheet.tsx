import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  BackHandler,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSheetPortal, useSheetTheme } from './portal';

/** A pixel value, or a percentage of the current window height. */
export type SheetHeight = number | `${number}%`;

export type SheetProps = {
  visible: boolean;
  /** Fires on backdrop tap, drag-down, or hardware back. Flip `visible` here. */
  onClose: () => void;
  /**
   * Fixed height. Omit and the sheet sizes to its content, capped at
   * `maxHeight` — right for almost everything. Pass a value only when the
   * content is a list that should always open at a set size.
   */
  height?: SheetHeight;
  /** Ceiling for content-sized sheets. Defaults to 88% of the window. */
  maxHeight?: SheetHeight;
  /** Extra styling for the sheet surface (colour, radius, padding). */
  style?: StyleProp<ViewStyle>;
  /**
   * Set false to pin the sheet open — no drag-down, no backdrop tap, no
   * hardware back. For sheets running an action they cannot half-finish, like
   * a confirm whose request is already in flight.
   */
  dismissible?: boolean;
  /**
   * Restrict drag-to-dismiss to the handle instead of the whole surface.
   *
   * Set this whenever the sheet contains a `ScrollView` or `FlatList`. A pan
   * gesture on the whole surface competes with the list's own scrolling, and a
   * downward drag on a list that is scrolled part-way moves the sheet instead
   * of the list. Dragging by the handle alone has nothing to compete with.
   */
  dragHandleOnly?: boolean;
  /** Hide the drag pill. With `dragHandleOnly` this leaves no way to drag. */
  showHandle?: boolean;
  children: ReactNode;
};

const ENTER_MS = 260;
const EXIT_MS = 220;
/** Drag past this many px, or flick faster than this, and the sheet dismisses. */
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 800;

/**
 * Percentage heights resolve against the *live* window, not a module-load
 * snapshot — so a sheet opened after a rotation, in split-screen, or on an
 * unfolded foldable is sized against the window it is actually in.
 */
function toPixels(height: SheetHeight, windowHeight: number): number {
  return typeof height === 'number' ? height : (parseFloat(height) / 100) * windowHeight;
}

/**
 * A bottom sheet: slides up over the app, dims what is behind it, and is
 * dismissed by dragging down or tapping the backdrop.
 *
 * Three decisions carry the whole thing, and each is load bearing:
 *
 *  - **A plain absolutely-positioned overlay, NOT React Native's `<Modal>`.**
 *    Modal renders into a separate native surface that
 *    react-native-gesture-handler's `GestureDetector` cannot see through on
 *    Android, so drag-to-dismiss silently never fires — even inside a
 *    `GestureHandlerRootView`. This is the bug that makes most hand-rolled
 *    sheets, and more than one library, work on iOS and web but not Android.
 *  - **Portalled to the app root** via `useSheetPortal`. Without Modal's
 *    separate surface a `zIndex` can only reorder siblings, so a sheet opened
 *    from a tab screen could never paint above the tab bar.
 *  - **Reanimated shared values**, so the slide and the finger-tracking run on
 *    the UI thread instead of round-tripping through JS every frame.
 *
 * Height is content-driven: the surface is an ordinary `View`, so it wraps
 * whatever you put in it, and `maxHeight` keeps a long one on screen.
 */
export function Sheet({
  visible,
  onClose,
  height,
  maxHeight = '88%',
  style,
  dismissible = true,
  dragHandleOnly = false,
  showHandle = true,
  children,
}: SheetProps) {
  const theme = useSheetTheme();
  const insets = useSafeAreaInsets();
  // Live, so the sheet re-measures on rotation, split-screen and unfold rather
  // than keeping whatever the window was when the module first loaded.
  const { height: windowHeight } = useWindowDimensions();
  const offscreen = windowHeight;

  // `visible` says what the caller wants; `mounted` says what is on screen.
  // They differ for the length of the exit animation — without that gap the
  // sheet would vanish on close instead of sliding away, because the caller
  // flips `visible` to false and React unmounts it on the next frame.
  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(offscreen);
  const progress = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    progress.value = withTiming(0, { duration: EXIT_MS });
    translateY.value = withTiming(
      offscreen,
      { duration: EXIT_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(setMounted)(false);
      },
    );
  }, [visible, offscreen, progress, translateY]);

  // Slide up from below, settling with no overshoot. Reset to below-screen
  // first so a sheet reopened before its exit finished starts from the bottom.
  useEffect(() => {
    if (!mounted || !visible) return;
    translateY.value = offscreen;
    translateY.value = withTiming(0, { duration: ENTER_MS, easing: Easing.out(Easing.cubic) });
    progress.value = withTiming(1, { duration: ENTER_MS });
  }, [mounted, visible, offscreen, progress, translateY]);

  const dismiss = useCallback(() => {
    if (!dismissible) return;
    onClose();
  }, [dismissible, onClose]);

  // No <Modal> means no built-in hardware-back interception — handle it here,
  // and only while the sheet is actually showing. Swallowing the event even
  // when `dismissible` is false is deliberate: back should not navigate away
  // from underneath a sheet that is mid-action.
  useEffect(() => {
    if (!visible || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      dismiss();
      return true;
    });
    return () => sub.remove();
  }, [visible, dismiss]);

  const panGesture = Gesture.Pan()
    .enabled(dismissible)
    // Requires a real downward drag before activating, so it never steals taps
    // from buttons inside the sheet...
    .activeOffsetY(10)
    // ...and never steals an upward swipe, which belongs to any scrollable
    // content in the sheet.
    .failOffsetY(-10)
    .onUpdate((e) => {
      translateY.value = Math.max(0, e.translationY);
    })
    .onEnd((e) => {
      const shouldDismiss = translateY.value > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY;
      if (shouldDismiss) {
        // Animate out from where the finger left it and tell the caller in the
        // same breath. The exit effect above then runs against a sheet that is
        // already gone and only flips `mounted`, so this stays correct even if
        // the caller is slow to flip `visible`.
        translateY.value = withTiming(offscreen, {
          duration: EXIT_MS,
          easing: Easing.in(Easing.cubic),
        });
        progress.value = withTiming(0, { duration: EXIT_MS });
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Fades in with the sheet, and keeps fading as you drag it away — so a
  // half-dragged sheet already shows more of the screen behind it.
  const backdropStyle = useAnimatedStyle(() => ({
    opacity:
      progress.value *
      interpolate(translateY.value, [0, DISMISS_DISTANCE * 2], [1, 0.2], Extrapolation.CLAMP),
  }));

  const handle = (
    <View style={styles.handleArea}>
      <View style={[styles.handleBar, { backgroundColor: theme.handle }]} />
    </View>
  );

  const surface = (
    <Animated.View
      style={[
        styles.sheet,
        {
          backgroundColor: theme.surface,
          borderTopLeftRadius: theme.radius,
          borderTopRightRadius: theme.radius,
        },
        height != null
          ? { height: toPixels(height, windowHeight) }
          : { maxHeight: toPixels(maxHeight, windowHeight) },
        { paddingBottom: insets.bottom + 12 },
        sheetStyle,
        style,
      ]}
    >
      {showHandle ? (
        dragHandleOnly ? (
          <GestureDetector gesture={panGesture}>{handle}</GestureDetector>
        ) : (
          handle
        )
      ) : null}
      {children}
    </Animated.View>
  );

  useSheetPortal(
    mounted ? (
      <View style={styles.overlay} pointerEvents="box-none">
        {/* A sibling of the sheet, not its parent.

            Wrapping the sheet in the backdrop would mean an inert Pressable
            inside it to stop taps bubbling back out — one pressable nested in
            another. On web react-native-web renders each as a <button>, so
            every button in every sheet becomes a <button> inside a <button>:
            invalid HTML, and it breaks hydration.

            As siblings there is nothing to bubble through. The backdrop fills
            the overlay behind the sheet and catches only the taps that miss. */}
        <Animated.View
          style={[styles.backdrop, { backgroundColor: theme.backdrop }, backdropStyle]}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={dismiss}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        {dragHandleOnly ? (
          surface
        ) : (
          <GestureDetector gesture={panGesture}>{surface}</GestureDetector>
        )}
      </View>
    ) : null,
  );

  return null;
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, zIndex: 50, justifyContent: 'flex-end' },
  // Absolute, so it takes no part in the layout that puts the sheet at the
  // bottom — it just fills the overlay behind it.
  backdrop: { ...StyleSheet.absoluteFillObject },
  sheet: { paddingTop: 12 },
  // Padded rather than bare, so the pill is a comfortable drag target when
  // `dragHandleOnly` makes it the only one.
  handleArea: { alignItems: 'center', paddingTop: 2, paddingBottom: 14 },
  handleBar: { width: 44, height: 5, borderRadius: 999 },
});
