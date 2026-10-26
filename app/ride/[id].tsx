import { useLocalSearchParams } from 'expo-router';

import { RideView } from '@/components/RideView';

export default function RideDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RideView id={id} mode="details" />;
}
