import { useLocalSearchParams } from 'expo-router';

import { RideView } from '@/components/RideView';

export default function RideSummary() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RideView id={id} mode="summary" />;
}
