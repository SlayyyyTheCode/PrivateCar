import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
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
import {
  elevation,
  font,
  motion,
  radius,
  spacing,
  usePalette,
  useReducedMotion,
  type Palette,
} from './theme';
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
          paddingTop: insets.top + spacing.lg,
          paddingBottom: spacing.xxxl * 2,
          gap: spacing.lg,
          // Prose stays readable on a tablet or a wide browser window instead
          // of stretching a caption across 1,400px.
          maxWidth: 760,
          width: '100%',
          alignSelf: 'center',
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
    <View style={{ gap: spacing.xs, marginBottom: spacing.xs }}>
      <Text style={[font.display, { color: p.text }]}>{title}</Text>
      {subtitle ? (
        <Text style={[font.body, { color: p.textMuted, maxWidth: 560 }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

/**
 * A titled region.
 *
 * Deliberately not a card: stacking a dozen identical rounded rectangles is
 * what makes an app look generated. A heading over open space gives the page
 * rhythm, and cards are kept for content that genuinely needs to sit apart.
 */
export function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const p = usePalette();
  return (
    <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[font.title, { color: p.text }]}>{title}</Text>
            {subtitle ? <Text style={[font.caption, { color: p.textMuted }]}>{subtitle}</Text> : null}
          </View>
          {action}
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Card({
  children,
  style,
  raised = false,
  padded = true,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  raised?: boolean;
  padded?: boolean;
}) {
  const p = usePalette();
  return (
    <View
      style={[
        {
          backgroundColor: p.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          padding: padded ? spacing.lg : 0,
          gap: padded ? spacing.md : 0,
          overflow: 'hidden',
        },
        raised ? elevation(p, 1) : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * A run of related rows sharing one surface, separated by hairlines.
 *
 * The alternative — one card per row — is the pattern that turns a settings
 * screen into a scrollable pile of boxes.
 */
export function Group({ children, title }: { children: ReactNode[]; title?: string }) {
  const p = usePalette();
  const items = (Array.isArray(children) ? children : [children]).filter(Boolean);

  return (
    <View style={{ gap: spacing.sm }}>
      {title ? (
        <Text style={[font.label, { color: p.textMuted, paddingHorizontal: spacing.xs }]}>{title}</Text>
      ) : null}
      <View
        style={{
          backgroundColor: p.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.border,
          overflow: 'hidden',
        }}
      >
        {items.map((child, index) => (
          <View key={index}>
            {index > 0 ? (
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border, marginLeft: spacing.lg }} />
            ) : null}
            <View style={{ paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}>{child}</View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function Divider({ inset = false }: { inset?: boolean }) {
  const p = usePalette();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: p.border,
        marginLeft: inset ? spacing.lg : 0,
      }}
    />
  );
}

/** Press feedback shared by everything tappable, so the app responds the same way everywhere. */
function usePressAnimation() {
  const reduced = useReducedMotion();
  const [scale] = useState(() => new Animated.Value(1));

  const animate = (to: number) => {
    if (reduced) return;
    Animated.timing(scale, {
      toValue: to,
      duration: motion.instant,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  };

  return {
    scale,
    onPressIn: () => animate(0.975),
    onPressOut: () => animate(1),
  };
}

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
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(defaultOpen);
  const [chevron] = useState(() => new Animated.Value(defaultOpen ? 1 : 0));

  useEffect(() => {
    if (reduced) {
      chevron.setValue(open ? 1 : 0);
      return;
    }
    Animated.timing(chevron, {
      toValue: open ? 1 : 0,
      duration: motion.fast,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [open, chevron, reduced]);

  return (
    <Card style={{ gap: open ? spacing.md : 0 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          // Keeps the whole header a 44px target without padding the card.
          minHeight: 44,
          backgroundColor: pressed ? p.pressOverlay : 'transparent',
          marginHorizontal: -spacing.lg,
          paddingHorizontal: spacing.lg,
        })}
      >
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: radius.sm,
            backgroundColor: open ? p.accentSoft : p.surfaceAlt,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name={icon} size={18} color={open ? p.accent : p.textMuted} />
        </View>
        <View style={{ flex: 1, gap: 1 }}>
          <Text style={[font.heading, { color: p.text }]}>{title}</Text>
          {summary ? <Text style={[font.caption, { color: p.textMuted }]}>{summary}</Text> : null}
        </View>
        <Animated.View
          style={{
            transform: [
              { rotate: chevron.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
            ],
          }}
        >
          <Ionicons name="chevron-down" size={18} color={p.textFaint} />
        </Animated.View>
      </Pressable>
      {open ? <View style={{ gap: spacing.md }}>{children}</View> : null}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ gap: spacing.xs + 2 }}>
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
  const [focused, setFocused] = useState(false);

  return (
    <Field label={label} hint={hint}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: focused ? p.surface : p.surfaceAlt,
          borderRadius: radius.md,
          borderWidth: focused ? 2 : StyleSheet.hairlineWidth,
          borderColor: focused ? p.focusRing : p.border,
          paddingHorizontal: spacing.md,
          // Compensate for the thicker focus border so nothing shifts.
          margin: focused ? -1 : 0,
        }}
      >
        {prefix ? <Text style={[font.body, { color: p.textFaint }]}>{prefix}</Text> : null}
        <TextInput
          value={draft ?? (value === 0 ? '' : String(Math.round(value * 100) / 100))}
          onChangeText={(next) => {
            setDraft(next);
            onChange(parseAmount(next));
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setDraft(null);
            setFocused(false);
          }}
          keyboardType="decimal-pad"
          inputMode="decimal"
          placeholder="0"
          placeholderTextColor={p.textFaint}
          style={[
            font.mono,
            { flex: 1, color: p.text, paddingVertical: spacing.md + 1, paddingHorizontal: spacing.sm },
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
  const [focused, setFocused] = useState(false);

  return (
    <Field label={label}>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={p.textFaint}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          font.body,
          {
            color: p.text,
            backgroundColor: focused ? p.surface : p.surfaceAlt,
            borderRadius: radius.md,
            borderWidth: focused ? 2 : StyleSheet.hairlineWidth,
            borderColor: focused ? p.focusRing : p.border,
            paddingVertical: spacing.md + 1,
            paddingHorizontal: spacing.md,
            margin: focused ? -1 : 0,
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
            style={({ pressed }) => [
              {
                flex: 1,
                minHeight: 38,
                paddingVertical: spacing.sm + 1,
                paddingHorizontal: 2,
                borderRadius: radius.xs + 2,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: active ? p.surface : pressed ? p.pressOverlay : 'transparent',
              },
              active ? elevation(p, 1) : null,
            ]}
          >
            <Text
              style={[
                font.label,
                { color: active ? p.text : p.textMuted, textAlign: 'center' },
              ]}
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
      accessibilityState={{ disabled }}
      accessibilityLabel={`${icon === 'add' ? 'Increase' : 'Decrease'} ${label}`}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radius.sm,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: disabled ? 'transparent' : pressed ? p.accentSoft : p.surface,
        borderWidth: disabled ? 0 : StyleSheet.hairlineWidth,
        borderColor: p.border,
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Ionicons name={icon} size={18} color={disabled ? p.textFaint : p.text} />
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
      <View style={{ flexDirection: 'row', height: 10, borderRadius: radius.pill, overflow: 'hidden', gap: 2 }}>
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
      <Text style={[font.caption, { color: p.text, flex: 1 }]}>{children}</Text>
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
}) {
  const p = usePalette();
  const press = usePressAnimation();
  const primary = variant === 'primary';
  const inert = disabled || loading;
  const ink = primary ? p.accentInk : p.text;

  return (
    <Animated.View style={{ transform: [{ scale: press.scale }] }}>
      <Pressable
        onPress={onPress}
        disabled={inert}
        onPressIn={press.onPressIn}
        onPressOut={press.onPressOut}
        accessibilityRole="button"
        accessibilityState={{ disabled: inert, busy: loading }}
        style={({ pressed }) => ({
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: spacing.sm,
          minHeight: 48,
          paddingHorizontal: spacing.lg,
          borderRadius: radius.md,
          backgroundColor: primary ? p.accent : pressed ? p.surfaceAlt : 'transparent',
          borderWidth: primary ? 0 : StyleSheet.hairlineWidth,
          borderColor: p.borderStrong,
          opacity: inert ? 0.55 : pressed && primary ? 0.9 : 1,
        })}
      >
        {loading ? (
          <ActivityIndicator size="small" color={ink} />
        ) : icon ? (
          <Ionicons name={icon} size={17} color={ink} />
        ) : null}
        <Text style={[font.label, { color: ink, fontSize: 15 }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function LinkRow({ label, url, note }: { label: string; url: string; note?: string }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={() => Linking.openURL(url)}
      accessibilityRole="link"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: spacing.sm,
        minHeight: 32,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name="open-outline" size={15} color={p.accent} style={{ marginTop: 2 }} />
      <View style={{ flex: 1 }}>
        <Text style={[font.body, { color: p.accent }]}>{label}</Text>
        {note ? <Text style={[font.caption, { color: p.textFaint }]}>{note}</Text> : null}
      </View>
    </Pressable>
  );
}

/**
 * Loading placeholder shaped like the content it replaces.
 *
 * A spinner in the middle of a card tells you nothing about what is coming; a
 * skeleton keeps the layout still and sets the expectation.
 */
export function Skeleton({
  width = '100%',
  height = 16,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const p = usePalette();
  const reduced = useReducedMotion();
  const [pulse] = useState(() => new Animated.Value(0.5));

  useEffect(() => {
    if (reduced) {
      pulse.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 720, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, reduced]);

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel="Loading"
      style={[
        { width, height, borderRadius: radius.xs, backgroundColor: p.surfaceAlt, opacity: pulse },
        style,
      ]}
    />
  );
}

/** Teaches the screen rather than announcing that it is empty. */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const p = usePalette();
  return (
    <View style={{ alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xl }}>
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: radius.xl,
          backgroundColor: p.surfaceAlt,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={24} color={p.textMuted} />
      </View>
      <View style={{ gap: spacing.xs, alignItems: 'center' }}>
        <Text style={[font.heading, { color: p.text, textAlign: 'center' }]}>{title}</Text>
        <Text style={[font.caption, { color: p.textMuted, textAlign: 'center', maxWidth: 320 }]}>{body}</Text>
      </View>
      {action}
    </View>
  );
}

/** Marks where a figure came from, at the same size as the figure itself. */
export function SourceBadge({ basis }: { basis: 'official' | 'indicative' }) {
  const p = usePalette();
  const official = basis === 'official';
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: spacing.sm + 2,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: official ? p.passSoft : p.stretchSoft,
      }}
    >
      <Ionicons
        name={official ? 'shield-checkmark' : 'alert-circle-outline'}
        size={12}
        color={official ? p.pass : p.stretch}
      />
      <Text style={[font.caption, { color: official ? p.pass : p.stretch, fontWeight: '700', fontSize: 11 }]}>
        {official ? 'Official data' : 'Indicative'}
      </Text>
    </View>
  );
}
