import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius } from '@/lib/theme';

const liquid = isLiquidGlassAvailable();

/** iOS 26 Liquid Glass where available, a frosted dark panel everywhere else. */
export function Glass({ style, ...props }: ViewProps) {
  return liquid ? (
    <GlassView glassEffectStyle="regular" colorScheme="dark" style={[styles.base, style]} {...props} />
  ) : (
    <View style={[styles.base, styles.fallback, style]} {...props} />
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.lg, overflow: 'hidden' },
  fallback: { backgroundColor: colors.glass, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
});
