import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { RANGE_PRESETS, prepare, summarise, type RangePreset } from '../../src/core/history';
import {
  COE_FALLBACK,
  COE_SOURCE,
  FUEL_SERIES,
  FUEL_SOURCE,
  PARKING_SERIES,
  PARKING_SOURCE,
  RATE_GROUPS,
  type HistorySource,
  type RateGroup,
  type Series,
} from '../../src/data/history';
import { fetchCoeHistory } from '../../src/state/listingApi';
import { Card, Divider, LinkRow, Note, Row, Screen, ScreenTitle, Segmented } from '../../src/ui/components';
import { ChartLegend, TrendChart } from '../../src/ui/TrendChart';
import { money, percent } from '../../src/ui/format';
import { font, radius, spacing, usePalette } from '../../src/ui/theme';

/** Categories most people are choosing between; the rest stay out of the way. */
const COE_HEADLINE = ['Category A', 'Category B'];

export default function TrendsScreen() {
  const p = usePalette();
  const [preset, setPreset] = useState<RangePreset>(RANGE_PRESETS[2]);

  const [coe, setCoe] = useState<Series[] | null>(null);
  const [coeLive, setCoeLive] = useState(false);
  const [coeError, setCoeError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchCoeHistory(controller.signal)
      .then((series) => {
        setCoe(series.filter((entry) => COE_HEADLINE.includes(entry.label)));
        setCoeLive(true);
      })
      .catch((error: Error) => {
        if (error.name === 'AbortError') return;
        setCoe(COE_FALLBACK);
        setCoeError(error.message);
      });
    return () => controller.abort();
  }, []);

  return (
    <Screen>
      <ScreenTitle
        title="Trends"
        subtitle="What the costs of owning a car here have actually done over time."
      />

      <Card>
        <Text style={[font.label, { color: p.textMuted }]}>Time range</Text>
        <Segmented
          value={preset.id}
          options={RANGE_PRESETS.map((entry) => ({ value: entry.id, label: entry.label }))}
          onChange={(id) => setPreset(RANGE_PRESETS.find((entry) => entry.id === id) ?? RANGE_PRESETS[2])}
        />
        <Text style={[font.caption, { color: p.textFaint }]}>
          {preset.granularity === 'day'
            ? 'Every bidding exercise and price point.'
            : preset.granularity === 'month'
              ? 'Averaged by month.'
              : 'Averaged by year.'}
        </Text>
      </Card>

      {coe === null ? (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
            <ActivityIndicator color={p.accent} />
            <Text style={[font.body, { color: p.textMuted }]}>Loading COE results from LTA…</Text>
          </View>
        </Card>
      ) : (
        <TrendCard
          title="COE premiums"
          caption={
            coeLive
              ? 'Every bidding exercise since 2010, straight from LTA.'
              : 'Live results unavailable — showing bundled reference points.'
          }
          series={coe}
          preset={preset}
          format={(value) => `$${Math.round(value / 1000)}k`}
          formatExact={(value) => money(value)}
          source={COE_SOURCE}
          warning={coeError ?? undefined}
        />
      )}

      <TrendCard
        title="Pump prices"
        caption="Posted price before card discounts, which typically take 15–20% off."
        series={FUEL_SERIES}
        preset={preset}
        format={(value) => `$${value.toFixed(2)}`}
        formatExact={(value) => `$${value.toFixed(2)} per litre`}
        source={FUEL_SOURCE}
      />

      <TrendCard
        title="Season parking"
        caption="A resident’s first car, before GST. Public rates change rarely."
        series={PARKING_SERIES}
        preset={preset}
        format={(value) => `$${Math.round(value)}`}
        formatExact={(value) => `${money(value)} a month`}
        source={PARKING_SOURCE}
      />

      <Text style={[font.display, { color: p.text, marginTop: spacing.md }]}>What things cost</Text>
      <Text style={[font.body, { color: p.textMuted }]}>
        Five typical bands for each running cost, so you can tell whether a quote you have been given is
        reasonable.
      </Text>

      {RATE_GROUPS.map((group) => (
        <RateCard key={group.id} group={group} />
      ))}
    </Screen>
  );
}

