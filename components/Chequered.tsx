import { useId } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, Pattern, Rect } from 'react-native-svg';

/** Chequered-flag pattern filling its box. */
export function Chequered({
  height,
  cell = 8,
  color = '#FFFFFF',
  opacity = 1,
  style,
}: {
  height: number;
  cell?: number;
  color?: string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const id = `chq${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height={height} style={style} pointerEvents="none">
      <Defs>
        <Pattern id={id} width={cell * 2} height={cell * 2} patternUnits="userSpaceOnUse">
          <Rect x={0} y={0} width={cell} height={cell} fill={color} />
          <Rect x={cell} y={cell} width={cell} height={cell} fill={color} />
        </Pattern>
      </Defs>
      <Rect width="100%" height={height} fill={`url(#${id})`} opacity={opacity} />
    </Svg>
  );
}
