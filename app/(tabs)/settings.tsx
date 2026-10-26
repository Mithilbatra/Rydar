import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FilterChips } from '@/components/FilterChips';
import { GradientButton } from '@/components/GradientButton';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/hooks/useAuth';
import { useSettings } from '@/hooks/useSettings';
import { ACTIVITIES } from '@/lib/activities';
import { colors, fonts, radius, space, type } from '@/lib/theme';
import { countUnsynced, onRidesChanged, syncPendingRides } from '@/services/rides';
import type { UnitSystem } from '@/types';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { settings, update } = useSettings();
  const { session, isGuest, configured, setGuest, signOut } = useAuth();
  const [unsynced, setUnsynced] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const accent = ACTIVITIES[settings.lastActivity].accent;

  const refresh = useCallback(() => {
    countUnsynced().then(setUnsynced);
  }, []);
  useFocusEffect(refresh);
  useFocusEffect(useCallback(() => onRidesChanged(refresh), [refresh]));

  const syncNow = async () => {
    setSyncing(true);
    try {
      const n = await syncPendingRides();
      setSyncMessage(n > 0 ? `Uploaded ${n} ${n === 1 ? 'ride' : 'rides'}.` : 'Everything is up to date.');
    } catch (e) {
      setSyncMessage(`Could not sync: ${e instanceof Error ? e.message : 'no connection'}. Rides stay on this phone.`);
    }
    setSyncing(false);
    refresh();
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 110 }]}>
      <ScreenHeader title="Settings" />

      <Section title="Units">
        <FilterChips<UnitSystem>
          options={[
            { value: 'metric', label: 'Kilometres', color: accent },
            { value: 'imperial', label: 'Miles', color: accent },
          ]}
          value={settings.units}
          onChange={(units) => update({ units })}
        />
      </Section>

      <Section title="Privacy">
        <Row
          icon={settings.defaultPublic ? 'globe-outline' : 'lock-closed-outline'}
          title="New rides are public"
          caption="You can still change each ride on its summary screen.">
          <Switch
            value={settings.defaultPublic}
            onValueChange={(defaultPublic) => update({ defaultPublic })}
            trackColor={{ true: accent, false: colors.surfaceRaised }}
            thumbColor={colors.text}
            accessibilityLabel="New rides are public"
          />
        </Row>
      </Section>

      <Section title="Account">
        {session ? (
          <>
            <Row icon="person-circle-outline" title={session.user.email ?? 'Signed in'} caption="Rides back up to Supabase." />
            <Row
              icon={unsynced > 0 ? 'cloud-upload-outline' : 'cloud-done-outline'}
              title={unsynced > 0 ? `${unsynced} ${unsynced === 1 ? 'ride' : 'rides'} waiting to sync` : 'All rides synced'}
              caption={syncMessage ?? 'Rides upload by themselves when you have a connection.'}
            />
            <GradientButton label="Sync now" variant="ghost" loading={syncing} onPress={syncNow} />
            <GradientButton label="Sign out" variant="danger" onPress={signOut} />
          </>
        ) : (
          <>
            <Row
              icon="phone-portrait-outline"
              title={isGuest ? 'Riding as a guest' : 'Not signed in'}
              caption={
                configured
                  ? 'Rides are saved on this phone only. Sign in to back them up; rides you already recorded come along.'
                  : 'Accounts are off: add your Supabase keys to .env to turn on backup (see README).'
              }
            />
            {configured && <GradientButton label="Sign in or create account" variant="ghost" onPress={() => setGuest(false)} />}
          </>
        )}
      </Section>

      <Section title="About">
        <Row icon="information-circle-outline" title={`Rydar ${Constants.expoConfig?.version ?? ''}`} caption="Maps by Apple Maps on iPhone and Google Maps on Android." />
        <Row
          icon="navigate-circle-outline"
          title="Tracking runs while the app is open"
          caption="Keep Rydar on screen during a ride. Background tracking needs a development build (see README)."
        />
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={type.label}>{title}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  title,
  caption,
  children,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  caption?: string;
  children?: ReactNode;
}) {
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={22} color={colors.textDim} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        {caption ? <Text style={type.caption}>{caption}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.xl, gap: space.xl },
  section: { gap: space.sm },
  card: {
    gap: space.lg,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontFamily: fonts.display, fontSize: 18, color: colors.text },
});
