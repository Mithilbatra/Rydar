import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityToggle } from '@/components/ActivityToggle';
import { Bars } from '@/components/Bars';
import { GradientButton } from '@/components/GradientButton';
import { RideCard } from '@/components/RideCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { StartButton } from '@/components/StartButton';
import { useAuth } from '@/hooks/useAuth';
import { useRides } from '@/hooks/useRides';
import { useSettings } from '@/hooks/useSettings';
import { ACTIVITIES } from '@/lib/activities';
import { colors, fonts, radius, space, type } from '@/lib/theme';
import { deleteRide, finishInterruptedRide, getInterruptedRide } from '@/services/rides';
import type { RideListItem } from '@/types';
import { fmtDistance, formatDurationShort } from '@/utils/format';
import { dailyDistance, inRange, percentChange, previousWeek, startOfWeek, totals } from '@/utils/stats';

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function greeting(hour: number) {
  if (hour < 5) return 'Night owl';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function Home() {
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const { session } = useAuth();
  const rides = useRides();
  const [interrupted, setInterrupted] = useState<RideListItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      getInterruptedRide().then(setInterrupted);
    }, []),
  );

  const activity = settings.lastActivity;
  const { accent, label } = ACTIVITIES[activity];
  const now = Date.now();
  const own = (rides ?? []).filter((r) => r.activityType === activity);
  const week = startOfWeek(now);
  const thisWeek = totals(inRange(own, week, Infinity));
  const lastWeek = totals(inRange(own, previousWeek(week), week));
  const change = percentChange(thisWeek.distanceKm, lastWeek.distanceKm);
  const weekDistance = fmtDistance(thisWeek.distanceKm, settings.units);
  const today = (new Date(now).getDay() + 6) % 7;
  const name = session?.user.email?.split('@')[0];

  const finishInterrupted = async (id: string) => {
    await finishInterruptedRide(id);
    router.push({ pathname: '/ride/summary/[id]', params: { id } });
  };

  const discardInterrupted = (id: string) =>
    Alert.alert('Discard the unfinished ride?', 'Its route and points will be deleted.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: async () => {
          await deleteRide(id);
          setInterrupted(null);
        },
      },
    ]);

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[`${accent}2E`, 'transparent']} style={styles.glow} pointerEvents="none" />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 110 }]}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          eyebrow={name ? `${greeting(new Date(now).getHours())}, ${name}` : greeting(new Date(now).getHours())}
          title="Ready to ride?"
        />
        <ActivityToggle value={activity} onChange={(v) => update({ lastActivity: v })} />

        {interrupted ? (
          <View style={styles.interrupted}>
            <View style={styles.interruptedHead}>
              <Ionicons name="warning" size={22} color={colors.warning} />
              <View style={styles.flex}>
                <Text style={type.heading}>Unfinished ride</Text>
                <Text style={type.caption}>
                  Rydar closed while you were riding (started{' '}
                  {new Date(interrupted.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}). Every
                  point up to then is saved.
                </Text>
              </View>
            </View>
            <GradientButton
              label="Resume ride"
              gradient={ACTIVITIES[interrupted.activityType].gradient}
              onPress={() => router.push({ pathname: '/ride/track', params: { resume: interrupted.id } })}
            />
            <View style={styles.row}>
              <GradientButton label="Finish" variant="ghost" onPress={() => finishInterrupted(interrupted.id)} style={styles.flex} />
              <GradientButton label="Discard" variant="danger" onPress={() => discardInterrupted(interrupted.id)} style={styles.flex} />
            </View>
          </View>
        ) : (
          <View style={styles.start}>
            <StartButton
              activity={activity}
              onPress={() => router.push({ pathname: '/ride/track', params: { activity } })}
            />
            <Text style={styles.hint}>Keep Rydar open while you ride. The screen stays on.</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={type.label}>This week · {label}</Text>
            {change != null && (
              <View style={[styles.delta, { backgroundColor: change >= 0 ? `${colors.success}1A` : `${colors.danger}1A` }]}>
                <Ionicons
                  name={change >= 0 ? 'trending-up' : 'trending-down'}
                  size={14}
                  color={change >= 0 ? colors.success : colors.danger}
                />
                <Text style={[styles.deltaText, { color: change >= 0 ? colors.success : colors.danger }]}>
                  {Math.abs(Math.round(change))}%
                </Text>
              </View>
            )}
          </View>
          <View style={styles.weekRow}>
            <Text style={styles.weekValue}>
              {weekDistance.value}
              <Text style={styles.weekUnit}> {weekDistance.unit}</Text>
            </Text>
            <View style={styles.weekSide}>
              <Text style={styles.sideValue}>{thisWeek.count}</Text>
              <Text style={type.caption}>{thisWeek.count === 1 ? 'ride' : 'rides'}</Text>
            </View>
            <View style={styles.weekSide}>
              <Text style={styles.sideValue}>{formatDurationShort(thisWeek.durationSeconds)}</Text>
              <Text style={type.caption}>moving</Text>
            </View>
          </View>
          <Bars values={dailyDistance(own, now)} labels={DAY_LABELS} color={accent} highlight={today} height={64} />
        </View>

        {own[0] && (
          <View style={styles.section}>
            <Text style={type.label}>Last {label.toLowerCase()} ride</Text>
            <RideCard ride={own[0]} units={settings.units} showSync={session != null} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  glow: { position: 'absolute', top: 0, left: 0, right: 0, height: 520 },
  content: { paddingHorizontal: space.xl, gap: space.xl },
  flex: { flex: 1 },
  row: { flexDirection: 'row', gap: space.md },
  start: { alignItems: 'center', marginVertical: -space.lg },
  hint: { ...StyleSheet.flatten(type.caption), textAlign: 'center', marginTop: -space.md },
  interrupted: {
    gap: space.md,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: 'rgba(255,197,61,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,197,61,0.3)',
  },
  interruptedHead: { flexDirection: 'row', gap: space.md },
  card: {
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  delta: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 24, borderRadius: radius.pill },
  deltaText: { fontFamily: fonts.semibold, fontSize: 13 },
  weekRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.xl },
  weekValue: { flex: 1, fontFamily: fonts.displayItalic, fontSize: 56, lineHeight: 60, color: colors.text },
  weekUnit: { fontFamily: fonts.display, fontSize: 22, color: colors.textDim },
  weekSide: { alignItems: 'flex-end', paddingBottom: 6 },
  sideValue: { fontFamily: fonts.display, fontSize: 22, color: colors.text },
  section: { gap: space.md },
});
