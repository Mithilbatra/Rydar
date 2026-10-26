import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityIcon } from '@/components/ActivityIcon';
import { AreaChart } from '@/components/AreaChart';
import { Chequered } from '@/components/Chequered';
import { Glass } from '@/components/Glass';
import { GradientButton } from '@/components/GradientButton';
import { RaceTag } from '@/components/RaceTag';
import { RouteMap } from '@/components/RouteMap';
import { Stat } from '@/components/Stat';
import { Tile } from '@/components/Tile';
import { useSettings } from '@/hooks/useSettings';
import { ACTIVITIES } from '@/lib/activities';
import { colors, fonts, radius, space, type } from '@/lib/theme';
import { deleteRide, getRide, getWaypoints, listRides, setRidePublic, syncPendingRides } from '@/services/rides';
import type { LatLng, Ride, RideListItem, Waypoint } from '@/types';
import {
  fmtDistance,
  fmtElevation,
  fmtSpeed,
  formatDuration,
  formatRideDate,
  joinMeasure,
  mpsToKmh,
  rideTitle,
} from '@/utils/format';
import { decodePolyline, samplePoints } from '@/utils/polyline';
import { bests } from '@/utils/stats';

const MAP_HEIGHT = 400;
const ELEVATION_COLOR = '#6FA8FF';

/** Ride summary (right after stopping: save or discard) and ride details share this screen. */
export function RideView({ id, mode }: { id: string; mode: 'summary' | 'details' }) {
  const { settings } = useSettings();
  const units = settings.units;
  const insets = useSafeAreaInsets();
  const [ride, setRide] = useState<Ride | null | undefined>(undefined);
  const [points, setPoints] = useState<Waypoint[]>([]);
  const [allRides, setAllRides] = useState<RideListItem[]>([]);

  useEffect(() => {
    Promise.all([getRide(id), getWaypoints(id), listRides()]).then(([r, p, all]) => {
      setRide(r);
      setPoints(p);
      setAllRides(all);
    });
  }, [id]);

  if (ride === undefined) return <View style={styles.screen} />;
  if (ride === null) {
    return (
      <View style={[styles.screen, styles.missing]}>
        <Text style={type.heading}>This ride no longer exists</Text>
        <GradientButton label="Go back" variant="ghost" onPress={() => router.back()} style={styles.missingButton} />
      </View>
    );
  }

  const activity = ACTIVITIES[ride.activityType];
  // Local rides have their points, so pauses show as gaps. Rides pulled from the cloud only have the polyline.
  const route = points.length > 0 ? splitBySegment(points) : [decodePolyline(ride.routePolyline)];
  const speeds = samplePoints(points, 120).map((p) => Number(fmtSpeed(mpsToKmh(p.speed ?? 0), units).value));
  const altitudes = samplePoints(
    points.filter((p) => p.altitude != null),
    120,
  ).map((p) => (units === 'imperial' ? (p.altitude ?? 0) * 3.28084 : (p.altitude ?? 0)));
  const badges = recordBadges(ride, allRides);

  const distance = fmtDistance(ride.distanceKm, units);
  const avg = fmtSpeed(ride.avgSpeedKmh, units);
  const max = fmtSpeed(ride.maxSpeedKmh, units);
  const elevation = fmtElevation(ride.elevationGainM, units);

  const togglePublic = (value: boolean) => {
    setRide({ ...ride, isPublic: value });
    setRidePublic(ride.id, value);
  };

  const save = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    syncPendingRides().catch(() => {}); // stays queued when offline
    router.back();
  };

  const discard = () =>
    Alert.alert('Discard this ride?', 'The route and all stats will be deleted.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await deleteRide(ride.id);
          router.back();
        },
      },
    ]);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: (mode === 'summary' ? 170 : 40) + insets.bottom }}
        showsVerticalScrollIndicator={false}>
        <View style={{ height: MAP_HEIGHT }}>
          <RouteMap route={route} accent={activity.accent} interactive={false} bottomInset={60} style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['transparent', colors.bg]} style={styles.mapFade} pointerEvents="none" />
          {/* The finish line. */}
          <Chequered height={18} cell={9} opacity={0.85} style={styles.finishLine} />
        </View>

        <View style={styles.content}>
          <View style={styles.metaRow}>
            <RaceTag
              label={activity.label}
              color={activity.accent}
              small
              icon={<ActivityIcon type={ride.activityType} size={14} color={colors.bg} />}
            />
            <Text style={type.caption}>{formatRideDate(ride.startedAt)}</Text>
          </View>
          <Text style={type.title}>{rideTitle(ride.startedAt, ride.activityType)}</Text>

          <View style={styles.hero}>
            <Text style={[styles.heroValue, { color: activity.accent }]} adjustsFontSizeToFit numberOfLines={1}>
              {distance.value}
            </Text>
            <Text style={styles.heroUnit}>{distance.unit}</Text>
          </View>

          {badges.length > 0 && (
            <View style={styles.badges}>
              {badges.map((b) => (
                <RaceTag
                  key={b}
                  label={b}
                  color={colors.record}
                  textColor={colors.text}
                  small
                  icon={<Ionicons name="trophy" size={12} color={colors.text} />}
                />
              ))}
            </View>
          )}

          <View style={styles.grid}>
            <Tile accent={colors.text} style={styles.cell}>
              <Stat label="Moving time" value={formatDuration(ride.durationSeconds)} />
            </Tile>
            <Tile accent={ELEVATION_COLOR} style={styles.cell}>
              <Stat label="Elevation gain" value={elevation.value} unit={elevation.unit} />
            </Tile>
            <Tile accent={activity.accent} style={styles.cell}>
              <Stat label="Avg speed" value={avg.value} unit={avg.unit} />
            </Tile>
            <Tile accent={badges.includes('Top speed') ? colors.record : activity.accent} style={styles.cell}>
              <Stat
                label="Top speed"
                value={max.value}
                unit={max.unit}
                color={badges.includes('Top speed') ? colors.record : colors.text}
              />
            </Tile>
            <Tile accent={badges.includes('Max lean') ? colors.record : colors.warning} style={styles.cell}>
              <Stat
                label="Max lean (est.)"
                value={`${Math.round(ride.maxLeanDeg)}°`}
                color={badges.includes('Max lean') ? colors.record : colors.text}
              />
            </Tile>
          </View>

          {speeds.length > 3 && (
            <View style={styles.card}>
              <View style={styles.chartHead}>
                <Text style={type.label}>Speed</Text>
                <Text style={type.caption}>
                  avg {joinMeasure(avg)} · max {joinMeasure(max)}
                </Text>
              </View>
              <AreaChart values={speeds} color={activity.accent} />
            </View>
          )}
          {altitudes.length > 3 && (
            <View style={styles.card}>
              <View style={styles.chartHead}>
                <Text style={type.label}>Elevation</Text>
                <Text style={type.caption}>
                  {Math.round(Math.min(...altitudes))}–{Math.round(Math.max(...altitudes))} {elevation.unit}
                </Text>
              </View>
              <AreaChart values={altitudes} color={ELEVATION_COLOR} />
            </View>
          )}

          <View style={[styles.card, styles.visibility]}>
            <Ionicons name={ride.isPublic ? 'globe-outline' : 'lock-closed'} size={22} color={colors.text} />
            <View style={styles.visibilityText}>
              <Text style={styles.visibilityTitle}>{ride.isPublic ? 'Public ride' : 'Private ride'}</Text>
              <Text style={type.caption}>{ride.isPublic ? 'Others can see this ride' : 'Only you can see this ride'}</Text>
            </View>
            <Switch
              value={ride.isPublic}
              onValueChange={togglePublic}
              trackColor={{ true: activity.accent, false: colors.surfaceRaised }}
              thumbColor={colors.text}
              accessibilityLabel="Public ride"
            />
          </View>
        </View>
      </ScrollView>

      <LinearGradient
        colors={[colors.bg, 'transparent']}
        style={[styles.topFade, { height: insets.top + 72 }]}
        pointerEvents="none"
      />
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        {mode === 'details' ? (
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
            <Glass style={styles.roundButton}>
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Glass>
          </Pressable>
        ) : (
          <RaceTag
            label="Chequered flag"
            color={colors.text}
            icon={<MaterialCommunityIcons name="flag-checkered" size={16} color={colors.bg} />}
          />
        )}
      </View>

      {mode === 'summary' && (
        <LinearGradient
          colors={['transparent', colors.bg, colors.bg]}
          style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
          <GradientButton
            label="Save ride"
            gradient={activity.gradient}
            onPress={save}
            icon={<Ionicons name="checkmark" size={22} color={colors.bg} />}
          />
          <GradientButton label="Discard" variant="danger" onPress={discard} />
        </LinearGradient>
      )}
    </View>
  );
}

