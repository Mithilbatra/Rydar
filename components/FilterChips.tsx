import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts, radius, SKEW } from '@/lib/theme';

export interface ChipOption<T extends string> {
  value: T;
  label: string;
  color?: string;
  icon?: (color: string) => ReactNode;
}

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: ChipOption<T>[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((o) => {
        const selected = o.value === value;
        const fg = selected ? colors.bg : colors.textDim;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(o.value);
            }}
            style={[styles.chip, selected && { backgroundColor: o.color ?? colors.text, borderColor: 'transparent' }]}>
            <View style={styles.unskew}>
              {o.icon?.(fg)}
              <Text style={[styles.label, { color: fg }]}>{o.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 4 },
  chip: {
    justifyContent: 'center',
    paddingHorizontal: 16,
    height: 38,
    borderRadius: radius.sm / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    transform: [{ skewX: SKEW }],
  },
  unskew: { flexDirection: 'row', alignItems: 'center', gap: 6, transform: [{ skewX: '12deg' }] },
  label: { fontFamily: fonts.displayItalic, fontSize: 16, letterSpacing: 0.8, textTransform: 'uppercase' },
});
