import { Ionicons } from '@expo/vector-icons';
import { useKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityIcon } from '@/components/ActivityIcon';
import { Glass } from '@/components/Glass';
import { GradientButton } from '@/components/GradientButton';
import { HoldButton } from '@/components/HoldButton';
import { RouteMap } from '@/components/RouteMap';
import { SpeedGauge } from '@/components/SpeedGauge';
import { Stat } from '@/components/Stat';
import { useRideTracker } from '@/hooks/useRideTracker';
import { useSettings } from '@/hooks/useSettings';
import { ACTIVITIES } from '@/lib/activities';
import { colors, fonts, radius, space, type } from '@/lib/theme';
import type { ActivityType } from '@/types';
import { avgSpeedKmh, fmtDistance, fmtElevation, fmtSpeed, formatDuration, kmToMiles, mpsToKmh } from '@/utils/format';

const CONTROL_SIZE = 88;

export default function Track() {
  useKeepAwake();
  const params = useLocalSearchParams<{ activity?: string; resume?: string }>();
  const tracker = useRideTracker();
  const { settings } = useSettings();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [stopping, setStopping] = useState(false);
  const [panelHeight, setPanelHeight] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (params.resume) tracker.recover(params.resume);
    else tracker.begin(params.activity === 'motorbike' ? 'motorbike' : 'bicycle');
  });

  // Android back button must not drop a live ride; finishing is done with the hold button.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  const { state, phase } = tracker;
  const activity: ActivityType = state?.activity ?? (params.activity === 'motorbike' ? 'motorbike' : 'bicycle');
  const config = ACTIVITIES[activity];
  const units = settings.units;

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
  const speed = fmtSpeed(mpsToKmh(tracker.currentSpeedMs), units, 0);
  const gaugeMax = units === 'imperial' ? kmToMiles(config.gaugeMaxKmh) : config.gaugeMaxKmh;
  const distance = fmtDistance(distanceKm, units);
  const avg = fmtSpeed(avgSpeedKmh(distanceKm, elapsed), units);
  const max = fmtSpeed(mpsToKmh(state?.maxSpeedMs ?? 0), units);
  const elevation = fmtElevation(state?.elevationGainM ?? 0, units);
  const gaugeSize = Math.min(250, height * 0.29);

  const stop = async () => {
    setStopping(true);
    const id = await tracker.stop();
    if (id) router.replace({ pathname: '/ride/summary/[id]', params: { id } });
    else router.back();
  };

  return (
    <View style={styles.screen}>
      <RouteMap route={state?.route ?? [[]]} accent={config.accent} live bottomInset={panelHeight - 24} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={['rgba(7,8,11,0.85)', 'transparent']} style={[styles.topFade, { height: insets.top + 90 }]} pointerEvents="none" />

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <Glass style={styles.statusPill}>
          {paused ? (
            <Ionicons name="pause" size={14} color={colors.warning} />
          ) : (
            <PulseDot color={state ? colors.danger : colors.textDim} />
          )}
          <Text style={[styles.statusText, paused && { color: colors.warning }]}>
            {!state ? 'Starting' : paused ? 'Paused' : 'Recording'}
          </Text>
          <View style={styles.divider} />
          <ActivityIcon type={activity} size={18} color={config.accent} />
        </Glass>
        <Glass style={styles.statusPill}>
          <GpsBars accuracy={state?.lastAccuracy ?? null} active={state?.lastFixAt != null} />
          <Text style={styles.statusText}>{state?.lastFixAt != null ? 'GPS' : 'Finding GPS'}</Text>
        </Glass>
      </View>

      <Glass style={[styles.panel, { paddingBottom: insets.bottom + space.lg }]} onLayout={(e) => setPanelHeight(e.nativeEvent.layout.height)}>
        <View style={[styles.gauge, paused && styles.dimmed]}>
          <SpeedGauge value={Number(speed.value)} max={gaugeMax} gradient={config.gradient} size={gaugeSize}>
            <Text style={[styles.speed, { fontSize: gaugeSize * 0.36, lineHeight: gaugeSize * 0.4 }]} accessibilityLabel={`Speed ${speed.value} ${speed.unit}`}>
              {speed.value}
            </Text>
            <Text style={styles.speedUnit}>{speed.unit}</Text>
          </SpeedGauge>
        </View>

        <View style={styles.statsRow}>
          <Stat label="Time" value={formatDuration(elapsed)} size="lg" align="center" />
          <Stat label="Distance" value={distance.value} unit={distance.unit} size="lg" align="center" color={config.accent} />
        </View>
        <View style={[styles.statsRow, styles.smallStats]}>
          <Stat label="Avg" value={avg.value} unit={avg.unit} size="sm" align="center" />
          <Stat label="Max" value={max.value} unit={max.unit} size="sm" align="center" />
          <Stat label="Climb" value={elevation.value} unit={elevation.unit} size="sm" align="center" />
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
                  {paused ? (
                    <LinearGradient colors={config.gradient} style={styles.controlFill}>
                      <Ionicons name="play" size={36} color={colors.bg} />
                    </LinearGradient>
                  ) : (
                    <View style={[styles.controlFill, styles.pauseFill]}>
                      <Ionicons name="pause" size={36} color={colors.text} />
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
                icon={<Ionicons name="stop" size={32} color={colors.danger} />}
              />
            </>
          )}
        </View>
      </Glass>
    </View>
  );
}

