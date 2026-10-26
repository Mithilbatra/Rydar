import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

/** Simple bar chart; the highlighted bar is drawn in full colour. */
export function Bars({
  values,
  labels,
  color,
  highlight = values.length - 1,
  height = 84,
}: {
  values: number[];
  labels: string[];
  color: string;
  highlight?: number;
  height?: number;
}) {
  const max = Math.max(...values, 0);
  return (
    <View style={styles.row}>
      {values.map((v, i) => (
        <View key={i} style={styles.col}>
          <View style={[styles.slot, { height }]}>
            <View
              style={[
                styles.bar,
                {
                  height: max > 0 ? Math.max(4, (v / max) * height) : 4,
                  backgroundColor: v === 0 ? colors.surfaceRaised : i === highlight ? color : `${color}55`,
                },
              ]}
            />
          </View>
          <Text style={[styles.label, i === highlight && { color: colors.text }]}>{labels[i]}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  col: { flex: 1, alignItems: 'center', gap: 6 },
  slot: { width: '100%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 6 },
  label: { fontFamily: fonts.semibold, fontSize: 11, color: colors.textFaint, letterSpacing: 0.5 },
});
