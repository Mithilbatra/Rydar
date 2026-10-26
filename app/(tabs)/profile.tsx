import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityFilter, matchesFilter, type ActivityFilterValue } from '@/components/ActivityFilter';
import { ActivityIcon } from '@/components/ActivityIcon';
import { Bars } from '@/components/Bars';
import { NumberPlate } from '@/components/NumberPlate';
import { RaceTag } from '@/components/RaceTag';
import { Stat } from '@/components/Stat';
import { Tile } from '@/components/Tile';
import { useAuth } from '@/hooks/useAuth';
import { useRides } from '@/hooks/useRides';
import { useSettings } from '@/hooks/useSettings';
import { ACTIVITIES, ACTIVITY_TYPES } from '@/lib/activities';
import { colors, fonts, radius, space, type } from '@/lib/theme';
import type { RideListItem, UnitSystem } from '@/types';
import {
  fmtDistance,
  fmtElevation,
  fmtSpeed,
  formatDurationShort,
  joinMeasure,
} from '@/utils/format';
import {
  bests,
  inRange,
  percentChange,
  previousWeek,
  startOfMonth,
  startOfWeek,
  totals,
  weekStreak,
  weeklyDistance,
} from '@/utils/stats';

const EARTH_KM = 40_075;

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { settings } = useSettings();
  const units = settings.units;
  const rides = useRides() ?? [];
  const [filter, setFilter] = useState<ActivityFilterValue>('all');

  const shown = rides.filter(matchesFilter(filter));
  const accent = filter === 'all' ? colors.text : ACTIVITIES[filter].accent;
  const riderColor = ACTIVITIES[settings.lastActivity].accent;
  const now = Date.now();
  const week = startOfWeek(now);
  const month = startOfMonth(now);
  const all = totals(shown);
  const thisWeek = totals(inRange(shown, week, Infinity));
  const lastWeek = totals(inRange(shown, previousWeek(week), week));
  const thisMonth = totals(inRange(shown, month, Infinity));
  const lastMonth = totals(inRange(shown, startOfMonth(now, -1), month));
  const weeks = weeklyDistance(shown, 12, now);
  const streak = weekStreak(shown, now);
  const email = session?.user.email;
  const firstRide = shown.at(-1);
  const distance = fmtDistance(all.distanceKm, units);
  const elevation = fmtElevation(all.elevationGainM, units);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 110 }]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.identity}>
        <NumberPlate number={settings.raceNumber} color={riderColor} size={64} />
        <View style={styles.flex}>
          <RaceTag label="Rider profile" color={riderColor} solid={false} small />
          <Text style={type.title} numberOfLines={1}>
            {email ? email.split('@')[0] : 'Guest rider'}
          </Text>
          <Text style={type.caption}>
            {firstRide
              ? `Riding since ${new Date(firstRide.startedAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`
              : 'No rides yet'}
          </Text>
        </View>
      </View>

      <ActivityFilter value={filter} onChange={setFilter} />

      <View style={styles.hero}>
        <RaceTag label="All-time distance" color={filter === 'all' ? colors.race : accent} small />
        <Text style={[styles.heroValue, { color: accent }]}>
          {distance.value}
          <Text style={styles.heroUnit}> {distance.unit}</Text>
        </Text>
        <Text style={type.caption}>
          {all.distanceKm > 0
            ? `That's ${((all.distanceKm / EARTH_KM) * 100).toFixed(all.distanceKm < 400 ? 2 : 1)}% of the way around the Earth.`
            : 'Your first ride starts the count.'}
        </Text>
      </View>

      <View style={styles.grid}>
        <Tile accent={colors.text} style={styles.cell}>
          <Stat label="Rides" value={String(all.count)} />
        </Tile>
        <Tile accent={colors.text} style={styles.cell}>
          <Stat label="Moving time" value={formatDurationShort(all.durationSeconds)} />
        </Tile>
        <Tile accent="#6FA8FF" style={styles.cell}>
          <Stat label="Climbed" value={elevation.value} unit={elevation.unit} />
        </Tile>
        <Tile accent={colors.warning} style={styles.cell}>
          <Stat label="Week streak" value={String(streak)} unit={streak === 1 ? 'week' : 'weeks'} />
        </Tile>
      </View>

      <View style={styles.row}>
        <PeriodCard title="This week" current={thisWeek.distanceKm} previous={lastWeek.distanceKm} rides={thisWeek.count} units={units} />
        <PeriodCard title="This month" current={thisMonth.distanceKm} previous={lastMonth.distanceKm} rides={thisMonth.count} units={units} />
      </View>

      <View style={styles.card}>
        <RaceTag label="Last 12 weeks" color={filter === 'all' ? colors.race : accent} solid={false} small />
        <Bars
          values={weeks.map((w) => w.km)}
          labels={weeks.map((w, i) =>
            i % 3 === 0 || i === weeks.length - 1
              ? new Date(w.start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
              : '',
          )}
          color={filter === 'all' ? colors.race : accent}
          height={96}
        />
      </View>

      <Text style={[type.heading, styles.recordsTitle]}>Personal records</Text>
      {ACTIVITY_TYPES.filter((t) => filter === 'all' || filter === t).map((t) => (
        <Records key={t} activity={t} rides={rides} units={units} />
      ))}
    </ScrollView>
  );
}

