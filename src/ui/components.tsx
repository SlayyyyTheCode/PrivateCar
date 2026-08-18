import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AffordabilityStatus } from '../core/types';
import { font, radius, spacing, usePalette, type Palette } from './theme';
import { parseAmount } from './format';

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Screen({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: p.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: insets.top + spacing.md,
          paddingBottom: spacing.xxl * 2,
          gap: spacing.lg,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
      {footer}
    </View>
  );
}

export function ScreenTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const p = usePalette();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[font.display, { color: p.text }]}>{title}</Text>
      {subtitle ? <Text style={[font.body, { color: p.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const p = usePalette();
  return (
    <View
      style={[
        {
          backgroundColor: p.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: spacing.lg,
          gap: spacing.md,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** A card whose body can be folded away — the input screen is long. */
export function Accordion({
  title,
  summary,
  icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  icon: keyof typeof Ionicons.glyphMap;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Card style={{ gap: open ? spacing.md : 0 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      >
        <View
          style={{
            width: 34,
            height: 34,
            borderRadius: radius.sm,
            backgroundColor: p.accentSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={18} color={p.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[font.heading, { color: p.text }]}>{title}</Text>
          {summary ? <Text style={[font.caption, { color: p.textMuted }]}>{summary}</Text> : null}
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={p.textFaint} />
      </Pressable>
      {open ? <View style={{ gap: spacing.md }}>{children}</View> : null}
    </Card>
  );
}

export function Divider() {
  const p = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />;
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={[font.label, { color: p.textMuted }]}>{label}</Text>
      {children}
      {hint ? <Text style={[font.caption, { color: p.textFaint }]}>{hint}</Text> : null}
    </View>
  );
}

export function AmountInput({
  label,
  hint,
  value,
  onChange,
  prefix = '$',
  suffix,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (next: number) => void;
  prefix?: string | null;
  suffix?: string;
}) {
  const p = usePalette();
  // Holds the raw keystrokes while focused so typing "1.0" is not rewritten to "1".
  const [draft, setDraft] = useState<string | null>(null);

  return (
    <Field label={label} hint={hint}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: p.surfaceAlt,
          borderRadius: radius.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          paddingHorizontal: spacing.md,
        }}
      >
        {prefix ? <Text style={[font.body, { color: p.textFaint }]}>{prefix}</Text> : null}
        <TextInput
          value={draft ?? (value === 0 ? '' : String(Math.round(value * 100) / 100))}
          onChangeText={(next) => {
            setDraft(next);
            onChange(parseAmount(next));
          }}
          onBlur={() => setDraft(null)}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0"
          placeholderTextColor={p.textFaint}
          style={[
            font.mono,
            { flex: 1, color: p.text, paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
          ]}
        />
        {suffix ? <Text style={[font.caption, { color: p.textFaint }]}>{suffix}</Text> : null}
      </View>
    </Field>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const p = usePalette();
  return (
    <Field label={label}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={p.textFaint}
        style={[
          font.body,
          {
            color: p.text,
            backgroundColor: p.surfaceAlt,
            borderRadius: radius.md,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.border,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
          },
        ]}
      />
    </Field>
  );
}

export function Segmented<T extends string>({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label?: string;
  hint?: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (next: T) => void;
}) {
  const p = usePalette();
  const control = (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: p.surfaceAlt,
        borderRadius: radius.md,
        padding: 3,
        gap: 3,
      }}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            style={{
              flex: 1,
              paddingVertical: spacing.sm + 2,
              borderRadius: radius.sm,
              alignItems: 'center',
              backgroundColor: active ? p.surface : 'transparent',
            }}
          >
            <Text
              style={[font.label, { color: active ? p.text : p.textMuted, textAlign: 'center' }]}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  return label ? (
    <Field label={label} hint={hint}>
      {control}
    </Field>
  ) : (
    control
  );
}

/** Stepper for values where tapping beats typing. */
export function Stepper({
  label,
  hint,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
}: {
  label: string;
  hint?: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step?: number;
  format: (value: number) => string;
}) {
  const p = usePalette();
  const clamp = (next: number) => Math.min(max, Math.max(min, Math.round(next * 1000) / 1000));

  const button = (icon: 'remove' | 'add', delta: number, disabled: boolean) => (
    <Pressable
      onPress={() => onChange(clamp(value + delta))}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${icon === 'add' ? 'Increase' : 'Decrease'} ${label}`}
      style={{
        width: 40,
        height: 40,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: disabled ? 'transparent' : p.surface,
        opacity: disabled ? 0.35 : 1,
      }}
    >
      <Ionicons name={icon} size={18} color={p.text} />
    </Pressable>
  );

  return (
    <Field label={label} hint={hint}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: p.surfaceAlt,
          borderRadius: radius.md,
          padding: 3,
        }}
      >
        {button('remove', -step, value <= min)}
        <Text style={[font.mono, { flex: 1, textAlign: 'center', color: p.text }]}>{format(value)}</Text>
        {button('add', step, value >= max)}
      </View>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

export function statusColors(p: Palette, status: AffordabilityStatus) {
  if (status === 'PASS') return { fg: p.pass, bg: p.passSoft };
  if (status === 'STRETCH') return { fg: p.stretch, bg: p.stretchSoft };
  return { fg: p.fail, bg: p.failSoft };
}

export const STATUS_WORD: Record<AffordabilityStatus, string> = {
  PASS: 'Affordable',
  STRETCH: 'A stretch',
  FAIL: 'Not yet',
};

export function StatusPill({ status, label }: { status: AffordabilityStatus; label?: string }) {
  const p = usePalette();
  const c = statusColors(p, status);
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: c.bg,
        borderRadius: radius.pill,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
      }}
    >
      <Text style={[font.label, { color: c.fg }]}>{label ?? STATUS_WORD[status]}</Text>
    </View>
  );
}

export function Row({
  label,
  value,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  tone?: 'default' | 'pass' | 'fail';
}) {
  const p = usePalette();
  const valueColor = tone === 'pass' ? p.pass : tone === 'fail' ? p.fail : p.text;
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: spacing.md,
      }}
    >
      <Text
        style={[emphasis ? font.heading : font.body, { color: emphasis ? p.text : p.textMuted, flex: 1 }]}
      >
        {label}
      </Text>
      <Text style={[font.mono, { color: valueColor, fontSize: emphasis ? 17 : 15 }]}>{value}</Text>
    </View>
  );
}

/** Proportional bar showing where the money actually goes. */
export function BarBreakdown({
  items,
  total,
}: {
  items: { label: string; amount: number }[];
  total: number;
}) {
  const p = usePalette();
  const palette = [p.accent, p.pass, p.stretch, p.fail, p.textMuted];
  const visible = items.filter((item) => item.amount > 0);
  if (total <= 0 || visible.length === 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', height: 10, borderRadius: radius.pill, overflow: 'hidden' }}>
        {visible.map((item, i) => (
          <View
            key={item.label}
            style={{ flex: item.amount / total, backgroundColor: palette[i % palette.length] }}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {visible.map((item, i) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 }}>
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: palette[i % palette.length] }}
            />
            <Text style={[font.caption, { color: p.textMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function Note({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  const p = usePalette();
  const bg = tone === 'warn' ? p.failSoft : p.accentSoft;
  const fg = tone === 'warn' ? p.fail : p.accent;
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.sm,
        backgroundColor: bg,
        borderRadius: radius.md,
        padding: spacing.md,
      }}
    >
      <Ionicons
        name={tone === 'warn' ? 'alert-circle' : 'information-circle'}
        size={16}
        color={fg}
        style={{ marginTop: 1 }}
      />
      <Text style={[font.caption, { color: p.text, flex: 1, lineHeight: 17 }]}>{children}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const p = usePalette();
  const primary = variant === 'primary';
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderRadius: radius.md,
        backgroundColor: primary ? p.accent : 'transparent',
        borderWidth: primary ? 0 : StyleSheet.hairlineWidth,
        borderColor: p.border,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {icon ? <Ionicons name={icon} size={16} color={primary ? '#FFFFFF' : p.text} /> : null}
      <Text style={[font.label, { color: primary ? '#FFFFFF' : p.text }]}>{label}</Text>
    </Pressable>
  );
}

export function LinkRow({ label, url, note }: { label: string; url: string; note?: string }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}
    >
      <Ionicons name="open-outline" size={15} color={p.accent} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[font.body, { color: p.accent }]}>{label}</Text>
        {note ? <Text style={[font.caption, { color: p.textFaint }]}>{note}</Text> : null}
      </View>
    </Pressable>
  );
}
