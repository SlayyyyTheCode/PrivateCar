import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BAND_ORDER } from '../src/core/bands';
import { evaluateScenario } from '../src/core/verdict';
import { COE, DATA_AS_OF, LOAN_RULES } from '../src/data/sg-2026-08';
import { useScenario } from '../src/state/useScenario';
import { BandMeter } from '../src/ui/BandMeter';
import { money, percent } from '../src/ui/format';
import { useCountUp } from '../src/ui/useCountUp';
import { font, motion, radius, spacing, usePalette, useReducedMotion } from '../src/ui/theme';

/**
 * The landing page.
 *
 * It leads with the number, not the form: most people have never added up what
 * a car actually costs them per month, and seeing it before being asked for any
 * input is the whole argument for the app.
 */
export default function Landing() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;

  const scenario = useScenario((s) => s.scenario);
  const result = useMemo(() => evaluateScenario(scenario), [scenario]);

  const monthly = useCountUp(result.totalMonthlyCarCost, 1400);
  const coeValue = useCountUp(COE.catA, 1600);

  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
        showsVerticalScrollIndicator={false}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Hero                                                             */}
        {/* ---------------------------------------------------------------- */}
        <View
          style={{
            backgroundColor: p.heroBackground,
            paddingTop: insets.top + spacing.xl,
            paddingBottom: spacing.xxl,
            paddingHorizontal: spacing.lg,
            overflow: 'hidden',
          }}
        >
          <Glow />

          <View
            style={{
              flexDirection: wide ? 'row' : 'column',
              alignItems: 'center',
              gap: spacing.xl,
              maxWidth: 1100,
              width: '100%',
              alignSelf: 'center',
            }}
          >
            <View style={{ flex: wide ? 1 : undefined, gap: spacing.lg, width: '100%' }}>
              <FadeIn delay={0}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.pass }} />
                  <Text style={[font.label, { color: p.heroMuted, letterSpacing: 1.4 }]}>
                    OYC · OWN YOUR CAR
                  </Text>
                </View>
              </FadeIn>

              <FadeIn delay={90}>
                <Text
                  style={{
                    color: p.heroText,
                    fontSize: wide ? 62 : 40,
                    lineHeight: wide ? 66 : 46,
                    fontWeight: '800',
                    letterSpacing: -1.6,
                  }}
                >
                  A car in Singapore{'\n'}costs you{' '}
                  <Text style={{ color: p.pass }}>{money(monthly)}</Text>{' '}
                  <Text style={{ color: p.heroMuted, fontWeight: '600' }}>a month.</Text>
                </Text>
              </FadeIn>

              <FadeIn delay={180}>
                <Text style={{ color: p.heroMuted, fontSize: 17, lineHeight: 26, maxWidth: 540 }}>
                  Not the instalment. Everything — petrol, parking, insurance, ERP, road tax, servicing, and
                  the interest the flat rate hides. Paste a listing and find out where you actually stand.
                </Text>
              </FadeIn>

              <FadeIn delay={270}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm }}>
                  <HeroButton
                    label="Paste a car listing"
                    icon="link"
                    primary
                    onPress={() => router.push('/listing')}
                  />
                  <HeroButton
                    label="Enter it manually"
                    icon="create-outline"
                    onPress={() => router.push('/calculator')}
                  />
                </View>
              </FadeIn>
            </View>

            <FadeIn delay={220} style={{ flex: wide ? 1 : undefined, width: '100%' }}>
              <View
                style={{
                  backgroundColor: p.heroSurface,
                  borderRadius: radius.lg,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: p.heroBorder,
                  padding: spacing.xl,
                  gap: spacing.lg,
                }}
              >
                <Text style={{ color: p.heroMuted, fontSize: 13, letterSpacing: 1.2, fontWeight: '600' }}>
                  WHERE THAT LANDS
                </Text>
                <BandMeter share={result.shareOfGrossIncome} />
                <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.heroBorder }} />
                <Text style={{ color: p.heroMuted, fontSize: 14, lineHeight: 21 }}>
                  On {money(result.grossMonthlyIncome)} a month gross. Change the income, the car, or paste a
                  real listing and this moves with you.
                </Text>
              </View>
            </FadeIn>
          </View>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* The bands                                                        */}
        {/* ---------------------------------------------------------------- */}
        <Section title="Four words, one number" subtitle="What share of your gross monthly income the car eats.">
          <View style={{ flexDirection: wide ? 'row' : 'column', gap: spacing.md }}>
            {BAND_ORDER.map((band, i) => {
              const tone = band.tone === 'pass' ? p.pass : band.tone === 'stretch' ? p.stretch : p.fail;
              const bg = band.tone === 'pass' ? p.passSoft : band.tone === 'stretch' ? p.stretchSoft : p.failSoft;
              const range =
                i === 0
                  ? `under ${percent(band.maxShare ?? 0)}`
                  : band.maxShare === null
                    ? `${percent(BAND_ORDER[i - 1].maxShare ?? 0)} and up`
                    : `${percent(BAND_ORDER[i - 1].maxShare ?? 0)} – ${percent(band.maxShare)}`;
              return (
                <FadeIn key={band.id} delay={i * 80} style={{ flex: 1 }}>
                  <View
                    style={{
                      backgroundColor: p.surface,
                      borderRadius: radius.lg,
                      borderWidth: StyleSheet.hairlineWidth,
                      borderColor: p.border,
                      padding: spacing.lg,
                      gap: spacing.sm,
                      height: '100%',
                    }}
                  >
                    <View
                      style={{
                        alignSelf: 'flex-start',
                        backgroundColor: bg,
                        borderRadius: radius.pill,
                        paddingHorizontal: spacing.md,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={[font.caption, { color: tone, fontWeight: '700' }]}>{range}</Text>
                    </View>
                    <Text style={[font.title, { color: p.text }]}>{band.label}</Text>
                    <Text style={[font.caption, { color: p.textMuted, lineHeight: 18 }]}>{band.blurb}</Text>
                  </View>
                </FadeIn>
              );
            })}
          </View>
        </Section>

        {/* ---------------------------------------------------------------- */}
        {/* Why it is so expensive                                           */}
        {/* ---------------------------------------------------------------- */}
        <Section
          title="You are not mostly buying a car"
          subtitle={`Cat A COE alone, as of ${DATA_AS_OF}.`}
        >
          <View
            style={{
              backgroundColor: p.surface,
              borderRadius: radius.lg,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: p.border,
              padding: spacing.xl,
              gap: spacing.md,
            }}
          >
            <Text style={{ color: p.accent, fontSize: 46, fontWeight: '800', letterSpacing: -1.5 }}>
              {money(coeValue)}
            </Text>
            <Text style={[font.body, { color: p.textMuted, lineHeight: 22 }]}>
              That is the certificate that lets you keep a car for ten years — before the vehicle, before the
              Additional Registration Fee, before a single litre of petrol.
            </Text>
            <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />
            <Fact
              icon="trending-up-outline"
              title="Flat rates hide half the interest"
              body={`Dealers quote ${LOAN_RULES.typicalFlatRatePct.min}%–${LOAN_RULES.typicalFlatRatePct.max}% flat. On a 5-year loan that is closer to 5% a year in real terms. OYC shows you both.`}
            />
            <Fact
              icon="shield-outline"
              title="20-4-10 does not work here"
              body="20% down is below the legal minimum, and 10% of income is unreachable. OYC shows the American rule failing, leg by leg, then gives you one that fits Singapore."
            />
            <Fact
              icon="calendar-outline"
              title="The rebate cliff is real"
              body="Budget 2026 cut the PARF rebate to 30% of ARF, capped at $30,000. Hold to year ten and you get back 5%."
            />
          </View>
        </Section>

        <Section title="" subtitle="">
          <Pressable
            onPress={() => router.push('/listing')}
            style={({ pressed }) => ({
              backgroundColor: p.accent,
              borderRadius: radius.lg,
              padding: spacing.xl,
              alignItems: 'center',
              gap: spacing.sm,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 22, fontWeight: '700' }}>
              Check a car you are looking at
            </Text>
            <Text style={{ color: '#DCE9F7', fontSize: 14, textAlign: 'center' }}>
              Paste any sgcarmart listing. OYC reads the OMV, ARF, COE and road tax, then tells you where it
              lands against your income.
            </Text>
          </Pressable>

          <Text style={[font.caption, { color: p.textFaint, textAlign: 'center', marginTop: spacing.lg }]}>
            OYC gives estimates for planning, not financial advice. Figures as of {DATA_AS_OF} and all
            editable.
          </Text>
        </Section>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  const p = usePalette();
  return (
    <View
      style={{
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xxl,
        gap: spacing.lg,
        maxWidth: 1100,
        width: '100%',
        alignSelf: 'center',
      }}
    >
      {title ? (
        <View style={{ gap: spacing.xs }}>
          <Text style={[font.display, { color: p.text }]}>{title}</Text>
          <Text style={[font.body, { color: p.textMuted }]}>{subtitle}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

function Fact({
  icon,
  title,
  body,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
}) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: radius.sm,
          backgroundColor: p.accentSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={16} color={p.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[font.heading, { color: p.text }]}>{title}</Text>
        <Text style={[font.caption, { color: p.textMuted, lineHeight: 18 }]}>{body}</Text>
      </View>
    </View>
  );
}

function HeroButton({
  label,
  icon,
  primary,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  primary?: boolean;
  onPress: () => void;
}) {
  const p = usePalette();
  const ink = primary ? '#062017' : p.heroText;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
        minHeight: 50,
        paddingHorizontal: spacing.xl,
        borderRadius: radius.pill,
        backgroundColor: primary ? p.pass : pressed ? 'rgba(233,240,248,0.08)' : 'transparent',
        borderWidth: primary ? 0 : 1,
        borderColor: p.heroBorder,
        opacity: pressed && primary ? 0.9 : 1,
      })}
    >
      <Ionicons name={icon} size={17} color={ink} />
      <Text style={{ color: ink, fontSize: 15, fontWeight: '700' }}>{label}</Text>
    </Pressable>
  );
}

/** Soft radial wash behind the hero, so the dark block is not flat. */
function Glow() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View
        style={{
          position: 'absolute',
          top: -160,
          right: -120,
          width: 460,
          height: 460,
          borderRadius: 230,
          backgroundColor: '#12518C',
          opacity: 0.32,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: -200,
          left: -140,
          width: 420,
          height: 420,
          borderRadius: 210,
          backgroundColor: '#1B7F4B',
          opacity: 0.18,
        }}
      />
    </View>
  );
}

/** Entrance animation: fade up, staggered by `delay`. */
function FadeIn({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: object;
}) {
  const reduced = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(reduced ? 1 : 0));

  useEffect(() => {
    // Reduced motion gets the finished state immediately — the content is
    // never gated behind a transition that may not run.
    if (reduced) {
      progress.setValue(1);
      return;
    }
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: motion.slow,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [delay, progress, reduced]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: progress,
          transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}