function PeriodCard({
  title,
  current,
  previous,
  rides,
  units,
}: {
  title: string;
  current: number;
  previous: number;
  rides: number;
  units: UnitSystem;
}) {
  const change = percentChange(current, previous);
  const d = fmtDistance(current, units);
  return (
    <Tile style={styles.flex}>
      <Text style={type.label}>{title}</Text>
      <Text style={styles.periodValue}>
        {d.value}
        <Text style={styles.periodUnit}> {d.unit}</Text>
      </Text>
      <Text style={type.caption}>
        {rides} {rides === 1 ? 'ride' : 'rides'}
        {change != null && (
          <Text style={{ color: change >= 0 ? colors.success : colors.danger }}>
            {'  '}
            {change >= 0 ? '▲' : '▼'} {Math.abs(Math.round(change))}%
          </Text>
        )}
      </Text>
    </Tile>
  );
}

/** Records always per activity, so the two never mix. */
function Records({ activity, rides, units }: { activity: (typeof ACTIVITY_TYPES)[number]; rides: RideListItem[]; units: UnitSystem }) {
  const { accent, label } = ACTIVITIES[activity];
  const b = bests(rides, activity);
  const rows: { icon: keyof typeof Ionicons.glyphMap; title: string; ride: RideListItem | null; value: string }[] = [
    { icon: 'resize', title: 'Longest ride', ride: b.longest, value: b.longest ? joinMeasure(fmtDistance(b.longest.distanceKm, units)) : '' },
    { icon: 'speedometer', title: 'Top speed', ride: b.fastest, value: b.fastest ? joinMeasure(fmtSpeed(b.fastest.maxSpeedKmh, units)) : '' },
    { icon: 'trending-up', title: 'Biggest climb', ride: b.biggestClimb, value: b.biggestClimb ? joinMeasure(fmtElevation(b.biggestClimb.elevationGainM, units)) : '' },
    { icon: 'time', title: 'Longest time', ride: b.longestTime, value: b.longestTime ? formatDurationShort(b.longestTime.durationSeconds) : '' },
  ];
  return (
    <View style={styles.card}>
      <RaceTag label={label} color={accent} icon={<ActivityIcon type={activity} size={14} color={colors.bg} />} />
      {rows.map(({ ride, ...row }) =>
        ride ? (
          <Pressable
            key={row.title}
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/ride/[id]', params: { id: ride.id } })}
            style={({ pressed }) => [styles.recordRow, pressed && { opacity: 0.7 }]}>
            <View style={styles.recordMark} />
            <Ionicons name={row.icon} size={18} color={colors.textDim} />
            <Text style={styles.recordTitle}>{row.title}</Text>
            <Text style={[styles.recordValue, { color: colors.record }]}>{row.value}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
          </Pressable>
        ) : (
          <View key={row.title} style={styles.recordRow}>
            <View style={[styles.recordMark, { backgroundColor: colors.surfaceRaised }]} />
            <Ionicons name={row.icon} size={18} color={colors.textFaint} />
            <Text style={[styles.recordTitle, { color: colors.textFaint }]}>{row.title}</Text>
            <Text style={[styles.recordValue, { color: colors.textFaint }]}>—</Text>
          </View>
        ),
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.xl, gap: space.lg },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.md },
  identity: { flexDirection: 'row', alignItems: 'center', gap: space.lg, paddingLeft: space.xs },
  hero: { gap: 6, paddingVertical: space.sm },
  heroValue: { fontFamily: fonts.black, fontSize: 84, lineHeight: 88, fontVariant: ['tabular-nums'] },
  heroUnit: { fontFamily: fonts.displayItalic, fontSize: 28, color: colors.textDim, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { flexGrow: 1, flexBasis: '45%', paddingVertical: space.lg },
  card: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  periodValue: { fontFamily: fonts.black, fontSize: 34, color: colors.text, fontVariant: ['tabular-nums'] },
  periodUnit: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textDim },
  recordsTitle: { marginTop: space.md },
  recordRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 40 },
  // Purple is the timing-screen colour for a best-ever time.
  recordMark: { width: 4, height: 22, borderRadius: 2, backgroundColor: colors.record, transform: [{ skewX: '-12deg' }] },
  recordTitle: { flex: 1, fontSize: 15, color: colors.text },
  recordValue: { fontFamily: fonts.displayItalic, fontSize: 20, color: colors.text, fontVariant: ['tabular-nums'] },
});
