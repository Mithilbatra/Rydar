import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActivityIcon } from '@/components/ActivityIcon';
import { RouteGlyph } from '@/components/RouteGlyph';
import { ACTIVITIES } from '@/lib/activities';
import { colors, fonts, radius } from '@/lib/theme';
import type { RideListItem, UnitSystem } from '@/types';
import { fmtDistance, fmtSpeed, formatDurationShort, formatRideDate, joinMeasure, rideTitle } from '@/utils/format';

export function RideCard({ ride, units, showSync }: { ride: RideListItem; units: UnitSystem; showSync?: boolean }) {
  const { accent } = ACTIVITIES[ride.activityType];
  const distance = fmtDistance(ride.distanceKm, units);
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/ride/[id]', params: { id: ride.id } })}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
      accessibilityRole="button">
        <RouteGlyph preview={ride.preview} activity={ride.activityType} color={accent} />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <ActivityIcon type={ride.activityType} size={16} color={accent} />
            <Text style={styles.title} numberOfLines={1}>
              {rideTitle(ride.startedAt, ride.activityType)}
            </Text>
            {showSync && ride.syncedAt == null && (
              <Ionicons name="cloud-offline-outline" size={15} color={colors.textFaint} accessibilityLabel="Not synced yet" />
            )}
          </View>
          <Text style={styles.date}>{formatRideDate(ride.startedAt)}</Text>
          <View style={styles.stats}>
            <Text style={styles.big}>
              {distance.value}
              <Text style={styles.unit}> {distance.unit}</Text>
            </Text>
            <Text style={styles.small}>{formatDurationShort(ride.durationSeconds)}</Text>
            <Text style={styles.small}>{joinMeasure(fmtSpeed(ride.avgSpeedKmh, units))}</Text>
          </View>
        </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  pressed: { opacity: 0.8, transform: [{ scale: 0.99 }] },
  body: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flexShrink: 1, fontFamily: fonts.display, fontSize: 18, color: colors.text, letterSpacing: 0.3 },
  date: { fontSize: 12, color: colors.textDim },
  stats: { flexDirection: 'row', alignItems: 'baseline', gap: 14, marginTop: 4 },
  big: { fontFamily: fonts.display, fontSize: 24, color: colors.text, fontVariant: ['tabular-nums'] },
  unit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.textDim },
  small: { fontFamily: fonts.semibold, fontSize: 15, color: colors.textDim, fontVariant: ['tabular-nums'] },
});
