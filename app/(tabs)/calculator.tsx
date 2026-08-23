import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { minDownPaymentPct } from '../../src/core/loan';
import { buildUpPrice } from '../../src/core/price';
import { evaluateScenario } from '../../src/core/verdict';
import type { FuelType, ParfScheme, PriceMode } from '../../src/core/types';
import { COE, LOAN_RULES, PARF_SCHEDULES } from '../../src/data/sg-2026-08';
import { useScenario } from '../../src/state/useScenario';
import {
  Accordion,
  AmountInput,
  Button,
  Divider,
  Note,
  Row,
  Screen,
  ScreenTitle,
  Segmented,
  STATUS_WORD,
  Stepper,
  statusColors,
  TextField,
} from '../../src/ui/components';
import { money, moneyPrecise, percent } from '../../src/ui/format';
import { font, radius, spacing, usePalette } from '../../src/ui/theme';

export default function InputsScreen() {
  const p = usePalette();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const scenario = useScenario((s) => s.scenario);
  const setIncome = useScenario((s) => s.setIncome);
  const setCar = useScenario((s) => s.setCar);
  const setLoan = useScenario((s) => s.setLoan);
  const setRunning = useScenario((s) => s.setRunning);
  const addCostLine = useScenario((s) => s.addCostLine);
  const updateCostLine = useScenario((s) => s.updateCostLine);
  const removeCostLine = useScenario((s) => s.removeCostLine);
  const rename = useScenario((s) => s.rename);
  const saveCurrent = useScenario((s) => s.saveCurrent);
  const reset = useScenario((s) => s.reset);

  const result = useMemo(() => evaluateScenario(scenario), [scenario]);
  const legalMinDown = minDownPaymentPct(scenario.car.omv);
  const isEv = scenario.car.fuelType === 'ev';

  return (
    <Screen
      footer={
        <VerdictBar
          status={result.status}
          monthly={result.totalMonthlyCarCost}
          share={result.shareOfGrossIncome}
          bottomInset={insets.bottom}
          onPress={() => router.push('/verdict')}
        />
      }
    >
      <ScreenTitle
        title="OYC"
        subtitle="Own Your Car — what a car in Singapore really costs you, before you sign anything."
      />

      <Accordion
        title="Your income"
        icon="wallet-outline"
        summary={`${money(scenario.income.grossMonthlyIncome)}/month gross`}
        defaultOpen
      >
        <AmountInput
          label="Monthly income (gross, before CPF)"
          value={scenario.income.grossMonthlyIncome}
          onChange={(grossMonthlyIncome) => setIncome({ grossMonthlyIncome })}
        />
        <Stepper
          label="Bonus / AWS"
          hint="Extra months of salary you receive each year."
          value={scenario.income.annualBonusMonths}
          onChange={(annualBonusMonths) => setIncome({ annualBonusMonths })}
          min={0}
          max={12}
          step={0.5}
          format={(v) => `${v} month${v === 1 ? '' : 's'}`}
        />
        <Stepper
          label="Your age"
          hint="Sets your CPF contribution rate."
          value={scenario.income.age}
          onChange={(age) => setIncome({ age })}
          min={18}
          max={80}
          format={(v) => `${v} years old`}
        />

        <Divider />
        <Row label="Annual income" value={money(result.annualGrossIncome)} />
        <Row label="Income after CPF (monthly)" value={money(result.monthlyIncomeAfterCpf)} />

        <Segmented
          label="Take-home pay"
          value={scenario.income.takeHomeOverride === null ? 'auto' : 'manual'}
          options={[
            { value: 'auto', label: 'Estimate from CPF' },
            { value: 'manual', label: 'I will enter it' },
          ]}
          onChange={(mode) =>
            setIncome({
              takeHomeOverride: mode === 'auto' ? null : Math.round(result.monthlyIncomeAfterCpf),
            })
          }
        />
        {scenario.income.takeHomeOverride !== null ? (
          <AmountInput
            label="Actual monthly take-home"
            value={scenario.income.takeHomeOverride}
            onChange={(takeHomeOverride) => setIncome({ takeHomeOverride })}
          />
        ) : null}

        <AmountInput
          label="Other monthly debt repayments"
          hint="Mortgage, study loan, other instalments. Counted towards the 55% TDSR ceiling."
          value={scenario.income.otherMonthlyDebt}
          onChange={(otherMonthlyDebt) => setIncome({ otherMonthlyDebt })}
        />
      </Accordion>

      <Accordion
        title="The car"
        icon="car-sport-outline"
        summary={`${money(result.carPrice)} on the road`}
      >
        <Segmented
          label="How do you know the price?"
          value={scenario.car.priceMode}
          options={[
            { value: 'total' as PriceMode, label: 'Dealer price' },
            { value: 'buildUp' as PriceMode, label: 'Build it up' },
          ]}
          onChange={(priceMode) => setCar({ priceMode })}
        />

        {scenario.car.priceMode === 'total' ? (
          <AmountInput
            label="Advertised price (including COE)"
            value={scenario.car.totalPrice}
            onChange={(totalPrice) => setCar({ totalPrice })}
          />
        ) : (
          <>
            <AmountInput
              label="COE premium"
              hint={`Cat A is currently ${money(COE.catA)}, Cat B ${money(COE.catB)}.`}
              value={scenario.car.coe}
              onChange={(coe) => setCar({ coe })}
            />
            <AmountInput
              label="Dealer margin and extras"
              value={scenario.car.dealerMargin}
              onChange={(dealerMargin) => setCar({ dealerMargin })}
            />
            <Divider />
            {buildUpPrice(scenario.car).lines.map((line) => (
              <Row key={line.label} label={line.label} value={money(line.amount)} />
            ))}
            <Row label="On-the-road price" value={money(result.carPrice)} emphasis />
          </>
        )}

        <AmountInput
          label="Open Market Value (OMV)"
          hint="On the dealer's price list. Sets your ARF and your legal minimum down payment."
          value={scenario.car.omv}
          onChange={(omv) => setCar({ omv })}
        />

        {scenario.car.priceMode === 'total' ? (
          <AmountInput
            label="COE included in that price"
            hint="Used to work out your COE rebate if you sell before 10 years."
            value={scenario.car.coe}
            onChange={(coe) => setCar({ coe })}
          />
        ) : null}

        <Segmented
          label="Fuel type"
          value={scenario.car.fuelType}
          options={[
            { value: 'petrol' as FuelType, label: 'Petrol' },
            { value: 'hybrid' as FuelType, label: 'Hybrid' },
            { value: 'ev' as FuelType, label: 'Electric' },
            { value: 'diesel' as FuelType, label: 'Diesel' },
          ]}
          onChange={(fuelType) => setCar({ fuelType })}
        />

        {isEv ? (
          <AmountInput
            label="Motor power"
            hint="Sets your road tax band."
            value={scenario.car.motorPowerKw}
            onChange={(motorPowerKw) => setCar({ motorPowerKw })}
            prefix={null}
            suffix="kW"
          />
        ) : (
          <AmountInput
            label="Engine capacity"
            hint="Sets your road tax band. Above 1,600cc also means Cat B COE."
            value={scenario.car.engineCc}
            onChange={(engineCc) => setCar({ engineCc })}
            prefix={null}
            suffix="cc"
          />
        )}

        <Stepper
          label="Age of the car"
          hint="Road tax rises 10% a year once a car passes 10 years."
          value={scenario.car.vehicleAgeYears}
          onChange={(vehicleAgeYears) => setCar({ vehicleAgeYears })}
          min={0}
          max={20}
          format={(v) => (v === 0 ? 'Brand new' : `${v} year${v === 1 ? '' : 's'} old`)}
        />
        <Stepper
          label="COE remaining"
          value={scenario.car.coeMonthsRemaining}
          onChange={(coeMonthsRemaining) => setCar({ coeMonthsRemaining })}
          min={6}
          max={120}
          step={6}
          format={(v) => `${v} months (${(v / 12).toFixed(1)} years)`}
        />
        <Segmented
          label="PARF rebate scheme"
          hint={PARF_SCHEDULES[scenario.car.parfScheme].description}
          value={scenario.car.parfScheme}
          options={[
            { value: 'from2026' as ParfScheme, label: 'From Feb 2026' },
            { value: 'legacy' as ParfScheme, label: '2023 – Jan 2026' },
          ]}
          onChange={(parfScheme) => setCar({ parfScheme })}
        />
      </Accordion>

      <Accordion
        title="The loan"
        icon="cash-outline"
        summary={`${moneyPrecise(result.loan.monthlyInstalment)}/month`}
      >
        <Stepper
          label="Down payment"
          hint={`Singapore requires at least ${percent(legalMinDown)} for this OMV.`}
          value={scenario.loan.downPaymentPct}
          onChange={(downPaymentPct) => setLoan({ downPaymentPct })}
          min={0.1}
          max={1}
          step={0.05}
          format={(v) => `${percent(v)} — ${money(result.carPrice * v)}`}
        />
        <Stepper
          label="Loan tenure"
          value={scenario.loan.tenureYears}
          onChange={(tenureYears) => setLoan({ tenureYears })}
          min={1}
          max={10}
          format={(v) => `${v} year${v === 1 ? '' : 's'}`}
        />
        <Stepper
          label="Flat interest rate"
          hint={`Dealers currently quote ${LOAN_RULES.typicalFlatRatePct.min}%–${LOAN_RULES.typicalFlatRatePct.max}% flat.`}
          value={scenario.loan.flatRatePct}
          onChange={(flatRatePct) => setLoan({ flatRatePct })}
          min={0}
          max={8}
          step={0.01}
          format={(v) => `${v.toFixed(2)}% p.a. flat`}
        />

        {result.loan.violations.map((violation) => (
          <Note key={violation.rule} tone="warn">
            {violation.message}
          </Note>
        ))}

        <Divider />
        <Row label="Down payment" value={money(result.loan.downPayment)} />
        <Row label="Amount borrowed" value={money(result.loan.principal)} />
        <Row label="Total interest" value={money(result.loan.totalInterest)} />
        <Row label="Monthly instalment" value={moneyPrecise(result.loan.monthlyInstalment)} emphasis />
        <Note>
          That {scenario.loan.flatRatePct.toFixed(2)}% flat rate is really{' '}
          {result.loan.effectiveRatePct.toFixed(2)}% a year on the reducing balance. Flat-rate interest is
          charged on the full amount borrowed for the whole term, even as you pay it down.
        </Note>
      </Accordion>

      <Accordion
        title="Monthly car expenses"
        icon="construct-outline"
        summary={`${moneyPrecise(result.running.total)}/month`}
      >
        <AmountInput
          label={isEv ? 'Charging' : 'Petrol'}
          value={scenario.running.petrol}
          onChange={(petrol) => setRunning({ petrol })}
        />
        <AmountInput
          label="Maintenance"
          value={scenario.running.maintenance}
          onChange={(maintenance) => setRunning({ maintenance })}
        />
        <AmountInput
          label="Servicing"
          value={scenario.running.servicing}
          onChange={(servicing) => setRunning({ servicing })}
        />
        <AmountInput
          label="Washing"
          value={scenario.running.washing}
          onChange={(washing) => setRunning({ washing })}
        />
        <AmountInput
          label="HDB season parking"
          hint="Currently $80 surface / $110 sheltered a month for a first car, before GST."
          value={scenario.running.hdbSeasonParking}
          onChange={(hdbSeasonParking) => setRunning({ hdbSeasonParking })}
        />
        <AmountInput
          label="Other parking"
          hint="Office season parking, malls, hourly rates."
          value={scenario.running.otherParking}
          onChange={(otherParking) => setRunning({ otherParking })}
        />
        <AmountInput
          label="Insurance"
          value={scenario.running.insurance}
          onChange={(insurance) => setRunning({ insurance })}
        />
        <AmountInput label="ERP" value={scenario.running.erp} onChange={(erp) => setRunning({ erp })} />

        <Segmented
          label="Road tax"
          hint={`Working out to ${money(result.running.roadTaxAnnual)} a year.`}
          value={scenario.running.roadTaxMode}
          options={[
            { value: 'auto' as const, label: 'Calculate for me' },
            { value: 'manual' as const, label: 'I know it' },
          ]}
          onChange={(roadTaxMode) =>
            setRunning({
              roadTaxMode,
              roadTaxAnnualOverride:
                roadTaxMode === 'manual' ? result.running.roadTaxAnnual : scenario.running.roadTaxAnnualOverride,
            })
          }
        />
        {scenario.running.roadTaxMode === 'manual' ? (
          <AmountInput
            label="Road tax per year"
            value={scenario.running.roadTaxAnnualOverride}
            onChange={(roadTaxAnnualOverride) => setRunning({ roadTaxAnnualOverride })}
          />
        ) : null}

        {scenario.running.others.map((line) => (
          <View key={line.id} style={{ gap: spacing.sm }}>
            <TextField
              label="Other expense"
              value={line.label}
              placeholder="What is it?"
              onChange={(label) => updateCostLine(line.id, { label })}
            />
            <AmountInput
              label="Amount per month"
              value={line.monthly}
              onChange={(monthly) => updateCostLine(line.id, { monthly })}
            />
            <Pressable
              onPress={() => removeCostLine(line.id)}
              accessibilityRole="button"
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}
            >
              <Ionicons name="trash-outline" size={14} color={p.fail} />
              <Text style={[font.caption, { color: p.fail }]}>Remove</Text>
            </Pressable>
          </View>
        ))}
        <Button label="Add another expense" icon="add" variant="ghost" onPress={addCostLine} />

        <Divider />
        <Row label="Total monthly expenses" value={moneyPrecise(result.running.total)} emphasis />

        <AmountInput
          label="Your monthly budget for the car"
          hint="What you were hoping to spend, all in."
          value={scenario.running.monthlyBudget}
          onChange={(monthlyBudget) => setRunning({ monthlyBudget })}
        />
        <Row
          label={result.budgetDelta >= 0 ? 'Under your budget by' : 'Over your budget by'}
          value={moneyPrecise(Math.abs(result.budgetDelta))}
          tone={result.budgetDelta >= 0 ? 'pass' : 'fail'}
          emphasis
        />
      </Accordion>

      <Accordion title="Save this scenario" icon="bookmark-outline" summary={scenario.name}>
        <TextField label="Name" value={scenario.name} onChange={rename} placeholder="e.g. Civic 1.6" />
        <SavedList />
        <View style={{ flexDirection: 'row', gap: spacing.md }}>
          <View style={{ flex: 1 }}>
            <Button label="Save" icon="bookmark" onPress={saveCurrent} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Reset" icon="refresh" variant="ghost" onPress={reset} />
          </View>
        </View>
      </Accordion>

      <Note>
        OYC gives you estimates for planning, not financial advice. Confirm every figure with LTA, your bank
        and your insurer before you commit.
      </Note>
    </Screen>
  );
}

