import { ActivityIcon } from '@/components/ActivityIcon';
import { FilterChips, type ChipOption } from '@/components/FilterChips';
import { ACTIVITIES, ACTIVITY_TYPES } from '@/lib/activities';
import type { ActivityType } from '@/types';

export type ActivityFilterValue = 'all' | ActivityType;

const OPTIONS: ChipOption<ActivityFilterValue>[] = [
  { value: 'all', label: 'All' },
  ...ACTIVITY_TYPES.map((t) => ({
    value: t,
    label: ACTIVITIES[t].label,
    color: ACTIVITIES[t].accent,
    icon: (color: string) => <ActivityIcon type={t} size={16} color={color} />,
  })),
];

export function ActivityFilter({
  value,
  onChange,
}: {
  value: ActivityFilterValue;
  onChange: (v: ActivityFilterValue) => void;
}) {
  return <FilterChips options={OPTIONS} value={value} onChange={onChange} />;
}

export const matchesFilter = (filter: ActivityFilterValue) => (r: { activityType: ActivityType }) =>
  filter === 'all' || r.activityType === filter;
