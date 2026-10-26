import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActivityFilter, matchesFilter, type ActivityFilterValue } from '@/components/ActivityFilter';
import { GradientButton } from '@/components/GradientButton';
import { RaceTag } from '@/components/RaceTag';
import { RideCard } from '@/components/RideCard';
import { ScreenHeader } from '@/components/ScreenHeader';
import { useAuth } from '@/hooks/useAuth';
import { useRides } from '@/hooks/useRides';
import { useSettings } from '@/hooks/useSettings';
import { ACTIVITIES } from '@/lib/activities';
import { colors, space, type } from '@/lib/theme';
import type { RideListItem } from '@/types';
import { fmtDistance, joinMeasure } from '@/utils/format';
import { startOfMonth, totals } from '@/utils/stats';

export default function History() {
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const { session } = useAuth();
  const rides = useRides();
  const [filter, setFilter] = useState<ActivityFilterValue>('all');

  const shown = (rides ?? []).filter(matchesFilter(filter));
  const sections = groupByMonth(shown);
  const all = totals(shown);

  return (
    <View style={styles.screen}>
      <SectionList
        sections={sections}
        keyExtractor={(r) => r.id}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + space.md, paddingBottom: insets.bottom + 110 }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader
              eyebrow={`${all.count} ${all.count === 1 ? 'ride' : 'rides'} · ${joinMeasure(fmtDistance(all.distanceKm, settings.units))}`}
              title="Race log"
            />
            <ActivityFilter value={filter} onChange={setFilter} />
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHead}>
            <RaceTag label={section.title} color={colors.race} solid={false} />
            <Text style={type.caption}>{joinMeasure(fmtDistance(section.distanceKm, settings.units))}</Text>
          </View>
        )}
        renderItem={({ item }) => <RideCard ride={item} units={settings.units} showSync={session != null} />}
        ItemSeparatorComponent={() => <View style={{ height: space.md }} />}
        ListEmptyComponent={
          rides === null ? undefined : (
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Ionicons name="map-outline" size={40} color={colors.textDim} />
              </View>
              <Text style={type.heading}>No rides yet</Text>
              <Text style={[type.caption, styles.centered]}>
                {filter === 'all'
                  ? 'Your rides show up here with their route, distance and speed.'
                  : `No ${ACTIVITIES[filter].label.toLowerCase()} rides yet.`}
              </Text>
              <GradientButton label="Start a ride" onPress={() => router.navigate('/')} style={styles.emptyButton} />
            </View>
          )
        }
      />
    </View>
  );
}

function groupByMonth(rides: RideListItem[]) {
  const sections: { title: string; distanceKm: number; data: RideListItem[] }[] = [];
  let key = -1;
  for (const r of rides) {
    const month = startOfMonth(r.startedAt);
    if (month !== key) {
      key = month;
      sections.push({
        title: new Date(month).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
        distanceKm: 0,
        data: [],
      });
    }
    const section = sections[sections.length - 1];
    section.data.push(r);
    section.distanceKm += r.distanceKm;
  }
  return sections;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: space.xl },
  header: { gap: space.lg, marginBottom: space.sm },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingTop: space.xl,
    paddingBottom: space.md,
  },
  empty: { alignItems: 'center', gap: space.md, paddingTop: 80 },
  emptyIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  centered: { textAlign: 'center', maxWidth: 280 },
  emptyButton: { alignSelf: 'stretch', marginTop: space.lg },
});
