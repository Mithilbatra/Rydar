import { NativeTabs } from 'expo-router/native-tabs';

import { useSettings } from '@/hooks/useSettings';
import { ACTIVITIES } from '@/lib/activities';
import { colors } from '@/lib/theme';

export default function TabsLayout() {
  const { settings } = useSettings();
  // The whole app picks up the colour of the activity you last chose.
  const accent = ACTIVITIES[settings.lastActivity].accent;
  return (
    <NativeTabs
      tintColor={accent}
      backgroundColor={colors.bg}
      indicatorColor={colors.surfaceRaised}
      labelStyle={{ default: { color: colors.textDim }, selected: { color: colors.text } }}
      labelVisibilityMode="labeled"
      minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf="figure.outdoor.cycle" md="directions_bike" />
        <NativeTabs.Trigger.Label>Ride</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="history">
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
        <NativeTabs.Trigger.Label>History</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="chart.bar.xaxis" md="bar_chart" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
