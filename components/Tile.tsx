import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, SKEW } from '@/lib/theme';

/** A slanted dark slab with a coloured stripe, like a timing-tower row. Content stays upright. */
export function Tile({
  children,
  accent = colors.border,
  style,
}: {
  children: ReactNode;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={[StyleSheet.absoluteFill, styles.bg, { borderLeftColor: accent }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 12, paddingHorizontal: 18 },
  bg: {
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderLeftWidth: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    transform: [{ skewX: SKEW }],
  },
});
