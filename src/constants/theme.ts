// Beat Vortex - Theme Constants (Dynamic)
// Cyberpunk/Minimalist Dark Theme Color Palette
// This file now provides the DEFAULT cyberpunk theme as fallback
// Actual colors are computed dynamically from useThemeStore + materialYouPalettes

import { TonalPalette, getPaletteByName, getDefaultPalette } from './themes/materialYouPalettes';
import { ThemeMode, getThemeModeConfig, isThemeModeDark, getEffectiveBasePalette } from './themes/themeModes';

// ============================================
// STATIC DEFAULT THEME (Cyberpunk) - Fallback
// ============================================

export const DEFAULT_COLORS = {
  // Base colors
  background: '#0a0a0f',
  surface: '#12121a',
  surfaceElevated: '#1a1a24',
  surfaceOverlay: '#1e1e28',

  // Primary - Neon Cyan/Blue
  primary: '#00d4ff',
  primaryGlow: '#00d4ff80',
  primaryDark: '#0099cc',
  primaryLight: '#66e8ff',

  // Secondary - Neon Purple/Magenta
  secondary: '#b84dff',
  secondaryGlow: '#b84dff80',
  secondaryDark: '#8a2be2',
  secondaryLight: '#d48aff',

  // Accent - Neon Pink/Red
  accent: '#ff2d75',
  accentGlow: '#ff2d7580',
  accentDark: '#cc0052',
  accentLight: '#ff6b9d',

  // Success - Neon Green
  success: '#00ff88',
  successGlow: '#00ff8880',
  successDark: '#00cc66',
  successLight: '#66ffaa',

  // Warning - Neon Orange
  warning: '#ffaa00',
  warningGlow: '#ffaa0080',
  warningDark: '#cc8800',
  warningLight: '#ffcc66',

  // Error - Neon Red
  error: '#ff3344',
  errorGlow: '#ff334480',
  errorDark: '#cc0022',
  errorLight: '#ff6677',

  // Discord Brand Colors
  discord: '#5865F2',
  discordGlow: '#5865F280',
  discordDark: '#4048E6',
  discordLight: '#8A91F5',
  discordBackground: '#2f3136',
  discordBackgroundGlow: '#2f313640',

  // Text
  textPrimary: '#ffffff',
  textSecondary: '#b8b8cc',
  textMuted: '#78788c',
  textDisabled: '#4a4a5c',
  textOnPrimary: '#0a0a0f',

  // Borders
  border: '#2a2a3a',
  borderLight: '#3a3a4a',
  borderFocus: '#00d4ff',

  // Gradients
  gradientPrimary: ['#0a0a0f', '#1a1a2e', '#16213e'] as const,
  gradientSecondary: ['#0a0a0f', '#1a0a2e', '#2e0a3e'] as const,
  gradientAccent: ['#0a0a0f', '#2e0a1a', '#3e0a16'] as const,
  gradientNeon: ['#00d4ff', '#b84dff', '#ff2d75'] as const,
  gradientNeonReverse: ['#ff2d75', '#b84dff', '#00d4ff'] as const,
  gradientSurface: ['#12121a', '#1a1a24', '#12121a'] as const,
  gradientDiscord: ['#5865F2', '#4048E6', '#2f3136'] as const,

  // Glassmorphism
  glassLight: 'rgba(255, 255, 255, 0.05)',
  glassMedium: 'rgba(255, 255, 255, 0.1)',
  glassHeavy: 'rgba(255, 255, 255, 0.15)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',

  // Shadows
  shadowNeon: 'rgba(0, 212, 255, 0.3)',
  shadowNeonPurple: 'rgba(184, 77, 255, 0.3)',
  shadowNeonPink: 'rgba(255, 45, 117, 0.3)',
  shadowDark: 'rgba(0, 0, 0, 0.5)',
  shadowDiscord: 'rgba(88, 101, 242, 0.3)',
} as const;

// Type for the color object
export type ColorsType = typeof DEFAULT_COLORS;

// ============================================
// SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION, Z_INDEX, BREAKPOINTS
// (Unchanged - these are not theme-dependent)
// ============================================

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
} as const;

export const BORDER_RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  round: 9999,
} as const;

export const TYPOGRAPHY = {
  fontFamily: {
    regular: 'System',
    medium: 'System',
    bold: 'System',
    mono: 'monospace',
  },
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    xxxl: 28,
    display: 36,
    hero: 48,
  },
  fontWeight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },
} as const;

import { Easing } from 'react-native';

