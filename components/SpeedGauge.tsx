import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';

import { colors, fonts } from '@/lib/theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const START_DEG = 150;
const SWEEP_DEG = 240;
const STROKE = 14;

const polar = (c: number, r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [c + r * Math.cos(a), c + r * Math.sin(a)] as const;
};

/** A 240° speedometer arc. `value` and `max` are in display units, so it works for km/h and mph. */
export function SpeedGauge({
  value,
  max,
  gradient,
  size = 260,
  children,
}: {
  value: number;
  max: number;
  gradient: readonly [string, string];
  size?: number;
  children?: ReactNode;
}) {
  const c = size / 2;
  const r = c - STROKE / 2 - 4;
  const [sx, sy] = polar(c, r, START_DEG);
  const [ex, ey] = polar(c, r, START_DEG + SWEEP_DEG);
  const arc = `M${sx} ${sy} A${r} ${r} 0 1 1 ${ex} ${ey}`;
  const length = (r * SWEEP_DEG * Math.PI) / 180;

  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(Math.min(1, Math.max(0, value / max)), { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [value, max, progress]);
  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - progress.get()) }));

  const ticks = Array.from({ length: 13 }, (_, i) => {
    const deg = START_DEG + (SWEEP_DEG / 12) * i;
    const major = i % 3 === 0;
    const [x1, y1] = polar(c, r - STROKE - (major ? 12 : 6), deg);
    const [x2, y2] = polar(c, r - STROKE - 2, deg);
    return { x1, y1, x2, y2, major, key: i };
  });

  return (
    <View style={{ width: size, height: size * 0.86 }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="gauge" x1="0" y1="1" x2="1" y2="0">
            <Stop offset="0" stopColor={gradient[1]} />
            <Stop offset="1" stopColor={gradient[0]} />
          </LinearGradient>
        </Defs>
        <Path d={arc} stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} strokeLinecap="round" fill="none" />
        <AnimatedPath
          d={arc}
          stroke="url(#gauge)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${length} ${length}`}
          animatedProps={arcProps}
        />
        {ticks.map((t) => (
          <Line
            key={t.key}
            x1={t.x1}
            y1={t.y1}
            x2={t.x2}
            y2={t.y2}
            stroke={t.major ? colors.textDim : colors.textFaint}
            strokeWidth={t.major ? 2 : 1}
            strokeLinecap="round"
          />
        ))}
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
      <Text style={[styles.scale, { left: sx - 10, top: sy + 6 }]}>0</Text>
      <Text style={[styles.scale, { left: ex - 18, top: ey + 6 }]}>{Math.round(max)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingBottom: 12 },
  scale: { position: 'absolute', fontFamily: fonts.semibold, fontSize: 12, color: colors.textFaint },
});
