import colors from '@/constants/colors';

export function useColors() {
  return {
    ...colors,
    background: colors.bg,
    foreground: colors.text,
    card: colors.surface,
    cardForeground: colors.text,
    primaryForeground: colors.surface,
    secondary: colors.primaryLight,
    secondaryForeground: colors.text,
    muted: colors.bg,
    mutedForeground: colors.textMuted,
    accent: colors.primaryLight,
    accentForeground: colors.text,
    destructive: colors.danger,
    destructiveForeground: colors.surface,
    input: colors.border,
    radius: 14,
  };
}