function splitBySegment(points: Waypoint[]): LatLng[][] {
  const out: LatLng[][] = [];
  let segment = -1;
  for (const p of points) {
    if (p.segment !== segment) {
      out.push([]);
      segment = p.segment;
    }
    out[out.length - 1].push({ latitude: p.latitude, longitude: p.longitude });
  }
  return out;
}

function recordBadges(ride: Ride, all: RideListItem[]): string[] {
  const label = ACTIVITIES[ride.activityType].label.toLowerCase();
  const sameType = all.filter((r) => r.activityType === ride.activityType);
  if (sameType.length <= 1) return [`First ${label} ride`];
  const b = bests(all, ride.activityType);
  return [
    b.longest?.id === ride.id && `Longest ${label} ride`,
    b.fastest?.id === ride.id && 'Top speed',
    b.biggestClimb?.id === ride.id && 'Biggest climb',
    b.longestTime?.id === ride.id && 'Longest time',
    b.maxLean?.id === ride.id && 'Max lean',
  ].filter((x): x is string => typeof x === 'string');
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  missing: { alignItems: 'center', justifyContent: 'center', gap: space.xl, padding: space.xl },
  missingButton: { alignSelf: 'stretch' },
  mapFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 140 },
  finishLine: { position: 'absolute', left: 0, right: 0, bottom: 44 },
  content: { marginTop: -20, paddingHorizontal: space.xl, gap: space.md },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hero: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: -4 },
  heroValue: { fontFamily: fonts.black, fontSize: 112, lineHeight: 118, fontVariant: ['tabular-nums'] },
  heroUnit: { fontFamily: fonts.displayItalic, fontSize: 30, color: colors.textDim, textTransform: 'uppercase' },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { flexGrow: 1, flexBasis: '45%', paddingVertical: space.lg },
  card: {
    padding: space.lg,
    gap: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chartHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  visibility: { flexDirection: 'row', alignItems: 'center' },
  visibilityText: { flex: 1, gap: 2 },
  visibilityTitle: { fontFamily: fonts.displayItalic, fontSize: 18, color: colors.text, textTransform: 'uppercase' },
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row' },
  roundButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.xl, paddingTop: 40, gap: 10 },
});
