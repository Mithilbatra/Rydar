import type { ActivityType } from '@/types';

interface ActivityConfig {
  label: string;
  accent: string;
  gradient: readonly [string, string];
  /** Faster than this between two fixes is a GPS spike, not riding. */
  maxPlausibleKmh: number;
  /** Full scale of the live speed gauge. */
  gaugeMaxKmh: number;
}

export const ACTIVITIES: Record<ActivityType, ActivityConfig> = {
  bicycle: {
    label: 'Bicycle',
    accent: '#C8FF2E',
    gradient: ['#E6FF6A', '#5CF27A'],
    maxPlausibleKmh: 100,
    gaugeMaxKmh: 60,
  },
  motorbike: {
    label: 'Motorbike',
    accent: '#FF6A1F',
    gradient: ['#FFB23E', '#FF3B2F'],
    maxPlausibleKmh: 350,
    gaugeMaxKmh: 200,
  },
};

export const ACTIVITY_TYPES = Object.keys(ACTIVITIES) as ActivityType[];
