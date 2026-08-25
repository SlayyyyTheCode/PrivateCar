import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { font, radius, spacing, usePalette } from './theme';

/**
 * The listing's own photographs, spun like a turntable.
 *
 * This replaced a procedural 3D model. No amount of geometry was going to be
 * "the actual car", and a real reconstruction is not possible from a handful of
 * marketing shots — glossy paint defeats feature matching and the angles do not
 * orbit. The photographs, on the other hand, are the car.
 *
 * Frames cross-fade rather than cut, which reads as rotation even though the
 * dealer's angles are unevenly spaced.
 */

const AUTO_ADVANCE_MS = 1400;
const FADE_MS = 480;
/** Horizontal drag needed to move one frame. */
const DRAG_PER_FRAME = 46;

export function CarPhotoSpinner({
  photos,
  caption,
  style,
  aspectRatio = 4 / 3,
}: {
  photos: string[];
  caption?: string;
  style?: StyleProp<ViewStyle>;
  /** Listing photos are 4:3; matching the frame to them avoids cropping the car. */
  aspectRatio?: number;
}) {
  const p = usePalette();

  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState<Record<string, boolean>>({});
  const [playing, setPlaying] = useState(true);

  const usable = useMemo(() => photos.filter((url) => !failed[url]), [photos, failed]);
  const current = usable[Math.min(index, Math.max(0, usable.length - 1))];
  const anyLoaded = usable.some((url) => loaded[url]);

  // One opacity value per frame, so a fade can run between any two of them.
  const [fades] = useState(() => new Map<string, Animated.Value>());
  const fadeFor = (url: string) => {
    if (!fades.has(url)) fades.set(url, new Animated.Value(0));
    return fades.get(url) as Animated.Value;
  };

  useEffect(() => {
    if (!current) return;
    const animations = usable.map((url) => {
      let value = fades.get(url);
      if (!value) {
        value = new Animated.Value(0);
        fades.set(url, value);
      }
      return Animated.timing(value, {
        toValue: url === current ? 1 : 0,
        duration: FADE_MS,
        useNativeDriver: true,
      });
    });
    Animated.parallel(animations).start();
  }, [current, usable, fades]);

  useEffect(() => {
    if (!playing || usable.length < 2 || !anyLoaded) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % usable.length), AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [playing, usable.length, anyLoaded]);

  // Dragging scrubs through the frames, which is what makes it feel like an
  // object you are turning rather than a slideshow you are watching.
  //
  // The responder is built inside an effect rather than during render: it
  // closes over a ref, and reading a ref while rendering is exactly what the
  // React compiler refuses.
  const live = useRef({ index: 0, count: 0 });
  useEffect(() => {
    live.current = { index, count: usable.length };
  }, [index, usable.length]);

  const [panHandlers, setPanHandlers] = useState<Record<string, unknown>>({});

  useEffect(() => {
    let origin = 0;
    const responder = PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 4,
      onPanResponderGrant: () => {
        origin = live.current.index;
        setPlaying(false);
      },
      onPanResponderMove: (_event, gesture) => {
        const { count } = live.current;
        if (count === 0) return;
        const steps = Math.round(gesture.dx / DRAG_PER_FRAME);
        const next = (origin - steps) % count;
        setIndex(next < 0 ? next + count : next);
      },
    });
    setPanHandlers(responder.panHandlers as Record<string, unknown>);
  }, []);

  if (photos.length === 0) return null;

  return (
    <View style={style}>
      <View
        {...panHandlers}
        style={{
          width: '100%',
          aspectRatio,
          borderRadius: radius.lg,
          overflow: 'hidden',
          // Dark backing so any photo that is not 4:3 letterboxes deliberately
          // rather than being cropped through the car.
          backgroundColor: '#0A1220',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
        }}
      >
        {usable.map((url) => (
          <Animated.View key={url} style={[StyleSheet.absoluteFill, { opacity: fadeFor(url) }]}>
            <Image
              source={{ uri: url }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
              onLoad={() => setLoaded((state) => ({ ...state, [url]: true }))}
              onError={() => setFailed((state) => ({ ...state, [url]: true }))}
              accessibilityLabel={caption ?? 'Photograph of the car'}
            />
          </Animated.View>
        ))}

        {!anyLoaded ? (
          <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
            <ActivityIndicator color={p.accent} />
          </View>
        ) : null}

        {usable.length > 1 ? (
          <Pressable
            onPress={() => setPlaying((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={playing ? 'Pause rotation' : 'Resume rotation'}
            style={{
              position: 'absolute',
              right: spacing.md,
              bottom: spacing.md,
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(10,18,32,0.62)',
            }}
          >
            <Ionicons name={playing ? 'pause' : 'play'} size={15} color="#FFFFFF" />
          </Pressable>
        ) : null}
      </View>

      {usable.length > 1 ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
            marginTop: spacing.sm,
          }}
        >
          {usable.map((url, i) => (
            <View
              key={url}
              style={{
                width: i === index ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === index ? p.accent : p.border,
              }}
            />
          ))}
        </View>
      ) : null}

      {caption ? (
        <Text style={[font.caption, { color: p.textFaint, textAlign: 'center', marginTop: spacing.xs }]}>
          {caption}
        </Text>
      ) : null}
    </View>
  );
}

export default CarPhotoSpinner;
