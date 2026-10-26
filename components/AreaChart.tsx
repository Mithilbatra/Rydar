import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

/** Filled line chart for a ride's speed or elevation over time. A flat series draws as a mid-height line. */
export function AreaChart({ values, color, height = 96 }: { values: number[]; color: string; height?: number }) {
  const [width, setWidth] = useState(0);
  const min = Math.min(...values);
  const span = Math.max(...values) - min;
  const points = values.map((v, i) => [
    (i / (values.length - 1)) * width,
    span > 0 ? height - 4 - ((v - min) / span) * (height - 8) : height / 2,
  ]);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const gradientId = `fill${color.replace('#', '')}`;

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }}>
      {width > 0 && values.length > 1 && (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity={0.45} />
              <Stop offset="1" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Path d={`${line} L${width} ${height} L0 ${height} Z`} fill={`url(#${gradientId})`} />
          <Path d={line} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
        </Svg>
      )}
    </View>
  );
}