export const ANIMATION = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
  },
  easing: {
    easeOut: Easing.out(Easing.cubic),
    easeIn: Easing.in(Easing.cubic),
    easeInOut: Easing.inOut(Easing.cubic),
    spring: Easing.elastic(1),
  },
} as const;

export const Z_INDEX = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  modal: 300,
  popover: 400,
  tooltip: 500,
  toast: 600,
} as const;

export const BREAKPOINTS = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export const LEGAL = {
  appName: 'Beat Vortex',
  disclaimer: {
    title: 'Descargo de Responsabilidad Legal',
    sections: [
      {
        title: 'Cliente Independiente de Código Abierto',
        content: 'Beat Vortex es un cliente/reproductor local independiente de código abierto. No es un servicio de streaming oficial ni está afiliado a ninguna plataforma comercial de música.'
      },
      {
        title: 'Sin Afiliación Oficial',
        content: 'Beat Vortex NO está afiliada, asociada, autorizada, respaldada ni conectada oficialmente de ninguna manera con Google LLC, YouTube, Spotify, ni ninguna de sus filiales o subsidiarias. Todos los nombres de marcas, logos y marcas registradas pertenecen a sus respectivos dueños.'
      },
      {
        title: 'Funcionamiento como Herramienta de Reproducción',
        content: 'La aplicación funciona como una herramienta de reproducción indexada e interfaz de usuario. Todo el contenido multimedia se obtiene a través de APIs públicas, fuentes abiertas y repositorios de metadatos libres (como MusicBrainz, Piped/Invidious APIs, LRCLIB). Beat Vortex no aloja, distribuye ni transmite contenido protegido por derechos de autor.'
      },
      {
        title: 'Uso Responsable',
        content: 'El usuario es responsable de cumplir con las leyes de derechos de autor de su jurisdicción. Beat Vortex proporciona herramientas para reproducción local y gestión de bibliotecas personales. Se recomienda usar la aplicación únicamente con contenido del que se tengan los derechos correspondientes o que esté en dominio público/licencias libres.'
      },
      {
        title: 'Sin Garantías',
        content: 'Beat Vortex se proporciona "tal cual", sin garantías de ningún tipo, expresas o implícitas. Los desarrolladores no se hacen responsables por daños directos, indirectos, incidentales o consecuentes derivados del uso de la aplicación.'
      },
      {
        title: 'Privacidad y Datos',
        content: 'Beat Vortex no recopila, almacena ni transmite datos personales a servidores externos. Todo el procesamiento, cacheo, extracción y descargas ocurren del lado del cliente (dispositivo del usuario). No se requieren cuentas, registros ni autenticación para usar la aplicación.'
      }
    ],
    acceptanceText: 'He leído y acepto los términos y condiciones descritos arriba. Entiendo que Beat Vortex es una herramienta de reproducción local independiente sin afiliación oficial con ninguna plataforma comercial.',
    acceptButton: 'Aceptar y Continuar',
    declineButton: 'Salir de la Aplicación'
  }
} as const;

// ============================================
// DYNAMIC COLOR GENERATION
// ============================================

/**
 * Generate complete color system from a Material You tonal palette
 * This is the core function that creates all semantic colors from a palette
 */
