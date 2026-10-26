import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, fonts, radius, SKEW } from '@/lib/theme';

interface Props {
  label: string;
  onPress: () => void;
  gradient?: readonly [string, string];
  variant?: 'primary' | 'ghost' | 'danger';
  icon?: ReactNode;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_GRADIENT = ['#FF4B3A', colors.race] as const;

export function GradientButton({
  label,
  onPress,
  gradient = DEFAULT_GRADIENT,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
}: Props) {
  const primary = variant === 'primary';
  const textColor = primary ? colors.bg : variant === 'danger' ? colors.danger : colors.text;
  const content = (
    <View style={styles.inner}>
      {loading ? <ActivityIndicator color={textColor} /> : icon}
      <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    </View>
  );
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={() => {
        Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        !primary && styles.outline,
        variant === 'danger' && { borderColor: 'rgba(255,77,94,0.4)' },
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}>
      {primary ? (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
          {content}
        </LinearGradient>
      ) : (
        content
      )}
    </Pressable>
  );
}

// Slanted like a race-graphic slab; the content is skewed back so text stays upright.
const styles = StyleSheet.create({
  base: {
    height: 60,
    marginHorizontal: 6,
    borderRadius: radius.sm,
    overflow: 'hidden',
    justifyContent: 'center',
    transform: [{ skewX: SKEW }],
  },
  outline: { borderWidth: 1.5, borderColor: colors.border, backgroundColor: 'rgba(255,255,255,0.03)' },
  fill: { flex: 1, justifyContent: 'center' },
  inner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, transform: [{ skewX: '12deg' }] },
  label: { fontFamily: fonts.black, fontSize: 22, letterSpacing: 1.4, textTransform: 'uppercase' },
  pressed: { transform: [{ skewX: SKEW }, { scale: 0.97 }], opacity: 0.92 },
  disabled: { opacity: 0.5 },
});
