import { Ionicons } from '@expo/vector-icons';
import { memo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import MapView, { Marker, Polyline, type MapStyleElement } from 'react-native-maps';

import { Glass } from '@/components/Glass';
import { colors } from '@/lib/theme';
import type { LatLng } from '@/types';

interface Props {
  /** Route in chunks (see TrackerState.route). A finished ride passes one chunk. */
  route: LatLng[][];
  accent: string;
  /** Live ride: follow the rider until they pan the map away. */
  live?: boolean;
  interactive?: boolean;
  /** Space at the bottom covered by a panel, so the route stays visible above it. */
  bottomInset?: number;
  style?: StyleProp<ViewStyle>;
}

export function RouteMap({ route, accent, live = false, interactive = true, bottomInset = 0, style }: Props) {
  const map = useRef<MapView>(null);
  const [follow, setFollow] = useState(true);
  const centered = useRef(false);

  const all = live ? [] : route.flat();
  const first = all[0];
  const last = all.at(-1);

  const fitRoute = () => {
    if (live || all.length === 0) return;
    if (all.length === 1) {
      map.current?.animateCamera({ center: all[0], zoom: 15, altitude: 2000 }, { duration: 0 });
      return;
    }
    map.current?.fitToCoordinates(all, {
      edgePadding: { top: 90, right: 48, bottom: 48 + bottomInset, left: 48 },
      animated: false,
    });
  };

  return (
    <View style={[styles.wrap, style]}>
      <MapView
        ref={map}
        style={StyleSheet.absoluteFill}
        userInterfaceStyle="dark"
        customMapStyle={Platform.OS === 'android' ? DARK_MAP : undefined}
        showsUserLocation={live}
        showsCompass={false}
        showsPointsOfInterests={false}
        showsBuildings={false}
        toolbarEnabled={false}
        pitchEnabled={false}
        rotateEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        mapPadding={{ top: 0, left: 0, right: 0, bottom: bottomInset }}
        onMapReady={fitRoute}
        onPanDrag={live ? () => setFollow(false) : undefined}
        onUserLocationChange={(e) => {
          const c = e.nativeEvent.coordinate;
          if (!live || !follow || !c) return;
          const center = { latitude: c.latitude, longitude: c.longitude };
          // Zoom in once; after that keep whatever zoom the rider picked.
          map.current?.animateCamera(centered.current ? { center } : { center, zoom: 16, altitude: 1200 }, {
            duration: 500,
          });
          centered.current = true;
        }}>
        {route.map((chunk, i) => (
          <RouteLine key={i} coordinates={chunk} accent={accent} />
        ))}
        {first && <Marker coordinate={first} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[styles.dot, { backgroundColor: colors.start }]} />
        </Marker>}
        {last && all.length > 1 && <Marker coordinate={last} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={[styles.dot, { backgroundColor: colors.finish }]} />
        </Marker>}
      </MapView>
      {live && !follow && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Follow my position"
          onPress={() => setFollow(true)}
          style={[styles.recenter, { bottom: bottomInset + 16 }]}>
          <Glass style={styles.recenterGlass}>
            <Ionicons name="navigate" size={22} color={accent} />
          </Glass>
        </Pressable>
      )}
    </View>
  );
}

/** A soft wide stroke under a thin bright one reads as a neon line on the dark map. */
const RouteLine = memo(function RouteLine({ coordinates, accent }: { coordinates: LatLng[]; accent: string }) {
  if (coordinates.length < 2) return null;
  return (
    <>
      <Polyline coordinates={coordinates} strokeColor={`${accent}44`} strokeWidth={12} lineCap="round" lineJoin="round" />
      <Polyline coordinates={coordinates} strokeColor={accent} strokeWidth={4} lineCap="round" lineJoin="round" />
    </>
  );
});

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', backgroundColor: colors.surface },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: colors.bg },
  recenter: { position: 'absolute', right: 16 },
  recenterGlass: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});

// Google Maps night style for Android. iOS uses Apple Maps' own dark mode.
const DARK_MAP: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#0d0f14' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#6b7180' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0d0f14' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1c1f27' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#14161c' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2a2e38' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#05070a' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#10131a' }] },
];
