import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import type { ActivityType } from '@/types';

export function ActivityIcon({ type, size = 24, color }: { type: ActivityType; size?: number; color: string }) {
  return type === 'bicycle' ? (
    <Ionicons name="bicycle" size={size} color={color} />
  ) : (
    <MaterialCommunityIcons name="motorbike" size={size} color={color} />
  );
}