function PulseDot({ color }: { color: string }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.set(withRepeat(withTiming(0.25, { duration: 800 }), -1, true));
  }, [opacity]);
  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[styles.pulseDot, { backgroundColor: color }, style]} />;
}

/** Signal bars from the GPS accuracy radius: under 10 m is strong, over 20 m is weak. */
function GpsBars({ accuracy, active }: { accuracy: number | null; active: boolean }) {
  const level = !active || accuracy == null ? 0 : accuracy <= 10 ? 3 : accuracy <= 20 ? 2 : 1;
  const color = level === 3 ? colors.success : level === 2 ? colors.warning : colors.danger;
  return (
    <View style={styles.bars} accessibilityLabel={`GPS signal ${['searching', 'weak', 'fair', 'strong'][level]}`}>
      {[1, 2, 3].map((b) => (
        <View key={b} style={[styles.bar, { height: 4 + b * 4, backgroundColor: b <= level ? color : colors.textFaint }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  topFade: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: { position: 'absolute', left: space.lg, right: space.lg, flexDirection: 'row', justifyContent: 'space-between' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 40, paddingHorizontal: 14, borderRadius: radius.pill },
  statusText: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 1.4, color: colors.text, textTransform: 'uppercase' },
  divider: { width: StyleSheet.hairlineWidth, height: 18, backgroundColor: colors.border },
  pulseDot: { width: 10, height: 10, borderRadius: 5 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  bar: { width: 4, borderRadius: 1 },
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: space.md,
    paddingHorizontal: space.xl,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    gap: space.md,
  },
  gauge: { alignItems: 'center', marginBottom: -space.md },
  dimmed: { opacity: 0.4 },
  speed: { fontFamily: fonts.displayItalic, color: colors.text, fontVariant: ['tabular-nums'] },
  speedUnit: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textDim, letterSpacing: 1, marginTop: -4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  smallStats: {
    paddingVertical: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  gpsError: { color: colors.warning, fontSize: 13, textAlign: 'center' },
  controls: { flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-start', paddingTop: space.xs },
  controlWrap: { alignItems: 'center', gap: 8 },
  control: { width: CONTROL_SIZE, height: CONTROL_SIZE, borderRadius: CONTROL_SIZE / 2, overflow: 'hidden' },
  controlFill: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  pauseFill: { backgroundColor: 'rgba(255,255,255,0.1)' },
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
