import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { ActivityIcon } from '@/components/ActivityIcon';
import { ACTIVITIES, ACTIVITY_TYPES } from '@/lib/activities';
import { colors, fonts, radius } from '@/lib/theme';
import type { ActivityType } from '@/types';

const PAD = 4;

/** Bicycle / Motorbike switch with a pill that slides to the chosen side. */
export function ActivityToggle({ value, onChange }: { value: ActivityType; onChange: (v: ActivityType) => void }) {
  const [width, setWidth] = useState(0);
  const index = ACTIVITY_TYPES.indexOf(value);
  const x = useSharedValue(index);
  const segment = (width - PAD * 2) / ACTIVITY_TYPES.length;

  useEffect(() => {
    x.set(withSpring(index, { damping: 18, stiffness: 190 }));
  }, [index, x]);

  const pill = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() * segment }] }));

  return (
    <View style={styles.track} onLayout={(e) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="tablist">
      {width > 0 && (
        <Animated.View style={[styles.pill, { width: segment }, pill]}>
          <LinearGradient colors={ACTIVITIES[value].gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} />
        </Animated.View>
      )}
      {ACTIVITY_TYPES.map((type) => {
        const selected = type === value;
        const tint = selected ? colors.bg : colors.textDim;
        return (
          <Pressable
            key={type}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={styles.segment}
            onPress={() => {
              if (selected) return;
              Haptics.selectionAsync();
              onChange(type);
            }}>
            <ActivityIcon type={type} size={22} color={tint} />
            <Text style={[styles.label, { color: tint }]}>{ACTIVITIES[type].label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    height: 58,
    padding: PAD,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pill: { position: 'absolute', top: PAD, bottom: PAD, left: PAD, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { flex: 1 },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  label: { fontFamily: fonts.display, fontSize: 18, letterSpacing: 0.8, textTransform: 'uppercase' },
});
