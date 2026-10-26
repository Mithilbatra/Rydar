import { StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '@/lib/theme';

/** The rider's race number on a number board. */
export function NumberPlate({ number, color = colors.text, size = 56 }: { number: string; color?: string; size?: number }) {
  return (
    <View
      style={[styles.plate, { width: size * 1.3, height: size, borderRadius: size * 0.22, backgroundColor: color }]}
      accessible
      accessibilityLabel={`Race number ${number || 'not set'}`}>
      <Text style={[styles.number, { fontSize: size * 0.74, lineHeight: size * 0.9 }]} numberOfLines={1} adjustsFontSizeToFit>
        {number || '–'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  plate: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  number: { fontFamily: fonts.black, color: colors.bg, includeFontPadding: false },
});
