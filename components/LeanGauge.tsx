import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';

import { MAX_LEAN_DEG } from '@/services/tracker';
import { colors, fonts } from '@/lib/theme';

const W = 124;
const H = 96;
const CX = W / 2;
const GROUND = H - 8;
const R = 58;
const TICKS = [-60, -45, -30, -15, 0, 15, 30, 45, 60];

// Angle measured from vertical, positive to the right.
const point = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [CX + r * Math.sin(a), GROUND - r * Math.cos(a)] as const;
};

const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = point(from, r);
  const [x2, y2] = point(to, r);
  return `M${x1} ${y1} A${r} ${r} 0 0 ${to > from ? 1 : 0} ${x2} ${y2}`;
};

/** On-board style lean graphic: a rear view of the rider tilting over an arc, with the angle. */
export function LeanGauge({ leanDeg, maxLeanDeg, accent }: { leanDeg: number; maxLeanDeg: number; accent: string }) {
  const lean = Math.max(-MAX_LEAN_DEG, Math.min(MAX_LEAN_DEG, leanDeg));
  const side = lean > 1 ? 'R' : lean < -1 ? 'L' : '';
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`Lean ${Math.round(Math.abs(lean))} degrees ${side === 'R' ? 'right' : side === 'L' ? 'left' : ''}`}>
      <Svg width={W} height={H}>
        <Path d={arc(-65, 65, R)} stroke="rgba(255,255,255,0.1)" strokeWidth={6} fill="none" strokeLinecap="round" />
        {Math.abs(lean) > 0.5 && (
          <Path d={arc(0, lean, R)} stroke={accent} strokeWidth={6} fill="none" strokeLinecap="round" />
        )}
        {TICKS.map((t) => {
          const [x1, y1] = point(t, R + 6);
          const [x2, y2] = point(t, R + (t % 30 === 0 ? 13 : 10));
          return <Line key={t} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.textFaint} strokeWidth={1.5} />;
        })}
        {/* Rider seen from behind, pivoting on the tyre's contact patch. */}
        <G transform={`rotate(${lean} ${CX} ${GROUND})`}>
          <Rect x={CX - 5} y={GROUND - 30} width={10} height={30} rx={5} fill={colors.text} />
          <Path d={`M${CX - 11} ${GROUND - 26} L${CX + 11} ${GROUND - 26} L${CX + 7} ${GROUND - 40} L${CX - 7} ${GROUND - 40} Z`} fill={accent} />
          <Line x1={CX - 15} y1={GROUND - 30} x2={CX + 15} y2={GROUND - 30} stroke={colors.text} strokeWidth={3} strokeLinecap="round" />
          <Circle cx={CX} cy={GROUND - 46} r={7} fill={colors.text} />
        </G>
      </Svg>
      <View style={styles.readout}>
        <Text style={styles.value}>
          {Math.round(Math.abs(lean))}°<Text style={[styles.side, { color: accent }]}>{side}</Text>
        </Text>
        <Text style={styles.max}>MAX {Math.round(maxLeanDeg)}°</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: W, alignItems: 'center' },
  readout: { alignItems: 'center', marginTop: -2 },
  value: { fontFamily: fonts.black, fontSize: 26, lineHeight: 28, color: colors.text, fontVariant: ['tabular-nums'] },
  side: { fontFamily: fonts.displayItalic, fontSize: 18 },
  max: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 1.2, color: colors.textDim },
});
