import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { evaluateScenario } from '../../src/core/verdict';
import type { RuleResult } from '../../src/core/types';
import { useScenario } from '../../src/state/useScenario';
import {
  BarBreakdown,
  Card,
  Divider,
  Note,
  Row,
  Screen,
  ScreenTitle,
  StatusPill,
  statusColors,
} from '../../src/ui/components';
import { money, moneyPrecise, percent } from '../../src/ui/format';
import { font, radius, spacing, usePalette } from '../../src/ui/theme';

const HEADLINE: Record<string, string> = {
  PASS: 'You can own this car.',
  STRETCH: 'You can own this car, but it will hurt.',
  FAIL: 'Not this car, not yet.',
};

export default function VerdictScreen() {
  const p = usePalette();
  const scenario = useScenario((s) => s.scenario);
  const result = useMemo(() => evaluateScenario(scenario), [scenario]);
  const c = statusColors(p, result.status);

  return (
    <Screen>
      <ScreenTitle title="Verdict" subtitle={scenario.name} />

      <Card style={{ backgroundColor: c.bg, borderColor: c.bg }}>
        <Text style={[font.title, { color: c.fg }]}>{HEADLINE[result.status]}</Text>
        <Text style={[font.display, { color: p.text }]}>{moneyPrecise(result.totalMonthlyCarCost)}</Text>
        <Text style={[font.body, { color: p.textMuted }]}>
          every month, all in — {percent(result.shareOfGrossIncome)} of your gross income and{' '}
          {percent(result.shareOfTakeHome)} of your take-home pay.
        </Text>
        <Divider />
        <Row label="Loan instalment" value={moneyPrecise(result.loan.monthlyInstalment)} />
        <Row label="Running costs" value={moneyPrecise(result.running.total)} />
        <BarBreakdown
          items={[
            { label: 'Loan', amount: result.loan.monthlyInstalment },
            { label: 'Running costs', amount: result.running.total },
          ]}
          total={result.totalMonthlyCarCost}
        />
      </Card>

      <Card>
        <Text style={[font.heading, { color: p.text }]}>The two numbers that matter</Text>
        <Row
          label="Gross income you need for this to be comfortable"
          value={money(result.requiredGrossMonthlyIncome)}
          emphasis
          tone={result.grossMonthlyIncome >= result.requiredGrossMonthlyIncome ? 'pass' : 'fail'}
        />
        <Row
          label="Cash you need before driving away"
          value={money(result.upfront.total)}
          emphasis
        />
        <Divider />
        {result.upfront.lines.map((line) => (
          <Row key={line.label} label={line.label} value={money(line.amount)} />
        ))}
      </Card>

      <TdsrCard
        ratio={result.tdsr.ratio}
        cap={result.tdsr.cap}
        pass={result.tdsr.pass}
        note={result.tdsr.note}
      />

      {result.rules.map((rule) => (
        <RuleCard key={rule.id} rule={rule} />
      ))}

      <Card>
        <Text style={[font.heading, { color: p.text }]}>Why 20-4-10 does not survive the trip here</Text>
        <Text style={[font.body, { color: p.textMuted, lineHeight: 21 }]}>
          The American rule assumes a cheap car, a cheap loan and a large income relative to the price. Two of
          its three legs break in Singapore.
        </Text>
        <Divider />
        <Text style={[font.body, { color: p.text, lineHeight: 21 }]}>
          <Text style={font.heading}>20% down is below the legal floor.</Text> MAS requires 30% if the OMV is
          $20,000 or less, and 40% above that. You cannot borrow your way to 20%.
        </Text>
        <Text style={[font.body, { color: p.text, lineHeight: 21 }]}>
          <Text style={font.heading}>4 years is the one leg that holds.</Text> It matters more here, because
          Singapore car loans charge flat interest — a 7-year loan costs 75% more interest than a 4-year one on
          the same amount borrowed.
        </Text>
        <Text style={[font.body, { color: p.text, lineHeight: 21 }]}>
          <Text style={font.heading}>10% of income is out of reach.</Text> COE alone puts a mainstream car past{' '}
          {money(result.totalMonthlyCarCost)} a month, which would demand{' '}
          {money(result.totalMonthlyCarCost * 10)} of gross monthly income.
        </Text>
        <Note>
          OYC therefore recommends a Singapore version: put down what the law requires, keep the loan to five
          years or fewer, and keep all-in car costs under 15% of gross income — treating 15–20% as a stretch and
          anything above 20% as a no.
        </Note>
      </Card>
    </Screen>
  );
}

function TdsrCard({
  ratio,
  cap,
  pass,
  note,
}: {
  ratio: number;
  cap: number;
  pass: boolean;
  note: string;
}) {
  const p = usePalette();
  const fill = Math.min(1, Number.isFinite(ratio) ? ratio / cap : 1);
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text style={[font.heading, { color: p.text, flex: 1 }]}>
          Total Debt Servicing Ratio
        </Text>
        <StatusPill status={pass ? 'PASS' : 'FAIL'} label={pass ? 'Within cap' : 'Over cap'} />
      </View>
      <Row
        label="Your debt vs gross income"
        value={Number.isFinite(ratio) ? percent(ratio, 1) : '—'}
        tone={pass ? 'pass' : 'fail'}
        emphasis
      />
      <View style={{ height: 8, borderRadius: radius.pill, backgroundColor: p.surfaceAlt, overflow: 'hidden' }}>
        <View
          style={{
            width: `${fill * 100}%`,
            height: '100%',
            backgroundColor: pass ? p.pass : p.fail,
          }}
        />
      </View>
      <Text style={[font.caption, { color: p.textMuted }]}>
        Regulatory ceiling is {percent(cap)}. {note}
      </Text>
    </Card>
  );
}

function RuleCard({ rule }: { rule: RuleResult }) {
  const p = usePalette();
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Text style={[font.heading, { color: p.text, flex: 1 }]}>{rule.name}</Text>
        <StatusPill status={rule.status} />
      </View>
      {rule.legs.map((leg, index) => (
        <View key={leg.id} style={{ gap: spacing.xs }}>
          {index > 0 ? <Divider /> : null}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Ionicons
              name={leg.pass ? 'checkmark-circle' : 'close-circle'}
              size={17}
              color={leg.pass ? p.pass : p.fail}
            />
            <Text style={[font.heading, { color: p.text, flex: 1 }]}>{leg.label}</Text>
          </View>
          <Row label={`Target: ${leg.target}`} value={leg.actual} />
          <Text style={[font.caption, { color: p.textMuted, lineHeight: 17 }]}>{leg.note}</Text>
        </View>
      ))}
    </Card>
  );
}
