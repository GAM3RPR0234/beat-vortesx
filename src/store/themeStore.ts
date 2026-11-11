// Beat Vortex - Theme Store
// Complete theme system with 5 modes, 19 Material You palettes, and customization

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeMode } from '@/constants/themes/themeModes';
import { TonalPalette } from '@/constants/themes/materialYouPalettes';

export interface CustomColors {
  primary?: string;
  secondary?: string;
  tertiary?: string;
  background?: string;
  surface?: string;
}

export interface ThemeState {
  // Core theme settings
  themeMode: ThemeMode;
  colorPalette: string; // Name of the Material You palette
  customColors: CustomColors;
  dynamicColorEnabled: boolean;
  fontScale: number;
  animationScale: number;
  reducedMotion: boolean;
  highContrast: boolean;

  // Computed values (not persisted)
  _effectivePalette: TonalPalette | null;
  _isDark: boolean;

  // Legacy compatibility (derived from themeMode)
  isDark: boolean;

  // Actions
  setThemeMode: (mode: ThemeMode) => void;
  setColorPalette: (paletteName: string) => void;
  setCustomColors: (colors: Partial<CustomColors>) => void;
  setDynamicColorEnabled: (enabled: boolean) => void;
  setFontScale: (scale: number) => void;
  setAnimationScale: (scale: number) => void;
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  resetCustomColors: () => void;
  resetToDefaults: () => void;

  // Legacy compatibility
  toggleTheme: () => void;

  // Internal
  _setEffectivePalette: (palette: TonalPalette) => void;
  _setIsDark: (isDark: boolean) => void;
}

const DEFAULT_STATE: Omit<ThemeState, 'setThemeMode' | 'setColorPalette' | 'setCustomColors' | 'setDynamicColorEnabled' | 'setFontScale' | 'setAnimationScale' | 'setReducedMotion' | 'setHighContrast' | 'resetCustomColors' | 'resetToDefaults' | '_setEffectivePalette' | '_setIsDark' | 'toggleTheme' | 'isDark'> = {
  themeMode: 'cyberpunk',
  colorPalette: 'cyberpunk',
  customColors: {},
  dynamicColorEnabled: false,
  fontScale: 1.0,
  animationScale: 1.0,
  reducedMotion: false,
  highContrast: false,
  _effectivePalette: null,
  _isDark: true,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,
      isDark: true, // Default to dark

      setThemeMode: (mode: ThemeMode) => {
        const state = get();
        // If switching to cyberpunk, force cyberpunk palette
        if (mode === 'cyberpunk') {
          set({ themeMode: mode, colorPalette: 'cyberpunk', dynamicColorEnabled: false, isDark: true });
        } else if (mode === 'light') {
          set({ themeMode: mode, isDark: false });
        } else if (mode === 'dark' || mode === 'amoled') {
          set({ themeMode: mode, isDark: true });
        } else {
          // System mode - will be computed externally
          set({ themeMode: mode });
        }
      },

      setColorPalette: (paletteName: string) => {
        set({ colorPalette: paletteName, dynamicColorEnabled: false });
      },

      setCustomColors: (colors: Partial<CustomColors>) => {
        set((state) => ({
          customColors: { ...state.customColors, ...colors },
        }));
      },

      setDynamicColorEnabled: (enabled: boolean) => {
        set({ dynamicColorEnabled: enabled });
      },

      setFontScale: (scale: number) => {
        set({ fontScale: Math.max(0.85, Math.min(1.3, scale)) });
      },

      setAnimationScale: (scale: number) => {
        set({ animationScale: Math.max(0, Math.min(2, scale)) });
      },

      setReducedMotion: (enabled: boolean) => {
        set({ reducedMotion: enabled });
      },

      setHighContrast: (enabled: boolean) => {
        set({ highContrast: enabled });
      },

      resetCustomColors: () => {
        set({ customColors: {} });
      },

      resetToDefaults: () => {
        set({ ...DEFAULT_STATE, isDark: true });
      },

      // Legacy compatibility
      toggleTheme: () => {
        const state = get();
        const newIsDark = !state.isDark;
        const newMode = newIsDark ? 'dark' : 'light';
        set({ themeMode: newMode, isDark: newIsDark });
      },

      _setEffectivePalette: (palette: TonalPalette) => {
        set({ _effectivePalette: palette });
      },

      _setIsDark: (isDark: boolean) => {
        set({ _isDark: isDark, isDark });
      },
    }),
    {
      name: 'beat-vortex-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        themeMode: state.themeMode,
        colorPalette: state.colorPalette,
        customColors: state.customColors,
        dynamicColorEnabled: state.dynamicColorEnabled,
        fontScale: state.fontScale,
        animationScale: state.animationScale,
        reducedMotion: state.reducedMotion,
        highContrast: state.highContrast,
      }),
      version: 2, // Migration from old theme store
      migrate: (persistedState: unknown) => {
        const oldState = persistedState as { isDark?: boolean } | undefined;
        if (oldState && typeof oldState.isDark === 'boolean') {
          return {
            ...DEFAULT_STATE,
            themeMode: oldState.isDark ? 'cyberpunk' : 'light',
            colorPalette: oldState.isDark ? 'cyberpunk' : 'blue',
          };
        }
        return DEFAULT_STATE;
      },
    }
  )
);

// Selectors for common use cases
export const useThemeMode = () => useThemeStore((state) => state.themeMode);
export const useColorPalette = () => useThemeStore((state) => state.colorPalette);
export const useCustomColors = () => useThemeStore((state) => state.customColors);
export const useDynamicColorEnabled = () => useThemeStore((state) => state.dynamicColorEnabled);
export const useFontScale = () => useThemeStore((state) => state.fontScale);
export const useAnimationScale = () => useThemeStore((state) => state.animationScale);
export const useReducedMotion = () => useThemeStore((state) => state.reducedMotion);
export const useHighContrast = () => useThemeStore((state) => state.highContrast);
export const useIsDark = () => useThemeStore((state) => state._isDark);
export const useEffectivePalette = () => useThemeStore((state) => state._effectivePalette);

// Action selectors
export const useThemeActions = () => useThemeStore((state) => ({
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