import { StyleSheet } from 'react-native';

export const colors = {
  bg: '#07080B',
  surface: '#101217',
  surfaceRaised: '#171A21',
  glass: 'rgba(16,18,23,0.82)',
  border: 'rgba(255,255,255,0.08)',
  text: '#F4F6FA',
  textDim: '#9298A8',
  textFaint: '#5C6272',
  danger: '#FF4D5E',
  warning: '#FFC53D',
  success: '#3DF5A2',
  start: '#3DF5A2',
  finish: '#FF4D5E',
} as const;

export const radius = { sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/** Loaded in app/_layout.tsx. Condensed numbers read like a dashboard and fit big values on one line. */
export const fonts = {
  display: 'BarlowCondensed_700Bold',
  displayItalic: 'BarlowCondensed_800ExtraBold_Italic',
  semibold: 'BarlowCondensed_600SemiBold',
} as const;

export const type = StyleSheet.create({
  hero: { fontFamily: fonts.displayItalic, fontSize: 96, lineHeight: 100, color: colors.text, letterSpacing: -1 },
  title: { fontFamily: fonts.display, fontSize: 34, color: colors.text, letterSpacing: 0.2 },
  heading: { fontFamily: fonts.display, fontSize: 22, color: colors.text, letterSpacing: 0.3 },
  number: { fontFamily: fonts.display, fontSize: 28, color: colors.text, fontVariant: ['tabular-nums'] },
  label: {
    fontFamily: fonts.semibold,
    fontSize: 13,
    color: colors.textDim,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  body: { fontSize: 15, color: colors.text },
  caption: { fontSize: 13, color: colors.textDim },
});