function TrendCard({
  title,
  caption,
  series,
  preset,
  format,
  formatExact,
  source,
  warning,
}: {
  title: string;
  caption: string;
  series: Series[];
  preset: RangePreset;
  format: (value: number) => string;
  formatExact: (value: number) => string;
  source: HistorySource;
  warning?: string;
}) {
  const p = usePalette();
  const prepared = useMemo(() => prepare(series, preset), [series, preset]);

  // Headline the first series; the rest are in the chart and the legend.
  const summary = useMemo(() => summarise(prepared[0]?.points ?? []), [prepared]);
  const rising = summary.change > 0;

  return (
    <Card>
      <Text style={[font.heading, { color: p.text }]}>{title}</Text>
      <Text style={[font.caption, { color: p.textMuted }]}>{caption}</Text>

      {summary.latest ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, flexWrap: 'wrap' }}>
          <Text style={{ color: p.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.6 }}>
            {formatExact(summary.latest.value)}
          </Text>
          <Text
            style={[
              font.label,
              { color: summary.change === 0 ? p.textMuted : rising ? p.fail : p.pass },
            ]}
          >
            {summary.change === 0
              ? 'unchanged'
              : `${rising ? '▲' : '▼'} ${percent(Math.abs(summary.changePct), 0)} over ${preset.label.toLowerCase()}`}
          </Text>
        </View>
      ) : null}

      <ChartLegend series={prepared} />
      <TrendChart series={prepared} format={format} />

      <Divider />
      {summary.min && summary.max ? (
        <>
          <Row label={`Lowest (${prepared[0]?.label ?? ''})`} value={formatExact(summary.min.value)} />
          <Row label={`Highest (${prepared[0]?.label ?? ''})`} value={formatExact(summary.max.value)} />
        </>
      ) : null}

      {warning ? <Note tone="warn">{warning}</Note> : null}

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <View
          style={{
            paddingHorizontal: spacing.sm,
            paddingVertical: 2,
            borderRadius: radius.pill,
            backgroundColor: source.basis === 'official' ? p.passSoft : p.stretchSoft,
          }}
        >
          <Text
            style={[
              font.caption,
              { color: source.basis === 'official' ? p.pass : p.stretch, fontWeight: '700', fontSize: 11 },
            ]}
          >
            {source.basis === 'official' ? 'OFFICIAL DATA' : 'INDICATIVE'}
          </Text>
        </View>
      </View>
      <Text style={[font.caption, { color: p.textFaint, lineHeight: 17 }]}>{source.note}</Text>
      <LinkRow label={source.label} url={source.url} />
    </Card>
  );
}

function RateCard({ group }: { group: RateGroup }) {
  const p = usePalette();
  const widest = Math.max(...group.bands.map((band) => band.high));

  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Text style={[font.heading, { color: p.text, flex: 1 }]}>{group.title}</Text>
        <Ionicons name="pricetag-outline" size={15} color={p.textFaint} />
      </View>
      <Text style={[font.caption, { color: p.textFaint }]}>
        Feeds the “{group.appliesTo}” field on the calculator.
      </Text>

      {group.bands.map((band) => (
        <View key={band.label} style={{ gap: 5 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md }}>
            <Text style={[font.body, { color: p.text, flex: 1 }]}>{band.label}</Text>
            <Text style={[font.mono, { color: p.text, fontSize: 14 }]}>
              {money(band.low)}–{money(band.high)}
            </Text>
          </View>

          {/* The bar shows where the band sits against the widest in the group. */}
          <View style={{ height: 6, backgroundColor: p.surfaceAlt, borderRadius: radius.pill }}>
            <View
              style={{
                position: 'absolute',
                left: `${(band.low / widest) * 100}%`,
                width: `${((band.high - band.low) / widest) * 100}%`,
                height: 6,
                borderRadius: radius.pill,
                backgroundColor: p.accent,
              }}
            />
          </View>

          <Text style={[font.caption, { color: p.textFaint }]}>
            {band.unit} · {band.note}
          </Text>
        </View>
      ))}

      <Note>{group.source.note}</Note>
    </Card>
  );
}
