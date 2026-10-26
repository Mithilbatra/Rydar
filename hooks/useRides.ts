import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { listRides, onRidesChanged } from '@/services/rides';
import type { RideListItem } from '@/types';

/** Finished rides, newest first. null while loading. Refreshes on focus and after any change. */
export function useRides(): RideListItem[] | null {
  const [rides, setRides] = useState<RideListItem[] | null>(null);
  const load = useCallback(() => {
    listRides().then(setRides);
  }, []);
  useFocusEffect(load);
  useEffect(() => onRidesChanged(load), [load]);
  return rides;
}
