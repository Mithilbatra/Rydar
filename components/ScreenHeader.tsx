import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { type } from '@/lib/theme';

export function ScreenHeader({ eyebrow, title, right }: { eyebrow?: string; title: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        {eyebrow ? <Text style={type.label}>{eyebrow}</Text> : null}
        <Text style={type.title} accessibilityRole="header">
          {title}
        </Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  text: { flex: 1, gap: 2 },
});
