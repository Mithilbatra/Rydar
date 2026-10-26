import type { ActivityType } from '@/types';

interface ActivityConfig {
  label: string;
  accent: string;
  gradient: readonly [string, string];
  /** Faster than this between two fixes is a GPS spike, not riding. */
  maxPlausibleKmh: number;
  /** Speed that fills the shift-light bar on the live screen. */
  gaugeMaxKmh: number;
}

export const ACTIVITIES: Record<ActivityType, ActivityConfig> = {
  bicycle: {
    label: 'Bicycle',
    accent: '#D4FF00', // fluo yellow, like the most famous livery in the paddock
    gradient: ['#F2FF5C', '#9DFF00'],
    maxPlausibleKmh: 100,
    gaugeMaxKmh: 60,
  },
  motorbike: {
    label: 'Motorbike',
    accent: '#FF2A2A', // MotoGP red
    gradient: ['#FF6A3D', '#D7001B'],
    maxPlausibleKmh: 350,
    gaugeMaxKmh: 200,
  },
};

export const ACTIVITY_TYPES = Object.keys(ACTIVITIES) as ActivityType[];