function SavedList() {
  const p = usePalette();
  const saved = useScenario((s) => s.saved);
  const loadSaved = useScenario((s) => s.loadSaved);
  const deleteSaved = useScenario((s) => s.deleteSaved);

  if (saved.length === 0) {
    return <Text style={[font.caption, { color: p.textFaint }]}>Nothing saved yet. Keep up to 3 cars here to compare.</Text>;
  }

  return (
    <View style={{ gap: spacing.sm }}>
      {saved.map((item) => (
        <View
          key={item.id}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            backgroundColor: p.surfaceAlt,
            borderRadius: radius.md,
            padding: spacing.md,
          }}
        >
          <Pressable style={{ flex: 1 }} onPress={() => loadSaved(item.id)} accessibilityRole="button">
            <Text style={[font.label, { color: p.text }]}>{item.name}</Text>
            <Text style={[font.caption, { color: p.textMuted }]}>
              {money(item.car.priceMode === 'total' ? item.car.totalPrice : item.car.omv)} ·{' '}
              {item.loan.tenureYears}y · {percent(item.loan.downPaymentPct)} down
            </Text>
          </Pressable>
          <Pressable onPress={() => deleteSaved(item.id)} accessibilityRole="button" accessibilityLabel={`Delete ${item.name}`}>
            <Ionicons name="close" size={16} color={p.textFaint} />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

/** Always-visible summary so the effect of every keystroke is immediately obvious. */
function VerdictBar({
  status,
  monthly,
  share,
  bottomInset,
  onPress,
}: {
  status: 'PASS' | 'STRETCH' | 'FAIL';
  monthly: number;
  share: number;
  bottomInset: number;
  onPress: () => void;
}) {
  const p = usePalette();
  const c = statusColors(p, status);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        position: 'absolute',
        left: spacing.lg,
        right: spacing.lg,
        bottom: bottomInset + spacing.sm,
        backgroundColor: p.surface,
        borderRadius: radius.lg,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.border,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
        shadowColor: p.shadow,
        shadowOpacity: 0.18,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 8,
      }}
    >
      <View
        style={{
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.xs + 2,
          borderRadius: radius.pill,
          backgroundColor: c.bg,
        }}
      >
        <Text style={[font.label, { color: c.fg }]}>{STATUS_WORD[status]}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[font.mono, { color: p.text }]}>{moneyPrecise(monthly)} / month</Text>
        <Text style={[font.caption, { color: p.textMuted }]}>
          {Number.isFinite(share) ? `${percent(share)} of your gross income` : 'Enter your income'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={p.textFaint} />
    </Pressable>
  );
}
