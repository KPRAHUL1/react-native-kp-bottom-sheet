import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { defaultSheetTheme, type SheetTheme } from './theme';

type RenderFn = (id: string, node: ReactNode | null) => void;

const PortalInputContext = createContext<RenderFn | undefined>(undefined);
const PortalOutputContext = createContext<Map<string, ReactNode>>(new Map());
const ThemeContext = createContext<SheetTheme>(defaultSheetTheme);

/** The merged theme for the nearest `SheetProvider`. */
export function useSheetTheme(): SheetTheme {
  return useContext(ThemeContext);
}

/**
 * Renders whatever every live `useSheetPortal()` call currently wants shown.
 *
 * `SheetProvider` mounts this for you as its own last child; you only need it
 * directly if you want the sheets to land somewhere other than the very end of
 * the provider — outside an app frame wrapper, say. In that case render
 * `<SheetProvider host={false}>` and put `<SheetPortalHost />` where you want it.
 */
export function SheetPortalHost() {
  const nodes = useContext(PortalOutputContext);
  return (
    <>
      {[...nodes.entries()].map(([id, node]) => (
        <React.Fragment key={id}>{node}</React.Fragment>
      ))}
    </>
  );
}

export type SheetProviderProps = {
  children: ReactNode;
  /** Partial override merged over `defaultSheetTheme`. */
  theme?: Partial<SheetTheme>;
  /**
   * Set false to place `<SheetPortalHost />` yourself. Useful when the app
   * renders inside a max-width frame and sheets should escape it.
   */
  host?: boolean;
  /** Style for the wrapper view. Defaults to `{ flex: 1 }`. */
  style?: StyleProp<ViewStyle>;
};

/**
 * Wrap the app once, as high as possible — inside `GestureHandlerRootView` and
 * `SafeAreaProvider`, outside your navigator.
 *
 * Two jobs: it carries the theme, and it is the place sheets paint.
 *
 * That second job is the whole reason this exists. The sheets deliberately do
 * not use React Native's `<Modal>` (see `Sheet`), so they are ordinary
 * absolutely-positioned views — and an ordinary view obeys ordinary stacking
 * rules. A `zIndex` only reorders siblings under the same parent, so a sheet
 * opened from a screen nested inside a tab navigator can never paint over the
 * tab bar, which lives several levels up. Portalling the sheet's output to a
 * host at the app root sidesteps that: the sheet is *declared* deep in the
 * tree but *rendered* at the top of it.
 */
export function SheetProvider({ children, theme, host = true, style }: SheetProviderProps) {
  const [nodes, setNodes] = useState<Map<string, ReactNode>>(() => new Map());

  const render = useCallback<RenderFn>((id, node) => {
    setNodes((prev) => {
      const next = new Map(prev);
      if (node) next.set(id, node);
      else next.delete(id);
      return next;
    });
  }, []);

  const mergedTheme = useMemo<SheetTheme>(
    () => (theme ? { ...defaultSheetTheme, ...theme } : defaultSheetTheme),
    [theme],
  );

  return (
    <ThemeContext.Provider value={mergedTheme}>
      <PortalInputContext.Provider value={render}>
        <PortalOutputContext.Provider value={nodes}>
          <View style={style ?? styles.root}>
            {children}
            {host ? <SheetPortalHost /> : null}
          </View>
        </PortalOutputContext.Provider>
      </PortalInputContext.Provider>
    </ThemeContext.Provider>
  );
}

/**
 * Call with the node to show while it should be visible, `null` otherwise.
 * The node is rendered at the `SheetPortalHost`, not here.
 */
export function useSheetPortal(node: ReactNode | null): void {
  const render = useContext(PortalInputContext);
  const id = useId();

  if (__DEV__ && !render) {
    throw new Error(
      '[react-native-kp-bottom-sheet] No <SheetProvider> found above this sheet. ' +
        'Wrap your app in <SheetProvider> (inside <GestureHandlerRootView> and ' +
        '<SafeAreaProvider>) or nothing will render.',
    );
  }

  useEffect(() => {
    render?.(id, node);
    return () => render?.(id, null);
  }, [render, id, node]);
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
