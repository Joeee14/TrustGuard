import { Platform } from 'react-native';

export const FONT = Platform.OS === 'ios' ? 'System' : 'sans-serif';
export const FONT_BOLD = Platform.OS === 'ios' ? 'System' : 'sans-serif';

export const THEMES = {
  light: {
    name: 'light',
    bg: '#F1F5FA',
    bg2: '#E4ECF5',
    surface: '#FFFFFF',
    surface2: '#F7FAFD',
    border: 'rgba(17, 54, 94, 0.10)',
    borderStrong: 'rgba(17, 54, 94, 0.20)',
    text: '#0E2540',
    textMuted: 'rgba(14, 37, 64, 0.62)',
    textDim: 'rgba(14, 37, 64, 0.40)',
    brand: '#1F5FAA',
    brandInk: '#11365E',
    brandSoft: '#DCE7F5',
    accent: '#3FA9E8',
    sage: '#5C8BBF',
    statusBarStyle: 'dark',
    good: '#1F73B8',
    goodSoft: '#D7E7F5',
    mid: '#C68530',
    midSoft: '#F3E4C8',
    bad: '#B23C2A',
    badSoft: '#F1D7CF',
    info: '#3C6A8B',
    shadowColor: '#0E2540',
    shadowOpacity: 0.08,
  },
  dark: {
    name: 'dark',
    bg: '#0A1726',
    bg2: '#11253B',
    surface: '#152C46',
    surface2: '#1B3654',
    border: 'rgba(212, 227, 245, 0.10)',
    borderStrong: 'rgba(212, 227, 245, 0.18)',
    text: '#E2ECF7',
    textMuted: 'rgba(226, 236, 247, 0.62)',
    textDim: 'rgba(226, 236, 247, 0.38)',
    brand: '#7AB1E6',
    brandInk: '#A7CDEE',
    brandSoft: '#1C3656',
    accent: '#5BC2F0',
    sage: '#8FB2D6',
    statusBarStyle: 'light',
    good: '#7AB1E6',
    goodSoft: '#163051',
    mid: '#E0A451',
    midSoft: '#352915',
    bad: '#E07965',
    badSoft: '#3A1F1A',
    info: '#8AB4D2',
    shadowColor: '#000000',
    shadowOpacity: 0.4,
  },
};

export function tierOf(score) {
  if (score >= 70) return 'good';
  if (score >= 40) return 'mid';
  return 'bad';
}

export function tierLabel(score) {
  if (score >= 85) return 'Highly Trusted';
  if (score >= 70) return 'Trusted';
  if (score >= 55) return 'Mixed Signals';
  if (score >= 40) return 'Be Cautious';
  if (score >= 25) return 'Risky';
  return 'Avoid';
}

export function tierColors(t, score) {
  const tier = tierOf(score);
  return { c: t[tier], soft: t[tier + 'Soft'], tier };
}

export function cardShadow(t) {
  return {
    shadowColor: t.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: t.shadowOpacity,
    shadowRadius: 12,
    elevation: 4,
  };
}
