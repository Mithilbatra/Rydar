import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, fonts, space } from '@/lib/theme';

export const BRAND_GRADIENT = ['#C8FF2E', '#FF6A1F'] as const;

// A made-up route that sweeps across the top of the screen, lime (bicycle) into orange (motorbike).
const ROUTE =
  'M-20 210 C 40 150, 70 260, 130 200 S 210 90, 250 150 S 330 250, 380 120 S 430 40, 460 80';

/** Shared backdrop and layout for the sign-in and sign-up screens. */
export function AuthScreen({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Svg width="100%" height={300} viewBox="0 0 440 300" preserveAspectRatio="xMidYMid slice" style={styles.art}>
        <Defs>
          <LinearGradient id="brand" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={BRAND_GRADIENT[0]} />
            <Stop offset="1" stopColor={BRAND_GRADIENT[1]} />
          </LinearGradient>
        </Defs>
        <Path d={ROUTE} stroke="url(#brand)" strokeOpacity={0.18} strokeWidth={26} fill="none" strokeLinecap="round" />
        <Path d={ROUTE} stroke="url(#brand)" strokeWidth={5} fill="none" strokeLinecap="round" />
      </Svg>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 180, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.brand}>
          <Text style={styles.logo}>RYDAR</Text>
          <Text style={styles.tagline}>Bicycle & motorbike ride tracker</Text>
        </View>
        <View style={styles.heading}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  art: { position: 'absolute', top: 0, left: 0 },
  content: { paddingHorizontal: space.xl, gap: space.xl, flexGrow: 1 },
  brand: { gap: 0 },
  logo: { fontFamily: fonts.displayItalic, fontSize: 72, lineHeight: 76, color: colors.text, letterSpacing: 4 },
  tagline: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textDim, letterSpacing: 1.6, textTransform: 'uppercase' },
  heading: { gap: 4 },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.text },
  subtitle: { fontSize: 15, color: colors.textDim, lineHeight: 21 },
});
