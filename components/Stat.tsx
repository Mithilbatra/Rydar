import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts, type } from '@/lib/theme';

const SIZES = { sm: 22, md: 30, lg: 44, xl: 72 } as const;

/** A label over a big number with a small unit next to it. */
export function Stat({
  label,
  value,
  unit,
  size = 'md',
  color = colors.text,
  align = 'left',
}: {
  label: string;
  value: string;
  unit?: string;
  size?: keyof typeof SIZES;
  color?: string;
  align?: 'left' | 'center';
}) {
  const fontSize = SIZES[size];
  return (
    <View style={align === 'center' && styles.center} accessible accessibilityLabel={`${label}: ${value} ${unit ?? ''}`}>
      <Text style={type.label}>{label}</Text>
      <View style={styles.row}>
        <Text
          style={[styles.value, { fontSize, lineHeight: fontSize * 1.08, color }, size === 'xl' && styles.italic]}
          numberOfLines={1}
          adjustsFontSizeToFit>
          {value}
        </Text>
        {unit ? <Text style={[styles.unit, { fontSize: Math.max(13, fontSize * 0.36) }]}>{unit}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  value: { fontFamily: fonts.displayItalic, fontVariant: ['tabular-nums'] },
  italic: { fontFamily: fonts.black },
  unit: { fontFamily: fonts.semibold, color: colors.textDim, letterSpacing: 0.5 },
});
