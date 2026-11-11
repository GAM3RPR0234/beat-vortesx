// Beat Vortex - Dynamic Color Hooks
// React hooks for accessing dynamically computed theme colors

import { useMemo } from 'react';
import { useThemeStore, useEffectivePalette, useIsDark } from '@/store/themeStore';
import { TonalPalette, getPaletteByName, getDefaultPalette } from '@/constants/themes/materialYouPalettes';
import { ThemeMode, getEffectiveBasePalette } from '@/constants/themes/themeModes';
import { generateColorsFromPalette, ColorsType, SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/constants/theme';
import { CustomColors } from '@/store/themeStore';

export interface DynamicColors extends ColorsType {
  // Additional computed properties
  isDark: boolean;
  themeMode: string;
  colorPalette: string;
}

/**
 * Hook to get dynamically computed colors based on current theme settings
 * This is the main export for components to use
 */
export function useColors(): DynamicColors {
  const themeMode = useThemeStore((state) => state.themeMode);
  const colorPalette = useThemeStore((state) => state.colorPalette);
  const customColors = useThemeStore((state) => state.customColors);
  const effectivePalette = useEffectivePalette();
  const isDark = useIsDark();

  const palette = useMemo(() => {
    if (effectivePalette) return effectivePalette;
    const paletteName = getEffectiveBasePalette(themeMode);
    return getPaletteByName(paletteName) || getDefaultPalette();
  }, [effectivePalette, themeMode]);

  // Convert CustomColors to Record<string, string | undefined> for generateColorsFromPalette
  const customColorsRecord = useMemo(() => {
    const record: Record<string, string | undefined> = {};
    (Object.keys(customColors) as Array<keyof CustomColors>).forEach(key => {
      record[key] = customColors[key];
    });
    return record;
  }, [customColors]);

  const colors = useMemo(() => {
    return generateColorsFromPalette(palette, isDark, customColorsRecord);
  }, [palette, isDark, customColorsRecord]);

  return {
    ...colors,
    isDark,
    themeMode,
    colorPalette,
  };
}

/**
 * Hook for components that only need to know if dark mode
 */
export function useIsDarkMode(): boolean {
  return useIsDark();
}

/**
 * Hook for components that need the effective palette
 */
export function usePalette(): TonalPalette | null {
  return useEffectivePalette();
}

/**
 * Hook for getting theme actions
 */
export function useThemeActions() {
  return useThemeStore((state) => ({
    setThemeMode: state.setThemeMode,
    setColorPalette: state.setColorPalette,
    setCustomColors: state.setCustomColors,
    setDynamicColorEnabled: state.setDynamicColorEnabled,
    setFontScale: state.setFontScale,
    setAnimationScale: state.setAnimationScale,
    setReducedMotion: state.setReducedMotion,
    setHighContrast: state.setHighContrast,
    resetCustomColors: state.resetCustomColors,
    resetToDefaults: state.resetToDefaults,
  }));
}

/**
 * Hook for getting theme mode
 */
export function useThemeMode(): ThemeMode {
  return useThemeStore((state) => state.themeMode);
}

/**
 * Hook for getting color palette name
 */
export function useColorPalette(): string {
  return useThemeStore((state) => state.colorPalette);
}

/**
 * Hook for getting font scale
 */
export function useFontScale(): number {
  return useThemeStore((state) => state.fontScale);
}

/**
 * Hook for getting animation scale
 */
export function useAnimationScale(): number {
  return useThemeStore((state) => state.animationScale);
}

/**
 * Hook for getting reduced motion preference
 */
export function useReducedMotion(): boolean {
  return useThemeStore((state) => state.reducedMotion);
}

/**
 * Hook for getting high contrast preference
 */
export function useHighContrast(): boolean {
  return useThemeStore((state) => state.highContrast);
}

// Re-export theme constants for convenience
export { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/constants/theme';