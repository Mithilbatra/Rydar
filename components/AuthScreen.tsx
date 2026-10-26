import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon } from 'react-native-svg';

import { Chequered } from '@/components/Chequered';
import { ACTIVITIES } from '@/lib/activities';
import { colors, fonts, space } from '@/lib/theme';

export const BRAND_GRADIENT = ['#FF4B3A', colors.race] as const;

/** Shared backdrop and layout for the sign-in and sign-up screens: a racing livery across the top. */
export function AuthScreen({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Chequered height={150} cell={14} opacity={0.07} style={styles.flag} />
      <Svg width="100%" height={300} viewBox="0 0 440 300" preserveAspectRatio="xMidYMid slice" style={styles.art}>
        <Polygon points="0,150 440,40 440,112 0,222" fill={colors.race} />
        <Polygon points="0,232 440,122 440,131 0,241" fill={colors.text} />
        <Polygon points="0,250 440,140 440,146 0,256" fill={ACTIVITIES.bicycle.accent} />
      </Svg>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 190, paddingBottom: insets.bottom + space.xl }]}>
        <View>
          <Text style={styles.logo}>RYDAR</Text>
          <Text style={styles.tagline}>Bicycle & motorbike ride telemetry</Text>
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
  flag: { position: 'absolute', top: 0, left: 0 },
  art: { position: 'absolute', top: 0, left: 0 },
  content: { paddingHorizontal: space.xl, gap: space.xl, flexGrow: 1 },
  logo: { fontFamily: fonts.black, fontSize: 88, lineHeight: 92, color: colors.text, letterSpacing: 3 },
  tagline: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textDim, letterSpacing: 2, textTransform: 'uppercase' },
  heading: { gap: 4 },
  title: { fontFamily: fonts.black, fontSize: 30, color: colors.text, textTransform: 'uppercase' },
  subtitle: { fontSize: 15, color: colors.textDim, lineHeight: 21 },
});
