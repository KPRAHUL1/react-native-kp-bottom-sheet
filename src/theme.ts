/**
 * Every colour the sheets draw with, in one object.
 *
 * The sheets were extracted from an app where these were imported directly
 * from its own `constants/theme`. A package can't do that, so the tokens are
 * a context instead: `SheetProvider` takes a partial override, merges it over
 * these defaults, and every sheet below reads the result.
 */
export type SheetTheme = {
  /** The sheet surface itself. */
  surface: string;
  /** Hairlines and dividers inside sheets. */
  border: string;
  /** The dimmed layer behind the sheet. Include the alpha. */
  backdrop: string;
  /** The little drag pill at the top of the sheet. */
  handle: string;
  /** Accent — confirm buttons, action icons. */
  primary: string;
  /** A pale wash of `primary` — icon tiles, pressed rows. */
  primaryTint: string;
  /** Destructive accent. */
  danger: string;
  /** A pale wash of `danger`. */
  dangerTint: string;
  textPrimary: string;
  textSecondary: string;
  /** Corner radius of the sheet's top corners. */
  radius: number;
};

export const defaultSheetTheme: SheetTheme = {
  surface: '#FFFFFF',
  border: '#E5E7EB',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  handle: '#E5E7EB',
  primary: '#2563EB',
  primaryTint: '#EFF4FF',
  danger: '#E53935',
  dangerTint: '#FDECEC',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  radius: 28,
};
