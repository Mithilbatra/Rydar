import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Glass } from '@/components/Glass';
import { GradientButton } from '@/components/GradientButton';
import { HoldButton } from '@/components/HoldButton';
import { RaceTag } from '@/components/RaceTag';
import { RevBar } from '@/components/RevBar';
import { RouteMap } from '@/components/RouteMap';
import { StartLights } from '@/components/StartLights';
import { Stat } from '@/components/Stat';
import { Tile } from '@/components/Tile';
import { useRideTracker } from '@/hooks/useRideTracker';
import { useSettings } from '@/hooks/useSettings';
import { ACTIVITIES } from '@/lib/activities';
import { colors, fonts, radius, space, type } from '@/lib/theme';
import { listRides } from '@/services/rides';
import type { ActivityType } from '@/types';
import { avgSpeedKmh, fmtDistance, fmtElevation, fmtSpeed, formatDuration, kmToMiles, mpsToKmh } from '@/utils/format';
import { bests } from '@/utils/stats';

const CONTROL_SIZE = 84;

export default function Track() {
  useKeepAwake();
  const params = useLocalSearchParams<{ activity?: string; resume?: string }>();
  const tracker = useRideTracker();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [stopping, setStopping] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  // A resumed ride skips the start lights.
  const [lightsOut, setLightsOut] = useState(Boolean(params.resume));
  const [bestTopSpeedKmh, setBestTopSpeedKmh] = useState<number | null>(null);
  const started = useRef(false);

  const { state, phase } = tracker;
  const activity: ActivityType = state?.activity ?? (params.activity === 'motorbike' ? 'motorbike' : 'bicycle');
  const config = ACTIVITIES[activity];
  const units = settings.units;

  useEffect(() => {
    if (params.resume && !started.current) {
      started.current = true;
      tracker.recover(params.resume);
    }
  });

  // The previous top speed for this activity, so a new record lights up purple as it happens.
  useEffect(() => {
    listRides().then((rides) => setBestTopSpeedKmh(bests(rides, activity).fastest?.maxSpeedKmh ?? null));
  }, [activity]);

  // Android back button must not drop a live ride; finishing is done with the hold button.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const go = () => {
    setLightsOut(true);
    if (started.current) return;
    started.current = true;
    tracker.begin(activity);
  };

  if (phase === 'denied') {
    return (
      <View style={[styles.screen, styles.denied, { paddingTop: insets.top, paddingBottom: insets.bottom + space.xl }]}>
        <View style={styles.deniedIcon}>
          <Ionicons name="location-outline" size={44} color={config.accent} />
        </View>
        <Text style={[type.title, styles.centerText]}>Location is off</Text>
        <Text style={[type.body, styles.centerText, styles.dim]}>
          Rydar needs your location to draw the route and measure distance and speed. Allow it in Settings, then start
          again.
        </Text>
        <GradientButton label="Open Settings" gradient={config.gradient} onPress={() => Linking.openSettings()} style={styles.wide} />
        <GradientButton label="Not now" variant="ghost" onPress={() => router.back()} style={styles.wide} />
      </View>
    );
  }

  const paused = state?.status === 'paused';
  const distanceKm = (state?.distanceM ?? 0) / 1000;
  const elapsed = tracker.elapsedSeconds;
  const speedKmh = mpsToKmh(tracker.currentSpeedMs);
  const speed = fmtSpeed(speedKmh, units, 0);
  const scaleMax = units === 'imperial' ? kmToMiles(config.gaugeMaxKmh) : config.gaugeMaxKmh;
  const distance = fmtDistance(distanceKm, units);
  const avg = fmtSpeed(avgSpeedKmh(distanceKm, elapsed), units);
  const topKmh = mpsToKmh(state?.maxSpeedMs ?? 0);
  const top = fmtSpeed(topKmh, units);
  const newRecord = bestTopSpeedKmh != null && topKmh > bestTopSpeedKmh;
  const elevation = fmtElevation(state?.elevationGainM ?? 0, units);
  const speedSize = Math.min(128, height * 0.15);

  const stop = async () => {
    setStopping(true);
    try {
      const id = await tracker.stop();
      if (id) router.replace({ pathname: '/ride/summary/[id]', params: { id } });
      else router.back();
    } catch (e) {
      // Every point is already on the phone, so the ride shows up as unfinished on Home and can be finished there.
      Alert.alert('Could not finish the ride', e instanceof Error ? e.message : String(e), [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  };

  return (
    <View style={styles.screen}>
      <RouteMap route={state?.route ?? [[]]} accent={config.accent} live bottomInset={panelHeight - 24} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(8,8,10,0.9)', 'transparent']} style={[styles.topFade, { height: insets.top + 90 }]} pointerEvents="none" />

      <View style={[styles.topBar, { top: insets.top + 10 }]}>
        {state?.status === 'stopped' ? (
          <RaceTag
            label="Chequered flag"
            color={colors.text}
            icon={<MaterialCommunityIcons name="flag-checkered" size={14} color={colors.bg} />}
          />
        ) : paused ? (
          <RaceTag label="Yellow flag · paused" color={colors.warning} icon={<Ionicons name="flag" size={13} color={colors.bg} />} />
        ) : state ? (
          <RaceTag label="Live" color={colors.race} textColor={colors.text} icon={<PulseDot />} />
        ) : (
          <RaceTag label="On the grid" color={colors.textDim} solid={false} />
        )}
        <RaceTag
          label={state?.lastFixAt != null ? 'GPS' : 'Finding GPS'}
          color={colors.success}
          solid={false}
          icon={<GpsBars accuracy={state?.lastAccuracy ?? null} active={state?.lastFixAt != null} />}
        />
      </View>

      <Glass style={[styles.panel, { paddingBottom: insets.bottom + space.lg }]} onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}>
        <View style={[styles.stripe, { backgroundColor: config.accent }]} />
        <View style={paused && styles.dimmed}>
          <RevBar value={Number(speed.value)} max={scaleMax} />
          <View style={styles.speedRow}>
            <Text
              style={[styles.speed, { fontSize: speedSize, lineHeight: speedSize * 1.02 }]}
              accessibilityLabel={`Speed ${speed.value} ${speed.unit}`}>
              {speed.value}
            </Text>
            <View style={styles.speedSide}>
              <Text style={styles.speedUnit}>{speed.unit}</Text>
              <RaceTag label={config.label} color={config.accent} small />
            </View>
          </View>
        </View>

        <View style={styles.tiles}>
          <Tile accent={colors.text} style={styles.flex}>
            <Stat label="Ride time" value={formatDuration(elapsed)} size="lg" />
          </Tile>
          <Tile accent={config.accent} style={styles.flex}>
            <Stat label="Distance" value={distance.value} unit={distance.unit} size="lg" color={config.accent} />
          </Tile>
        </View>
        <View style={styles.tiles}>
          <Tile style={styles.flex}>
            <Stat label="Avg" value={avg.value} unit={avg.unit} size="sm" />
          </Tile>
          <Tile accent={newRecord ? colors.record : undefined} style={styles.flex}>
            <Stat
              label={newRecord ? 'Record' : 'Top speed'}
              value={top.value}
              unit={top.unit}
              size="sm"
              color={newRecord ? colors.record : colors.text}
            />
          </Tile>
          <Tile style={styles.flex}>
            <Stat label="Climb" value={elevation.value} unit={elevation.unit} size="sm" />
          </Tile>
        </View>

        {tracker.gpsError && <Text style={styles.gpsError}>GPS problem: {tracker.gpsError}</Text>}

        <View style={styles.controls}>
          {stopping || !state ? (
            <ActivityIndicator color={config.accent} size="large" style={{ height: CONTROL_SIZE }} />
          ) : (
            <>
              <View style={styles.controlWrap}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={paused ? 'Resume ride' : 'Pause ride'}
                  onPress={paused ? tracker.resume : tracker.pause}
                  style={({ pressed }) => [styles.control, pressed && styles.pressed]}>
                  {state?.status === 'stopped' ? (
          <RaceTag
            label="Chequered flag"
            color={colors.text}
            icon={<MaterialCommunityIcons name="flag-checkered" size={14} color={colors.bg} />}
          />
        ) : paused ? (
                    <LinearGradient colors={config.gradient} style={styles.controlFill}>
                      <Ionicons name="play" size={34} color={colors.bg} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.controlFill, styles.pauseFill]}>
                      <Ionicons name="pause" size={34} color={colors.warning} />
                    </View>
                  )}
                </Pressable>
                <Text style={styles.controlLabel}>{paused ? 'Resume' : 'Pause'}</Text>
              </View>
              <HoldButton
                label="Hold to finish"
                color={colors.danger}
                size={CONTROL_SIZE}
                onComplete={stop}
                icon={<MaterialCommunityIcons name="flag-checkered" size={34} color={colors.text} />}
              />
            </>
          )}
        </View>
      </Glass>

      {!lightsOut && <StartLights accent={config.accent} onDone={go} />}
    </View>
  );
}

