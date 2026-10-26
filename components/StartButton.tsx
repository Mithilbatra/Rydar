import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ActivityIcon } from '@/components/ActivityIcon';
import { ACTIVITIES } from '@/lib/activities';
import { colors, fonts } from '@/lib/theme';
import type { ActivityType } from '@/types';

const SIZE = 184;

/** The big round START button, with two rings pulsing out of it like a radar. */
export function StartButton({ activity, onPress }: { activity: ActivityType; onPress: () => void }) {
  const { accent, gradient, label } = ACTIVITIES[activity];
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!reduceMotion) {
      pulse.set(withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.quad) }), -1, false));
    }
  }, [pulse, reduceMotion]);

  const ringA = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.get() * 0.5 }],
    opacity: 0.55 * (1 - pulse.get()),
  }));
  const ringB = useAnimatedStyle(() => {
    const p = (pulse.get() + 0.5) % 1;
    return { transform: [{ scale: 1 + p * 0.5 }], opacity: 0.55 * (1 - p) };
  });

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.ring, { borderColor: accent }, ringA]} />
      <Animated.View style={[styles.ring, { borderColor: accent }, ringB]} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Start ${label.toLowerCase()} ride`}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          onPress();
        }}
        style={({ pressed }) => [styles.button, { shadowColor: accent }, pressed && styles.pressed]}>
        <LinearGradient colors={gradient} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.fill}>
          <ActivityIcon type={activity} size={46} color={colors.bg} />
          <Text style={styles.label}>START</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: SIZE * 1.6, height: SIZE * 1.6, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: 2 },
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    shadowOpacity: 0.55,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  fill: { flex: 1, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontFamily: fonts.displayItalic, fontSize: 40, color: colors.bg, letterSpacing: 2 },
  pressed: { transform: [{ scale: 0.95 }] },
});
