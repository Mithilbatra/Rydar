import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { colors, fonts } from '@/lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const HOLD_MS = 900;
const STROKE = 5;

/**
 * Press and hold to confirm. Finishing a ride by accident with a bump in the road or a glove
 * is worse than one extra second.
 */
export function HoldButton({
  label,
  color,
  icon,
  onComplete,
  size = 92,
}: {
  label: string;
  color: string;
  icon: ReactNode;
  onComplete: () => void;
  size?: number;
}) {
  const progress = useSharedValue(0);
  const r = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * (1 - progress.get()) }));

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Press and hold"
        delayLongPress={HOLD_MS}
        onPressIn={() => {
          Haptics.selectionAsync();
          progress.set(withTiming(1, { duration: HOLD_MS, easing: Easing.linear }));
        }}
        onPressOut={() => progress.set(withTiming(0, { duration: 180 }))}
        onLongPress={() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          onComplete();
        }}
        style={({ pressed }) => [
          { width: size, height: size, borderRadius: size / 2 },
          styles.button,
          pressed && styles.pressed,
        ]}>
        <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={`${color}33`} strokeWidth={STROKE} fill="none" />
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={`${circumference} ${circumference}`}
            animatedProps={ringProps}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        {icon}
      </Pressable>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8 },
  button: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,46,58,0.12)' },
  pressed: { transform: [{ scale: 0.96 }] },
  label: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.4, color: colors.textDim, textTransform: 'uppercase' },
});
