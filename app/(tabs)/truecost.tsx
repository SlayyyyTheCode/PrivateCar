import { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { computeTco } from '../../src/core/tco';
import { PARF_SCHEDULES } from '../../src/data/sg-2026-08';
import { useScenario } from '../../src/state/useScenario';
import {
  BarBreakdown,
  Card,
  Divider,
  Note,
  Row,
  Screen,
  ScreenTitle,
  Stepper,
} from '../../src/ui/components';
import { money, moneyPrecise } from '../../src/ui/format';
import { font, spacing, usePalette } from '../../src/ui/theme';

export default function TrueCostScreen() {
  const p = usePalette();
  const scenario = useScenario((s) => s.scenario);
  const [holdingYears, setHoldingYears] = useState(10);

  const holdingMonths = Math.min(holdingYears * 12, scenario.car.coeMonthsRemaining);
  const tco = useMemo(() => computeTco(scenario, holdingMonths), [scenario, holdingMonths]);
  const schedule = PARF_SCHEDULES[scenario.car.parfScheme];

  return (
    <Screen>
      <ScreenTitle
        title="True cost"
        subtitle="Everything you will pay, minus everything you get back when you deregister."
      />

      <Card>
        <Stepper
          label="How long will you keep it?"
          hint={`Capped at the ${(scenario.car.coeMonthsRemaining / 12).toFixed(1)} years of COE left on this car.`}
          value={holdingYears}
          onChange={setHoldingYears}
          min={1}
          max={10}
          format={(v) => `${v} year${v === 1 ? '' : 's'}`}
        />
      </Card>

      <Card>
        <Text style={[font.label, { color: p.textMuted }]}>
          Net cost over {(tco.holdingMonths / 12).toFixed(1)} years
        </Text>
        <Text style={[font.display, { color: p.text }]}>{money(tco.netCost)}</Text>
        <Text style={[font.body, { color: p.textMuted }]}>
          That is {moneyPrecise(tco.effectiveMonthlyCost)} a month of your life, for a car with a sticker price
          of {money(tco.carPrice)}.
        </Text>
        <Divider />
        <Row label="Depreciation per year" value={money(tco.annualDepreciation)} emphasis />
        <Text style={[font.caption, { color: p.textFaint }]}>
          The figure used-car listings quote. It is what the car loses in value each year after rebates, before
          any running costs.
        </Text>
      </Card>

      <Card>
        <Text style={[font.heading, { color: p.text }]}>Money out</Text>
        {tco.outflows.map((line) => (
          <Row key={line.label} label={line.label} value={money(line.amount)} />
        ))}
        <Divider />
        <Row label="Total paid out" value={money(tco.grossOutlay)} emphasis />
        <BarBreakdown items={tco.outflows} total={tco.grossOutlay} />
      </Card>

      <Card>
        <Text style={[font.heading, { color: p.text }]}>Money back on deregistration</Text>
        <Row label={`PARF rebate (${schedule.label})`} value={money(tco.parfRebate)} tone="pass" />
        <Row label="COE rebate on unused months" value={money(tco.coeRebate)} tone="pass" />
        <Divider />
        <Row label="Total rebate" value={money(tco.totalRebate)} emphasis tone="pass" />
        <Text style={[font.caption, { color: p.textMuted, lineHeight: 17 }]}>{schedule.description}</Text>
        {scenario.car.parfScheme === 'from2026' && tco.holdingMonths >= 108 ? (
          <Note tone="warn">
            Holding to the end of the COE under the Budget 2026 schedule returns only 5% of your ARF — about{' '}
            {money(tco.parfRebate)}. Selling earlier returns far more, but you pay for the privilege in
            depreciation.
          </Note>
        ) : null}
      </Card>

      <Card>
        <Text style={[font.heading, { color: p.text }]}>What you are actually buying</Text>
        <Row label="Open Market Value — the car itself" value={money(scenario.car.omv)} />
        <Row label="Additional Registration Fee" value={money(tco.arf)} />
        <Row label="COE" value={money(scenario.car.coe)} />
        <View style={{ gap: spacing.sm }}>
          <BarBreakdown
            items={[
              { label: 'The car', amount: scenario.car.omv },
              { label: 'ARF', amount: tco.arf },
              { label: 'COE', amount: scenario.car.coe },
            ]}
            total={scenario.car.omv + tco.arf + scenario.car.coe}
          />
        </View>
        <Note>
          Taxes and the certificate usually cost several times more than the vehicle. That is the part no
          amount of haggling changes.
        </Note>
      </Card>
    </Screen>
  );
}
