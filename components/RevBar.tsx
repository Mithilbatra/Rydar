import { StyleSheet, View } from 'react-native';

import { colors, SKEW } from '@/lib/theme';

const SEGMENTS = 16;

const segmentColor = (i: number) =>
  i < 6 ? colors.success : i < 11 ? colors.warning : i < SEGMENTS - 1 ? colors.danger : colors.record;

/** Shift-light bar from a race dash: green, then yellow, then red, with a purple light at full scale. */
export function RevBar({ value, max }: { value: number; max: number }) {
  const lit = Math.round(Math.min(1, Math.max(0, value / max)) * SEGMENTS);
  return (
    <View style={styles.row} accessible accessibilityLabel={`${Math.round((lit / SEGMENTS) * 100)} percent of scale`}>
      {Array.from({ length: SEGMENTS }, (_, i) => {
        const on = i < lit;
        const color = segmentColor(i);
        return (
          <View
            key={i}
            style={[
              styles.segment,
              on ? { backgroundColor: color, shadowColor: color, shadowOpacity: 0.9 } : styles.off,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, height: 14 },
  segment: {
    flex: 1,
    borderRadius: 2,
    transform: [{ skewX: SKEW }],
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
  },
  off: { backgroundColor: 'rgba(255,255,255,0.07)' },
});
