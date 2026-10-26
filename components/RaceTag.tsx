import type { ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, SKEW } from '@/lib/theme';

/**
 * Slanted label like a broadcast timing graphic. `solid` fills it with `color`;
 * otherwise it is a dark slab with a `color` stripe on the left.
 */
export function RaceTag({
  label,
  color = colors.race,
  solid = true,
  textColor,
  icon,
  small,
  style,
}: {
  label: string;
  color?: string;
  solid?: boolean;
  textColor?: string;
  icon?: ReactNode;
  small?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const fg = textColor ?? (solid ? colors.bg : colors.text);
  return (
    <View
      style={[
        styles.tag,
        small && styles.small,
        solid ? { backgroundColor: color } : [styles.dark, { borderLeftColor: color }],
        style,
      ]}>
      <View style={styles.unskew}>
        {icon}
        <Text style={[styles.label, small && styles.smallLabel, { color: fg }]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: {
    alignSelf: 'flex-start',
    height: 28,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: 3,
    transform: [{ skewX: SKEW }],
  },
  small: { height: 22, paddingHorizontal: 9 },
  dark: { backgroundColor: 'rgba(14,14,18,0.9)', borderLeftWidth: 4 },
  unskew: { flexDirection: 'row', alignItems: 'center', gap: 6, transform: [{ skewX: '12deg' }] },
  label: { fontFamily: fonts.displayItalic, fontSize: 15, letterSpacing: 1.2, textTransform: 'uppercase' },
  smallLabel: { fontSize: 12, letterSpacing: 1 },
});
