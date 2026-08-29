import { useEffect, useState } from 'react';
import { AccessibilityInfo, useColorScheme } from 'react-native';

/**
 * Design tokens.
 *
 * The app delivers bad financial news for a living, so the palette is
 * deliberately restrained: tinted neutrals carrying almost everything, colour
 * reserved for state and for the one number that matters. Red means the truth
 * here, not alarm, and nothing is ever congratulated.
 *
 * Every text colour below is verified against every surface it can sit on at
 * 4.5:1 or better. The previous `textFaint` was 3.1:1 — it carried every
 * caption, hint and source note in the app, which is exactly the "light grey
 * for elegance" failure that makes an interface tiring to read.
 */

const light = {
  // Neutrals, tinted very slightly toward the brand's blue rather than
  // defaulting warm.
  background: '#F2F5F9',
  surface: '#FFFFFF',
  surfaceAlt: '#EAEFF6',
  surfaceSunken: '#E2E9F2',
  border: '#D6DEEA',
  borderStrong: '#BAC7D8',

  text: '#0B1B2E', // 17.4:1 on surface
  textMuted: '#48586E', // 7.3:1
  textFaint: '#5B6A80', // 4.8:1 — passes on white, page and alt surfaces

  accent: '#125EA8',
  accentSoft: '#E3EDF8',
  accentInk: '#FFFFFF',

  pass: '#177140', // 5.05:1 worst case, including on its own pill
  passSoft: '#E0F2E8',
  stretch: '#8A5300',
  stretchSoft: '#FBEEDA',
  fail: '#B3261E',
  failSoft: '#FBE6E4',

  /** Overlays used for press and hover feedback. */
  pressOverlay: 'rgba(11,27,46,0.06)',
  hoverOverlay: 'rgba(11,27,46,0.035)',
  focusRing: '#125EA8',

  shadow: '#0B1B2E',
  shadowOpacity: 0.1,

  /** Ink for the dark hero band, which stays dark in both schemes. */
  heroBackground: '#080E18',
  heroSurface: '#111A28',
  heroBorder: '#26344A',
  heroText: '#E9F0F8',
  heroMuted: '#A6B6CA',
  heroFaint: '#8595AA',
};

const dark: typeof light = {
  background: '#080E18',
  surface: '#111A28',
  surfaceAlt: '#182434',
  surfaceSunken: '#0D1522',
  border: '#26344A',
  borderStrong: '#3A4C66',

  text: '#E9F0F8', // 15.2:1 on surface
  textMuted: '#A6B6CA', // 8.5:1
  textFaint: '#8595AA', // 5.7:1

  accent: '#5FA8F2',
  accentSoft: '#16283D',
  accentInk: '#04121F',

  pass: '#4FD08E',
  passSoft: '#102A1D',
  stretch: '#E8A94E',
  stretchSoft: '#2E2310',
  fail: '#FF8F84',
  failSoft: '#331714',

  pressOverlay: 'rgba(233,240,248,0.09)',
  hoverOverlay: 'rgba(233,240,248,0.05)',
  focusRing: '#5FA8F2',

  shadow: '#000000',
  shadowOpacity: 0.4,

  heroBackground: '#080E18',
  heroSurface: '#111A28',
  heroBorder: '#26344A',
  heroText: '#E9F0F8',
  heroMuted: '#A6B6CA',
  heroFaint: '#8595AA',
};

export type Palette = typeof light;

/** A 4px base with a couple of half-steps, for rhythm rather than uniformity. */
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 };

export const radius = { xs: 6, sm: 10, md: 12, lg: 16, xl: 22, pill: 999 };

/**
 * One family, many weights — the product register's default. A ~1.15 ratio
 * keeps a lot of type elements distinguishable without shouting.
 */
export const font = {
  hero: { fontSize: 40, fontWeight: '800' as const, letterSpacing: -1.2, lineHeight: 44 },
  display: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.7, lineHeight: 34 },
  title: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3, lineHeight: 26 },
  heading: { fontSize: 16, fontWeight: '600' as const, letterSpacing: -0.1, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  label: { fontSize: 13, fontWeight: '600' as const, letterSpacing: 0.1, lineHeight: 18 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 17 },

  /** Figures align in columns; currency is read by scanning, not by prose. */
  mono: {
    fontSize: 15,
    fontWeight: '600' as const,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
  monoLarge: {
    fontSize: 30,
    fontWeight: '800' as const,
    letterSpacing: -0.9,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
};

/** Three levels. Anything deeper and the surface stops reading as paper. */
export function elevation(p: Palette, level: 0 | 1 | 2) {
  if (level === 0) return {};
  const config = {
    1: { radius: 10, offset: 3, opacity: p.shadowOpacity * 0.8, elevation: 2 },
    2: { radius: 24, offset: 10, opacity: p.shadowOpacity * 1.35, elevation: 10 },
  }[level];

  return {
    shadowColor: p.shadow,
    shadowOpacity: config.opacity,
    shadowRadius: config.radius,
    shadowOffset: { width: 0, height: config.offset },
    elevation: config.elevation,
  };
}

/** Short enough that a user in a task never waits on choreography. */
export const motion = {
  instant: 110,
  fast: 170,
  normal: 230,
  slow: 380,
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}

/**
 * Whether the user has asked the system to reduce motion.
 *
 * Not optional: every animation in the app has a still alternative, and nothing
 * is ever gated behind a transition completing.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (alive) setReduced(value);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      subscription.remove();
    };
  }, []);

  return reduced;
}
