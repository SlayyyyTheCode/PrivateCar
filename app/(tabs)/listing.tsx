import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { incomeNeededForBand } from '../../src/core/bands';
import { isSupportedListingUrl, listingToScenario, type ParsedListing } from '../../src/core/listing';
import { evaluateScenario } from '../../src/core/verdict';
import { fetchListing, ListingError } from '../../src/state/listingApi';
import { useScenario } from '../../src/state/useScenario';
import { CarPhotoSpinner } from '../../src/ui/CarPhotoSpinner';
import {
  AmountInput,
  Button,
  Card,
  Divider,
  EmptyState,
  Note,
  Row,
  Screen,
  ScreenTitle,
  Skeleton,
} from '../../src/ui/components';
import { money, moneyPrecise, percent } from '../../src/ui/format';
import { font, radius, spacing, usePalette } from '../../src/ui/theme';

const EXAMPLE = 'https://www.sgcarmart.com/used-cars/info/audi-a4-20a-tfsi-1530094?dl=4645';

export default function ListingScreen() {
  const p = usePalette();
  const router = useRouter();

  const scenario = useScenario((s) => s.scenario);
  const setIncome = useScenario((s) => s.setIncome);
  const applyScenario = useScenario((s) => s.applyScenario);

  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; detail?: string } | null>(null);
  const [listing, setListing] = useState<ParsedListing | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Evaluate the fetched listing against the user's current income, without
  // disturbing the scenario they may have been building by hand.
  const preview = useMemo(
    () => (listing ? evaluateScenario(listingToScenario(listing, scenario)) : null),
    [listing, scenario],
  );

  useEffect(() => () => abort.current?.abort(), []);

  async function check(target: string) {
    const trimmed = target.trim();
    if (!trimmed) return;

    if (!isSupportedListingUrl(trimmed)) {
      setError({
        message: 'That does not look like a car listing.',
        detail: 'OYC reads sgcarmart.com listings. Paste the link to a specific car.',
      });
      setListing(null);
      return;
    }

    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    setLoading(true);
    setError(null);
    try {
      setListing(await fetchListing(trimmed, controller.signal));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      const failure = err as ListingError;
      setListing(null);
      setError({ message: failure.message ?? 'Could not read that listing.', detail: failure.detail });
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }

  return (
    <Screen>
      <ScreenTitle
        title="Paste a listing"
        subtitle="OYC reads the price, OMV, ARF, COE and road tax straight off the page, then judges it against your income."
      />

      <Card>
        <Text style={[font.label, { color: p.textMuted }]}>Car listing link</Text>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: p.surfaceAlt,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: error ? p.fail : p.border,
            paddingHorizontal: spacing.md,
          }}
        >
          <Ionicons name="link" size={16} color={p.textFaint} />
          <TextInput
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={() => check(url)}
            placeholder="https://www.sgcarmart.com/used-cars/info/..."
            placeholderTextColor={p.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            inputMode="url"
            returnKeyType="go"
            style={[
              font.body,
              { flex: 1, color: p.text, paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
            ]}
          />
          {url.length > 0 ? (
            <Pressable onPress={() => setUrl('')} accessibilityRole="button" accessibilityLabel="Clear link">
              <Ionicons name="close-circle" size={16} color={p.textFaint} />
            </Pressable>
          ) : null}
        </View>

        <Button
          label={loading ? 'Reading the listing…' : 'Check this car'}
          icon="search"
          loading={loading}
          disabled={url.trim().length === 0}
          onPress={() => check(url)}
        />
        <Pressable onPress={() => setUrl(EXAMPLE)} accessibilityRole="button">
          <Text style={[font.caption, { color: p.accent }]}>Use an example listing</Text>
        </Pressable>

        <AmountInput
          label="Your monthly income (gross)"
          hint="The verdict is a share of this."
          value={scenario.income.grossMonthlyIncome}
          onChange={(grossMonthlyIncome) => setIncome({ grossMonthlyIncome })}
        />
      </Card>

      {loading ? (
        <>
          <Card>
            <Skeleton width="35%" height={12} />
            <Skeleton width="60%" height={34} />
            <Skeleton width="80%" height={14} />
          </Card>
          <Card>
            <Skeleton height={220} />
            <Skeleton width="55%" height={18} style={{ alignSelf: 'center' }} />
          </Card>
        </>
      ) : null}

      {error ? (
        <Note tone="warn">
          {error.message}
          {error.detail ? ` ${error.detail}` : ''}
        </Note>
      ) : null}

      {listing && preview ? (
        <>
          <VerdictFlash
            label={preview.band.label}
            blurb={preview.band.blurb}
            share={preview.band.share}
            severe={preview.band.severe}
            monthly={preview.totalMonthlyCarCost}
            tone={preview.band.tone}
          />

          <Card>
            {listing.photos.length > 0 ? (
              <CarPhotoSpinner
                photos={listing.photos}
                caption={
                  listing.photos.length > 1
                    ? `${listing.photos.length} photos from the listing — drag to spin`
                    : 'Photo from the listing'
                }
              />
            ) : (
              <EmptyState
                icon="image-outline"
                title="No photographs on this listing"
                body="The numbers below still hold — only the pictures are missing."
              />
            )}
            <Text style={[font.title, { color: p.text, textAlign: 'center' }]}>
              {listing.title ?? 'This car'}
            </Text>
            {listing.vehicleType ? (
              <Text style={[font.caption, { color: p.textFaint, textAlign: 'center' }]}>
                {listing.vehicleType}
                {listing.mileageKm !== null ? ` · ${listing.mileageKm.toLocaleString()} km` : ''}
                {listing.owners !== null ? ` · ${listing.owners} owner${listing.owners === 1 ? '' : 's'}` : ''}
              </Text>
            ) : null}
          </Card>

          <Card>
            <Text style={[font.heading, { color: p.text }]}>What this car costs you</Text>
            <Row label="Asking price" value={money(listing.price ?? 0)} emphasis />
            <Row label="Loan instalment" value={moneyPrecise(preview.loan.monthlyInstalment)} />
            <Row label="Running costs" value={moneyPrecise(preview.running.total)} />
            <Divider />
            <Row label="All in, per month" value={moneyPrecise(preview.totalMonthlyCarCost)} emphasis />
            <Row
              label="Share of your gross income"
              value={percent(preview.band.share, 1)}
              tone={preview.band.tone === 'pass' ? 'pass' : 'fail'}
              emphasis
            />
            <IncomeTargets monthly={preview.totalMonthlyCarCost} current={preview.grossMonthlyIncome} />
          </Card>

          <Card>
            <Text style={[font.heading, { color: p.text }]}>Read from the listing</Text>
            {listing.omv !== null ? <Row label="OMV" value={money(listing.omv)} /> : null}
            {listing.arf !== null ? <Row label="ARF" value={money(listing.arf)} /> : null}
            {listing.coe !== null ? <Row label="COE" value={money(listing.coe)} /> : null}
            {listing.engineCc !== null ? <Row label="Engine" value={`${listing.engineCc.toLocaleString()} cc`} /> : null}
            {listing.roadTaxAnnual !== null ? <Row label="Road tax" value={`${money(listing.roadTaxAnnual)}/yr`} /> : null}
            {listing.depreciationPerYear !== null ? (
              <Row label="Depreciation" value={`${money(listing.depreciationPerYear)}/yr`} />
            ) : null}
            {listing.registrationDate ? <Row label="Registered" value={listing.registrationDate} /> : null}
            {listing.coeMonthsRemaining !== null ? (
              <Row
                label="COE left"
                value={`${listing.coeMonthsRemaining} months (${(listing.coeMonthsRemaining / 12).toFixed(1)} yrs)`}
              />
            ) : null}
            {listing.mileageKm !== null ? <Row label="Mileage" value={`${listing.mileageKm.toLocaleString()} km`} /> : null}
            {listing.owners !== null ? <Row label="Owners" value={String(listing.owners)} /> : null}

            {listing.missing.length > 0 ? (
              <Note tone="warn">
                Could not read {listing.missing.join(', ')} from the page. Open the calculator and fill those
                in, or the verdict will be off.
              </Note>
            ) : null}

            <Pressable onPress={() => Linking.openURL(listing.sourceUrl)} accessibilityRole="link">
              <Text style={[font.caption, { color: p.accent }]}>Open the original listing ↗</Text>
            </Pressable>
          </Card>

          <Card>
            <Text style={[font.heading, { color: p.text }]}>Take it further</Text>
            <Text style={[font.caption, { color: p.textMuted, lineHeight: 18 }]}>
              Load this car into the calculator to adjust the loan, add your real parking and insurance costs,
              and see the ten-year true cost.
            </Text>
            <Button
              label="Load into calculator"
              icon="arrow-forward"
              onPress={() => {
                applyScenario(listingToScenario(listing, scenario));
                router.push('/calculator');
              }}
            />
          </Card>
        </>
      ) : null}

      {!listing && !loading && !error ? (
        <Card>
          <EmptyState
            icon="car-sport-outline"
            title="Paste a link to begin"
            body="OYC reads the asking price, OMV, ARF, COE and road tax off the page, then judges the total against your income. Nothing you paste is stored."
            action={<Button label="Try the example" variant="ghost" icon="flash-outline" onPress={() => check(EXAMPLE)} />}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

/** Income thresholds for each better band, so the number has somewhere to go. */
function IncomeTargets({ monthly, current }: { monthly: number; current: number }) {
  const p = usePalette();
  const affordable = incomeNeededForBand(monthly, 'affordable');
  const comfortable = incomeNeededForBand(monthly, 'comfortable');

  return (
    <>
      <Divider />
      <Text style={[font.label, { color: p.textMuted }]}>To move up a band you would need</Text>
      {affordable !== null ? (
        <Row
          label="Affordable (20%)"
          value={`${money(affordable)}/month`}
          tone={current >= affordable ? 'pass' : 'fail'}
        />
      ) : null}
      {comfortable !== null ? (
        <Row
          label="Comfortable (10%)"
          value={`${money(comfortable)}/month`}
          tone={current >= comfortable ? 'pass' : 'fail'}
        />
      ) : null}
    </>
  );
}

/**
 * The verdict, flashed.
 *
 * Pulses a few times on arrival and then settles: enough to make the answer
 * unmissable, not so much that it keeps drawing the eye while you read.
 */
function VerdictFlash({
  label,
  blurb,
  share,
  severe,
  monthly,
  tone,
}: {
  label: string;
  blurb: string;
  share: number;
  severe: boolean;
  monthly: number;
  tone: 'pass' | 'stretch' | 'fail';
}) {
  const p = usePalette();
  const [pulse] = useState(() => new Animated.Value(0));

  const fg = tone === 'pass' ? p.pass : tone === 'stretch' ? p.stretch : p.fail;
  const bg = tone === 'pass' ? p.passSoft : tone === 'stretch' ? p.stretchSoft : p.failSoft;

  useEffect(() => {
    pulse.setValue(0);
    const animation = Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 0.55, duration: 480, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 480, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        ]),
        { iterations: 3 },
      ),
    ]);
    animation.start();
    return () => animation.stop();
  }, [label, pulse]);

  return (
    <Animated.View
      style={{
        backgroundColor: bg,
        borderRadius: radius.lg,
        borderWidth: 2,
        borderColor: fg,
        padding: spacing.xl,
        gap: spacing.sm,
        alignItems: 'center',
        opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] }),
        transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) }],
      }}
    >
      <Text style={[font.label, { color: fg, letterSpacing: 1.6 }]}>THE VERDICT</Text>
      <Text style={{ color: fg, fontSize: 34, fontWeight: '800', letterSpacing: -1, textAlign: 'center' }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ color: p.text, fontSize: 17, fontWeight: '600' }}>
        {moneyPrecise(monthly)} a month · {percent(share, 1)} of your income
      </Text>
      <Text style={[font.caption, { color: p.textMuted, textAlign: 'center', lineHeight: 18 }]}>{blurb}</Text>
      {severe ? (
        <Text style={[font.caption, { color: fg, fontWeight: '700', textAlign: 'center' }]}>
          Over 40% of your income. This is not a car payment, it is a second rent.
        </Text>
      ) : null}
    </Animated.View>
  );
}
