import { useColorScheme } from 'react-native';

/**
 * A deliberately restrained palette. The app delivers bad financial news for a
 * living, so the status colours have to be unambiguous while everything else
 * stays quiet enough to read a lot of numbers on.
 */
const light = {
  background: '#F4F6FA',
  surface: '#FFFFFF',
  surfaceAlt: '#EDF1F7',
  border: '#DCE3ED',
  text: '#0B1F3A',
  textMuted: '#5C6B82',
  textFaint: '#8593A8',
  accent: '#12518C',
  accentSoft: '#E4EDF7',
  pass: '#1B7F4B',
  passSoft: '#E1F3E8',
  stretch: '#A96A05',
  stretchSoft: '#FBF0DC',
  fail: '#B3261E',
  failSoft: '#FBE6E4',
  shadow: '#0B1F3A',
};

const dark: typeof light = {
  background: '#0A1220',
  surface: '#111C2E',
  surfaceAlt: '#18253A',
  border: '#243449',
  text: '#EAF0F8',
  textMuted: '#9FB0C6',
  textFaint: '#71829A',
  accent: '#63A6E8',
  accentSoft: '#152B44',
  pass: '#5FD69A',
  passSoft: '#13301F',
  stretch: '#F0B65C',
  stretchSoft: '#33270F',
  fail: '#FF8A80',
  failSoft: '#3A1A17',
  shadow: '#000000',
};

export type Palette = typeof light;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 12, lg: 16, pill: 999 };

export const font = {
  display: { fontSize: 30, fontWeight: '700' as const, letterSpacing: -0.6 },
  title: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.3 },
  heading: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '500' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
  mono: { fontSize: 15, fontWeight: '600' as const, fontVariant: ['tabular-nums'] as ('tabular-nums')[] },
};

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export function useIsDark(): boolean {
  return useColorScheme() === 'dark';
}