export function generateColorsFromPalette(palette: TonalPalette, isDark: boolean, customColors: Record<string, string | undefined> = {}): ColorsType {
  // Helper to get custom color or fallback
  const getColor = (key: keyof ColorsType, fallback: string | readonly string[]): string | readonly string[] => {
    const custom = customColors[key];
    if (custom !== undefined) return custom;
    return fallback;
  };

  // For AMOLED mode, force true black background
  const amoledBackground = '#000000';
  const amoledSurface = '#0a0a0a';

  const background = isDark && getThemeModeConfig('amoled' as ThemeMode) ? amoledBackground : palette.background;
  const surface = isDark && getThemeModeConfig('amoled' as ThemeMode) ? amoledSurface : palette.surface;
  const surfaceElevated = isDark ? palette.surfaceVariant : palette.surface;

  // Generate gradients from palette
  const gradientPrimary = [palette.background, palette.surfaceVariant, palette.surface] as const;
  const gradientSecondary = [palette.background, palette.secondaryContainer, palette.surface] as const;
  const gradientAccent = [palette.background, palette.tertiaryContainer, palette.surface] as const;
  const gradientNeon = [palette.primary, palette.secondary, palette.tertiary] as const;
  const gradientNeonReverse = [palette.tertiary, palette.secondary, palette.primary] as const;
  const gradientSurface = [palette.surface, palette.surfaceVariant, palette.surface] as const;

  return {
    // Base colors
    background: getColor('background', background) as string,
    surface: getColor('surface', surface) as string,
    surfaceElevated: getColor('surfaceElevated', surfaceElevated) as string,
    surfaceOverlay: getColor('surfaceOverlay', palette.surfaceVariant) as string,

    // Primary
    primary: getColor('primary', palette.primary) as string,
    primaryGlow: getColor('primaryGlow', palette.primary + '80') as string,
    primaryDark: getColor('primaryDark', darkenColor(palette.primary, 20)) as string,
    primaryLight: getColor('primaryLight', lightenColor(palette.primary, 20)) as string,

    // Secondary
    secondary: getColor('secondary', palette.secondary) as string,
    secondaryGlow: getColor('secondaryGlow', palette.secondary + '80') as string,
    secondaryDark: getColor('secondaryDark', darkenColor(palette.secondary, 20)) as string,
    secondaryLight: getColor('secondaryLight', lightenColor(palette.secondary, 20)) as string,

    // Tertiary (Accent)
    accent: getColor('accent', palette.tertiary) as string,
    accentGlow: getColor('accentGlow', palette.tertiary + '80') as string,
    accentDark: getColor('accentDark', darkenColor(palette.tertiary, 20)) as string,
    accentLight: getColor('accentLight', lightenColor(palette.tertiary, 20)) as string,

    // Success
    success: getColor('success', '#00ff88') as string,
    successGlow: getColor('successGlow', '#00ff8880') as string,
    successDark: getColor('successDark', '#00cc66') as string,
    successLight: getColor('successLight', '#66ffaa') as string,

    // Warning
    warning: getColor('warning', '#ffaa00') as string,
    warningGlow: getColor('warningGlow', '#ffaa0080') as string,
    warningDark: getColor('warningDark', '#cc8800') as string,
    warningLight: getColor('warningLight', '#ffcc66') as string,

    // Error
    error: getColor('error', palette.error) as string,
    errorGlow: getColor('errorGlow', palette.error + '80') as string,
    errorDark: getColor('errorDark', darkenColor(palette.error, 20)) as string,
    errorLight: getColor('errorLight', lightenColor(palette.error, 20)) as string,

    // Text
    textPrimary: getColor('textPrimary', isDark ? palette.onBackground : palette.onSurface) as string,
    textSecondary: getColor('textSecondary', isDark ? palette.onSurfaceVariant : palette.onSurfaceVariant) as string,
    textMuted: getColor('textMuted', isDark ? palette.outlineVariant : palette.outline) as string,
    textDisabled: getColor('textDisabled', isDark ? palette.outline : palette.outlineVariant) as string,
    textOnPrimary: getColor('textOnPrimary', palette.onPrimary) as string,

    // Borders
    border: getColor('border', isDark ? palette.outlineVariant : palette.outline) as string,
    borderLight: getColor('borderLight', isDark ? palette.outline : palette.outlineVariant) as string,
    borderFocus: getColor('borderFocus', palette.primary) as string,

    // Gradients
    gradientPrimary: getColor('gradientPrimary', gradientPrimary) as typeof gradientPrimary,
    gradientSecondary: getColor('gradientSecondary', gradientSecondary) as typeof gradientSecondary,
    gradientAccent: getColor('gradientAccent', gradientAccent) as typeof gradientAccent,
    gradientNeon: getColor('gradientNeon', gradientNeon) as typeof gradientNeon,
    gradientNeonReverse: getColor('gradientNeonReverse', gradientNeonReverse) as typeof gradientNeonReverse,
    gradientSurface: getColor('gradientSurface', gradientSurface) as typeof gradientSurface,

    // Glassmorphism
    glassLight: getColor('glassLight', isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)') as string,
    glassMedium: getColor('glassMedium', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)') as string,
    glassHeavy: getColor('glassHeavy', isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.15)') as string,
    glassBorder: getColor('glassBorder', isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)') as string,

    // Shadows
    shadowNeon: getColor('shadowNeon', palette.primary + '4d') as string,
    shadowNeonPurple: getColor('shadowNeonPurple', palette.secondary + '4d') as string,
    shadowNeonPink: getColor('shadowNeonPink', palette.tertiary + '4d') as string,
    shadowDark: getColor('shadowDark', 'rgba(0, 0, 0, 0.5)') as string,
  } as ColorsType;
}

/**
 * Darken a hex color by percentage
 */
function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1).padStart(6, '0');
}

/**
 * Lighten a hex color by percentage
 */
function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1).padStart(6, '0');
}

// ============================================
// LEGACY EXPORT FOR BACKWARDS COMPATIBILITY
// ============================================

// Export default colors for components not yet migrated
export const COLORS = DEFAULT_COLORS;