function PulseDot() {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(withRepeat(withTiming(0.25, { duration: 700 }), -1, true));
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[styles.pulseDot, style]} />;
}

/** Signal bars from the GPS accuracy radius: under 10 m is strong, over 20 m is weak. */
function GpsBars({ accuracy, active }: { accuracy: number | null; active: boolean }) {
  const level = !active || accuracy == null ? 0 : accuracy <= 10 ? 3 : accuracy <= 20 ? 2 : 1;
  const color = level === 3 ? colors.success : level === 2 ? colors.warning : colors.danger;
  return (
    <View style={styles.bars} accessibilityLabel={`GPS signal ${['searching', 'weak', 'fair', 'strong'][level]}`}>
      {[1, 2, 3].map((b) => (
        <View key={b} style={[styles.bar, { height: 4 + b * 3, backgroundColor: b <= level ? color : colors.textFaint }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  pulseDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.text },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 3, borderRadius: 1 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: space.lg,
    paddingHorizontal: space.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: space.md,
  },
  stripe: { position: 'absolute', top: 0, left: space.xl, right: space.xl, height: 3, borderRadius: 2 },
  dimmed: { opacity: 0.45 },
  speedRow: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, marginTop: space.xs },
  speed: { fontFamily: fonts.black, color: colors.text, fontVariant: ['tabular-nums'], includeFontPadding: false },
  speedSide: { paddingBottom: space.lg, gap: space.sm },
  speedUnit: { fontFamily: fonts.displayItalic, fontSize: 22, color: colors.textDim, letterSpacing: 1.5, textTransform: 'uppercase' },
  tiles: { flexDirection: 'row', gap: space.md },
  gpsError: { color: colors.warning, fontSize: 13, textAlign: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingTop: space.xs },
  controlWrap: { alignItems: 'center', gap: 8 },
  control: { width: CONTROL_SIZE, height: CONTROL_SIZE, borderRadius: CONTROL_SIZE / 2, overflow: 'hidden' },
  controlFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pauseFill: { backgroundColor: 'rgba(255,214,10,0.12)', borderWidth: 2, borderColor: 'rgba(255,214,10,0.5)', borderRadius: CONTROL_SIZE / 2 },
  controlLabel: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 1.4, color: colors.textDim, textTransform: 'uppercase' },
  pressed: { transform: [{ scale: 0.95 }] },
  denied: { alignItems: 'center', justifyContent: 'center', gap: space.lg, paddingHorizontal: space.xl },
  deniedIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    marginBottom: space.md,
  },
  centerText: { textAlign: 'center' },
  dim: { color: colors.textDim, lineHeight: 22 },
  wide: { alignSelf: 'stretch' },
});
