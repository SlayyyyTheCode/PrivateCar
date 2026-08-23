import { Text, View } from 'react-native';
import {
  ARF_TIERS,
  COE,
  CPF_OW_CEILING,
  DATA_AS_OF,
  LOAN_RULES,
  PARKING,
  PARF_SCHEDULES,
  REGISTRATION_FEE,
  ROAD_TAX_BANDS_ICE,
  ROAD_TAX_REBATE_FACTOR,
  SOURCES,
  TDSR_CAP,
} from '../../src/data/sg-2026-08';
import { Card, Divider, LinkRow, Note, Row, Screen, ScreenTitle } from '../../src/ui/components';
import { money, percent } from '../../src/ui/format';
import { font, spacing, usePalette } from '../../src/ui/theme';

export default function LearnScreen() {
  const p = usePalette();

  return (
    <Screen>
      <ScreenTitle
        title="Learn"
        subtitle={`Every number OYC starts from, and where it came from. Data as of ${DATA_AS_OF}.`}
      />

      <Explainer
        title="Why a car costs what it does here"
        body="You are not mainly buying a car. You are buying a Certificate of Entitlement that lets you keep one for ten years, plus an Additional Registration Fee that can exceed the value of the vehicle. Together they usually cost several times the car itself, and neither is negotiable."
      />

      <Card>
        <Text style={[font.heading, { color: p.text }]}>COE — {DATA_AS_OF}</Text>
        <Row label="Category A (up to 1,600cc / 97kW)" value={money(COE.catA)} />
        <Row label="Category B (above that)" value={money(COE.catB)} />
        <Text style={[font.caption, { color: p.textMuted }]}>
          Bidding runs twice a month, so treat these as a starting point and enter the price you are actually
          quoted.
        </Text>
      </Card>

      <Card>
        <Text style={[font.heading, { color: p.text }]}>Additional Registration Fee</Text>
        <Text style={[font.caption, { color: p.textMuted }]}>
          Charged on Open Market Value in marginal bands — only the slice of OMV inside a band is taxed at
          that rate.
        </Text>
        {ARF_TIERS.map((tier) => (
          <Row
            key={tier.from}
            label={tier.to === null ? `Above ${money(tier.from)}` : `${money(tier.from)} – ${money(tier.to)}`}
            value={percent(tier.rate)}
          />
        ))}
        <Divider />
        <Row label="Registration fee" value={money(REGISTRATION_FEE)} />
      </Card>

      <Card>
        <Text style={[font.heading, { color: p.text }]}>Road tax bands (petrol)</Text>
        <Text style={[font.caption, { color: p.textMuted }]}>
          Six-monthly base figures, scaled by {ROAD_TAX_REBATE_FACTOR} and doubled for the annual charge. Cars
          over 10 years old pay 10% more per year, capped at 50%.
        </Text>
        {ROAD_TAX_BANDS_ICE.map((band) => (
          <Row
            key={band.floor}
            label={band.upTo === null ? `Above ${band.floor.toLocaleString()}cc` : `Up to ${band.upTo.toLocaleString()}cc`}
            value={band.perUnit === 0 ? `$${band.base}` : `$${band.base} + $${band.perUnit}/cc`}
          />
        ))}
      </Card>

      <Card>
        <Text style={[font.heading, { color: p.text }]}>Loan rules</Text>
        <Row label={`OMV up to ${money(LOAN_RULES.lowOmvThreshold)}`} value={`${percent(LOAN_RULES.maxLtvLowOmv)} loan`} />
        <Row label={`OMV above ${money(LOAN_RULES.lowOmvThreshold)}`} value={`${percent(LOAN_RULES.maxLtvHighOmv)} loan`} />
        <Row label="Maximum tenure" value={`${LOAN_RULES.maxTenureYears} years`} />
        <Row
          label="Typical flat rate"
          value={`${LOAN_RULES.typicalFlatRatePct.min}% – ${LOAN_RULES.typicalFlatRatePct.max}%`}
        />
        <Row label="TDSR ceiling" value={percent(TDSR_CAP)} />
        <Note>
          Rates here are quoted flat: interest is charged on the full amount borrowed for the whole term, not
          on the falling balance. A flat rate is roughly half of what it really costs you.
        </Note>
      </Card>

      <Card>
        <Text style={[font.heading, { color: p.text }]}>PARF rebate schedules</Text>
        {Object.values(PARF_SCHEDULES).map((schedule) => (
          <View key={schedule.label} style={{ gap: spacing.xs }}>
            <Text style={[font.label, { color: p.text }]}>{schedule.label}</Text>
            <Text style={[font.caption, { color: p.textMuted, lineHeight: 17 }]}>{schedule.description}</Text>
            <Row label="Cap" value={money(schedule.cap)} />
            <Row
              label="At 5 years / at 10 years"
              value={`${percent(schedule.bands[0].rateOfArf)} / ${percent(
                schedule.bands[schedule.bands.length - 1].rateOfArf,
              )}`}
            />
          </View>
        ))}
      </Card>

      <Card>
        <Text style={[font.heading, { color: p.text }]}>Parking and CPF</Text>
        <Row label="HDB season parking, surface" value={`${money(PARKING.hdbSurfaceFirstCar)}/month`} />
        <Row label="HDB season parking, sheltered" value={`${money(PARKING.hdbShelteredFirstCar)}/month`} />
        <Row label="URA season parking" value={`${money(PARKING.uraSeasonParking)}/month`} />
        <Row label="GST on parking" value={percent(PARKING.gstRate)} />
        <Divider />
        <Row label="CPF Ordinary Wage ceiling" value={`${money(CPF_OW_CEILING)}/month`} />
        <Text style={[font.caption, { color: p.textMuted }]}>
          Second-car permits are charged at half rate for cars. Rates vary by car park, so check HDB InfoWEB
          for yours.
        </Text>
      </Card>

      <Explainer
        title="The OYC rule"
        body="Put down what the law requires — 30% if OMV is $20,000 or under, 40% above. Keep the loan to five years or fewer, because flat interest makes every extra year cost the same again. Then judge the total against your gross monthly income: under 10% is comfortable, under 20% is affordable, under 30% is barely affordable, and at 30% or more something else in your life is quietly paying for the car."
      />

      <Card>
        <Text style={[font.heading, { color: p.text }]}>Sources</Text>
        {SOURCES.map((source) => (
          <LinkRow key={source.url} label={source.label} url={source.url} note={source.note} />
        ))}
      </Card>

      <Note tone="warn">
        OYC is a planning tool, not financial advice. Figures are defaults gathered in {DATA_AS_OF} and every
        one of them is editable. COE prices change twice a month and tax rules change at every Budget — always
        confirm with LTA, your bank and your insurer.
      </Note>
    </Screen>
  );
}

function Explainer({ title, body }: { title: string; body: string }) {
  const p = usePalette();
  return (
    <Card>
      <Text style={[font.heading, { color: p.text }]}>{title}</Text>
      <Text style={[font.body, { color: p.textMuted, lineHeight: 21 }]}>{body}</Text>
    </Card>
  );
}
