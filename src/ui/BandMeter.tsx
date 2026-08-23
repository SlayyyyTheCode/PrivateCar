import { useEffect, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import { BAND_ORDER, classifyBand } from '../core/bands';
import { percent } from './format';
import { font, radius, spacing, usePalette } from './theme';

/**
 * The whole product in one graphic: where this car's monthly cost falls as a
 * share of income, against the four bands.
 *
 * Sits where a picture of a car used to. A car is decoration; this is the
 * answer, and it works before the user has entered anything.
 */

/** The scale runs to 50% — past that the marker just pins to the end. */
const SCALE_MAX = 0.5;

export function BandMeter({
  share,
  compact = false,
}: {
  share: number;
  compact?: boolean;
}) {
  const p = usePalette();
  const band = classifyBand(share);

  const clamped = Number.isFinite(share) ? Math.min(share, SCALE_MAX) : SCALE_MAX;
  const [position] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(position, {
      toValue: clamped / SCALE_MAX,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      // Percentage widths cannot be driven natively.
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [clamped, position]);

  const left = position.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const toneColour = (tone: string) => (tone === 'pass' ? p.pass : tone === 'stretch' ? p.stretch : p.fail);

  return (
    <View style={{ gap: spacing.sm }}>
      {!compact ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }}>
          <Text style={{ color: toneColour(band.tone), fontSize: 26, fontWeight: '800', letterSpacing: -0.6 }}>
            {band.label}
          </Text>
          <Text style={[font.body, { color: p.textMuted }]}>
            at {Number.isFinite(share) ? percent(share, 1) : '—'} of income
          </Text>
        </View>
      ) : null}

      <View style={{ height: compact ? 12 : 20, flexDirection: 'row', borderRadius: radius.pill, overflow: 'hidden' }}>
        {BAND_ORDER.map((entry, i) => {
          const from = i === 0 ? 0 : (BAND_ORDER[i - 1].maxShare ?? 0);
          const to = entry.maxShare ?? SCALE_MAX;
          return (
            <View
              key={entry.id}
              style={{
                flex: Math.max(0.001, to - from),
                backgroundColor: toneColour(entry.tone),
                opacity: entry.id === band.id ? 1 : 0.32,
              }}
            />
          );
        })}
      </View>

      {/* Marker rides above the track so it never hides a band boundary. */}
      <View style={{ height: compact ? 0 : 26 }}>
        {!compact ? (
          <Animated.View
            style={{
              position: 'absolute',
              left,
              top: -34,
              transform: [{ translateX: -7 }],
              alignItems: 'center',
            }}
          >
            <View
              style={{
                width: 3,
                height: 26,
                borderRadius: 2,
                backgroundColor: p.text,
              }}
            />
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                marginTop: -7,
                backgroundColor: p.text,
                borderWidth: 3,
                borderColor: p.background,
              }}
            />
          </Animated.View>
        ) : null}
      </View>

      {!compact ? (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          {['0%', '10%', '20%', '30%', '50%+'].map((label) => (
            <Text key={label} style={[font.caption, { color: p.textFaint }]}>
              {label}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default BandMeter;
