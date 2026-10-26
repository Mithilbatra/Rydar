import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ActivityIcon } from '@/components/ActivityIcon';
import { colors, radius } from '@/lib/theme';
import type { ActivityType } from '@/types';
import { decodePolyline, routeToSvgPath } from '@/utils/polyline';

/** The route's shape drawn as a small neon line, no map tiles needed. */
export function RouteGlyph({
  preview,
  activity,
  color,
  size = 64,
}: {
  preview: string;
  activity: ActivityType;
  color: string;
  size?: number;
}) {
  const d = routeToSvgPath(decodePolyline(preview), size, 10);
  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {d ? (
        <Svg width={size} height={size}>
          <Path d={d} stroke={`${color}40`} strokeWidth={7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d={d} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : (
        <ActivityIcon type={activity} size={size * 0.42} color={color} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderRadius: radius.md,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
