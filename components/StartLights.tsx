import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { colors, fonts } from '@/lib/theme';

const LIGHTS = 5;
const STEP_MS = 320;
const HOLD_MS = 450;
const GO_MS = 650;

/**
 * Race start: five red lights come on one by one, then all go out and the ride starts.
 * Tap anywhere to skip; with Reduce Motion on it starts straight away.
 */
export function StartLights({ accent, onDone }: { accent: string; onDone: () => void }) {
  const reduceMotion = useReducedMotion();
  const [lit, setLit] = useState(0);
  const [out, setOut] = useState(false);
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };

  useEffect(() => {
    if (reduceMotion) {
      finish();
      return;
    }
    const timers = Array.from({ length: LIGHTS }, (_, i) =>
      setTimeout(() => {
        setLit(i + 1);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }, (i + 1) * STEP_MS),
    );
    const outAt = LIGHTS * STEP_MS + HOLD_MS;
    timers.push(
      setTimeout(() => {
        setOut(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }, outAt),
      setTimeout(finish, outAt + GO_MS),
    );
    return () => timers.forEach(clearTimeout);
    // Runs once: the sequence must not restart on re-render.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Pressable style={styles.overlay} onPress={finish} accessibilityRole="button" accessibilityLabel="Skip start lights">
      <View style={styles.gantry}>
        {Array.from({ length: LIGHTS }, (_, i) => {
          const on = !out && i < lit;
          return (
            <View key={i} style={styles.housing}>
              {[0, 1].map((row) => (
                <View key={row} style={[styles.light, on && styles.lightOn]} />
              ))}
            </View>
          );
        })}
      </View>
      <Text style={[styles.caption, out && { color: accent, fontSize: 64, lineHeight: 70 }]}>
        {/* Written in capitals: Android sizes text before textTransform and clips big italic captions. */}
        {out ? 'LIGHTS OUT' : 'GET READY'}
      </Text>
      {!out && <Text style={styles.skip}>TAP TO SKIP</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5,5,7,0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  gantry: { flexDirection: 'row', gap: 10, padding: 12, borderRadius: 10, backgroundColor: '#111' },
  housing: { gap: 8, padding: 8, borderRadius: 8, backgroundColor: '#1d1d22' },
  light: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2a0a0d' },
  lightOn: {
    backgroundColor: colors.race,
    shadowColor: '#FF1A2E',
    shadowOpacity: 1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  caption: {
    fontFamily: fonts.black,
    fontSize: 34,
    lineHeight: 40,
    color: colors.text,
    letterSpacing: 1,
  },
  skip: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 1.4, color: colors.textFaint },
});
