import { StyleSheet } from 'react-native';

// Race-broadcast palette: asphalt black, racing red, and the timing-screen colours
// (purple = best ever, green = live / personal, yellow = caution).
export const colors = {
  bg: '#08080A',
  surface: '#121216',
  surfaceRaised: '#1B1B21',
  glass: 'rgba(14,14,18,0.86)',
  border: 'rgba(255,255,255,0.08)',
  text: '#F5F5F7',
  textDim: '#9A9AA6',
  textFaint: '#5E5E6A',
  race: '#E4002B',
  danger: '#FF2E3A',
  warning: '#FFD60A',
  success: '#21E56B',
  record: '#B04CFF',
  start: '#21E56B',
  finish: '#FF2E3A',
} as const;

export const radius = { sm: 8, md: 14, lg: 20, xl: 28, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Slant used by race tags and tiles, like broadcast timing graphics. */
export const SKEW = '-12deg';

/** Loaded in app/_layout.tsx. Condensed italics read like a race dash and fit big values on one line. */
export const fonts = {
  semibold: 'BarlowCondensed_600SemiBold',
  display: 'BarlowCondensed_700Bold',
  displayItalic: 'BarlowCondensed_800ExtraBold_Italic',
  black: 'BarlowCondensed_900Black_Italic',
} as const;

export const type = StyleSheet.create({
  hero: { fontFamily: fonts.black, fontSize: 96, lineHeight: 100, color: colors.text, letterSpacing: -1 },
  title: {
    fontFamily: fonts.black,
    fontSize: 38,
    lineHeight: 42,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heading: {
    fontFamily: fonts.displayItalic,
    fontSize: 22,
    color: colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  number: { fontFamily: fonts.display, fontSize: 28, color: colors.text, fontVariant: ['tabular-nums'] },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textDim,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  body: { fontSize: 15, color: colors.text },
  caption: { fontSize: 13, color: colors.textDim },
});
