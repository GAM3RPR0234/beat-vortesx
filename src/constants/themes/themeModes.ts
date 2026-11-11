// Beat Vortex - Theme Modes
// 5 theme modes: Cyberpunk (default), Dark, AMOLED, Light, System

export type ThemeMode = 'cyberpunk' | 'dark' | 'amoled' | 'light' | 'system';

export interface ThemeModeConfig {
  id: ThemeMode;
  label: string;
  description: string;
  icon: string;
  isDark: boolean;
  isSystem: boolean;
  supportsDynamicColor: boolean;
  defaultPalette: string;
}

export const THEME_MODES: ThemeModeConfig[] = [
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    description: 'Neón futurista con gradientes dinámicos',
    icon: 'sparkles',
    isDark: true,
    isSystem: false,
    supportsDynamicColor: false,
    defaultPalette: 'cyberpunk',
  },
  {
    id: 'dark',
    label: 'Oscuro',
    description: 'Fondo negro profundo, ideal para OLED',
    icon: 'moon',
    isDark: true,
    isSystem: false,
    supportsDynamicColor: true,
    defaultPalette: 'blue',
  },
  {
    id: 'amoled',
    label: 'AMOLED',
    description: 'Negro puro (#000000) para máximo ahorro de batería',
    icon: 'contrast',
    isDark: true,
    isSystem: false,
    supportsDynamicColor: true,
    defaultPalette: 'cyan',
  },
  {
    id: 'light',
    label: 'Claro',
    description: 'Fondo blanco limpio para uso diurno',
    icon: 'sunny',
    isDark: false,
    isSystem: false,
    supportsDynamicColor: true,
    defaultPalette: 'indigo',
  },
  {
    id: 'system',
    label: 'Sistema',
    description: 'Sigue la configuración del dispositivo automáticamente',
    icon: 'phone-portrait',
    isDark: true, // Will be overridden by system
    isSystem: true,
    supportsDynamicColor: true,
    defaultPalette: 'blue',
  },
];

export const getThemeModeConfig = (mode: ThemeMode): ThemeModeConfig | undefined => {
  return THEME_MODES.find(m => m.id === mode);
};

export const getThemeModeByIndex = (index: number): ThemeModeConfig => {
  return THEME_MODES[Math.max(0, Math.min(THEME_MODES.length - 1, index))];
};

/**
 * Check if a theme mode is dark (resolves system mode)
 */
export const isThemeModeDark = (mode: ThemeMode, systemIsDark?: boolean): boolean => {
  const config = getThemeModeConfig(mode);
  if (!config) return true;
  if (config.isSystem) return systemIsDark ?? true;
  return config.isDark;
};

/**
 * Get effective base palette for a theme mode
 */
export const getEffectiveBasePalette = (mode: ThemeMode): string => {
  const config = getThemeModeConfig(mode);
  return config?.defaultPalette || 'cyberpunk';
};