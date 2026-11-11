// Beat Vortex - Material You Tonal Palettes
// 19 dynamic color palettes based on Material Design 3

export interface TonalPalette {
  name: string;
  // Primary key colors (used for main UI elements)
  primary: string;      // Key color
  onPrimary: string;    // Text on primary
  primaryContainer: string;
  onPrimaryContainer: string;

  // Secondary key colors
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;

  // Tertiary key colors (accents)
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;

  // Error colors
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;

  // Background & surface
  background: string;
  onBackground: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;

  // Outline & borders
  outline: string;
  outlineVariant: string;

  // Inverse (for modals on dark)
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;

  // Shadow
  shadow: string;
  scrim: string;

  // Surface tint (for elevation)
  surfaceTint: string;

  // Genre/category specific (for Beat Vortex)
  cyberpunk?: boolean;
  genre?: string;
}

/**
 * Generate a full tonal palette from a seed color
 * This is a simplified version - in production would use Material Color Utilities
 */
function generatePalette(seed: string, name: string, genre?: string): TonalPalette {
  // Parse hex color
  const hex = seed.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;

  // Convert to HSL
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }

  // Helper to create color from HSL
  const hslToHex = (h: number, s: number, l: number) => {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;
    let r1 = 0, g1 = 0, b1 = 0;

    if (h < 60) { r1 = c; g1 = x; b1 = 0; }
    else if (h < 120) { r1 = x; g1 = c; b1 = 0; }
    else if (h < 180) { r1 = 0; g1 = c; b1 = x; }
    else if (h < 240) { r1 = 0; g1 = x; b1 = c; }
    else if (h < 300) { r1 = x; g1 = 0; b1 = c; }
    else { r1 = c; g1 = 0; b1 = x; }

    const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r1)}${toHex(g1)}${toHex(b1)}`;
  };

  // Dark theme base (Beat Vortex is dark-first)
  const primary = hslToHex(h, s, 0.45);
  const onPrimary = '#ffffff';
  const primaryContainer = hslToHex(h, s * 0.6, 0.25);
  const onPrimaryContainer = hslToHex(h, s * 0.3, 0.95);

  const secondary = hslToHex((h + 30) % 360, s * 0.7, 0.4);
  const onSecondary = '#ffffff';
  const secondaryContainer = hslToHex((h + 30) % 360, s * 0.5, 0.2);
  const onSecondaryContainer = hslToHex((h + 30) % 360, s * 0.3, 0.95);

  const tertiary = hslToHex((h + 60) % 360, s * 0.8, 0.45);
  const onTertiary = '#ffffff';
  const tertiaryContainer = hslToHex((h + 60) % 360, s * 0.6, 0.25);
  const onTertiaryContainer = hslToHex((h + 60) % 360, s * 0.3, 0.95);

  return {
    name,
    primary,
    onPrimary,
    primaryContainer,
    onPrimaryContainer,
    secondary,
    onSecondary,
    secondaryContainer,
    onSecondaryContainer,
    tertiary,
    onTertiary,
    tertiaryContainer,
    onTertiaryContainer,
    error: '#ff6b6b',
    onError: '#ffffff',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    background: '#121212',
    onBackground: '#e6e1e5',
    surface: '#1a1a1a',
    onSurface: '#e6e1e5',
    surfaceVariant: '#2d2d2d',
    onSurfaceVariant: '#cac4d0',
    surfaceContainer: '#1e1e1e',
    surfaceContainerHigh: '#282828',
    surfaceContainerHighest: '#333333',
    outline: '#79747e',
    outlineVariant: '#49454f',
    inverseSurface: '#e6e1e5',
    inverseOnSurface: '#313033',
    inversePrimary: hslToHex(h, s, 0.4),
    shadow: '#000000',
    scrim: '#000000',
    surfaceTint: primary,
    genre,
    cyberpunk: genre === 'cyberpunk',
  };
}

export const MATERIAL_YOU_PALETTES: TonalPalette[] = [
  // Core Beat Vortex palettes
  {
    name: 'cyberpunk',
    primary: '#00d4ff',
    onPrimary: '#000000',
    primaryContainer: '#004d66',
    onPrimaryContainer: '#a0efff',
    secondary: '#b84dff',
    onSecondary: '#000000',
    secondaryContainer: '#4b1a66',
    onSecondaryContainer: '#e8bfff',
    tertiary: '#ff2d75',
    onTertiary: '#000000',
    tertiaryContainer: '#660d2d',
    onTertiaryContainer: '#ffb3cc',
    error: '#ff6b6b',
    onError: '#000000',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    background: '#0a0a0f',
    onBackground: '#ffffff',
    surface: '#12121a',
    onSurface: '#ffffff',
    surfaceVariant: '#1e1e2e',
    onSurfaceVariant: '#b0b0c0',
    surfaceContainer: '#16161e',
    surfaceContainerHigh: '#1e1e2e',
    surfaceContainerHighest: '#282838',
    outline: '#4a4a5a',
    outlineVariant: '#333344',
    inverseSurface: '#f0f0f0',
    inverseOnSurface: '#1a1a2e',
    inversePrimary: '#008ab8',
    shadow: '#000000',
    scrim: '#000000',
    surfaceTint: '#00d4ff',
    cyberpunk: true,
    genre: 'cyberpunk',
  },
  {
    name: 'synthwave',
    primary: '#00d4ff',
    onPrimary: '#000000',
    primaryContainer: '#004d66',
    onPrimaryContainer: '#a0efff',
    secondary: '#ff2d75',
    onSecondary: '#000000',
    secondaryContainer: '#660d2d',
    onSecondaryContainer: '#ffb3cc',
    tertiary: '#ffaa00',
    onTertiary: '#000000',
    tertiaryContainer: '#664400',
    onTertiaryContainer: '#ffe580',
    error: '#ff6b6b',
    onError: '#000000',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    background: '#0d0d1a',
    onBackground: '#ffffff',
    surface: '#16162a',
    onSurface: '#ffffff',
    surfaceVariant: '#1e1e3a',
    onSurfaceVariant: '#b0b0d0',
    surfaceContainer: '#1a1a2e',
    surfaceContainerHigh: '#22223e',
    surfaceContainerHighest: '#2a2a4a',
    outline: '#5a5a7a',
    outlineVariant: '#3a3a5a',
    inverseSurface: '#f0f0f8',
    inverseOnSurface: '#1a1a3e',
    inversePrimary: '#008ab8',
    shadow: '#000000',
    scrim: '#000000',
    surfaceTint: '#00d4ff',
    genre: 'synthwave',
  },
  {
    name: 'darksynth',
    primary: '#ff2d75',
    onPrimary: '#000000',
    primaryContainer: '#660d2d',
    onPrimaryContainer: '#ffb3cc',
    secondary: '#b84dff',
    onSecondary: '#000000',
    secondaryContainer: '#4b1a66',
    onSecondaryContainer: '#e8bfff',
    tertiary: '#ff6b00',
    onTertiary: '#000000',
    tertiaryContainer: '#662a00',
    onTertiaryContainer: '#ffcc80',
    error: '#ff4444',
    onError: '#000000',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    background: '#0a0008',
    onBackground: '#ffffff',
    surface: '#1a0a14',
    onSurface: '#ffffff',
    surfaceVariant: '#2a1a24',
    onSurfaceVariant: '#d0b0c0',
    surfaceContainer: '#240a1e',
    surfaceContainerHigh: '#2e1428',
    surfaceContainerHighest: '#381e32',
    outline: '#6a4a5a',
    outlineVariant: '#4a3a4a',
    inverseSurface: '#f8f0f8',
    inverseOnSurface: '#1a0a14',
    inversePrimary: '#cc0044',
    shadow: '#000000',
    scrim: '#000000',
    surfaceTint: '#ff2d75',
    genre: 'darksynth',
  },
  {
    name: 'retrowave',
    primary: '#ffaa00',
    onPrimary: '#000000',
    primaryContainer: '#664400',
    onPrimaryContainer: '#ffe580',
    secondary: '#ff2d75',
    onSecondary: '#000000',
    secondaryContainer: '#660d2d',
    onSecondaryContainer: '#ffb3cc',
    tertiary: '#00d4ff',
    onTertiary: '#000000',
    tertiaryContainer: '#004d66',
    onTertiaryContainer: '#a0efff',
    error: '#ff6b6b',
    onError: '#000000',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    background: '#1a1400',
    onBackground: '#ffffff',
    surface: '#2a2400',
    onSurface: '#ffffff',
    surfaceVariant: '#3a3400',
    onSurfaceVariant: '#d0c080',
    surfaceContainer: '#342e00',
    surfaceContainerHigh: '#3e3800',
    surfaceContainerHighest: '#484200',
    outline: '#7a6a2a',
    outlineVariant: '#5a4a2a',
    inverseSurface: '#f8f4e0',
    inverseOnSurface: '#1a1400',
    inversePrimary: '#cc8800',
    shadow: '#000000',
    scrim: '#000000',
    surfaceTint: '#ffaa00',
    genre: 'retrowave',
  },
  {
    name: 'chillwave',
    primary: '#00ff88',
    onPrimary: '#000000',
    primaryContainer: '#006633',
    onPrimaryContainer: '#80ffc0',
    secondary: '#00d4ff',
    onSecondary: '#000000',
    secondaryContainer: '#004d66',
    onSecondaryContainer: '#a0efff',
    tertiary: '#b84dff',
    onTertiary: '#000000',
    tertiaryContainer: '#4b1a66',
    onTertiaryContainer: '#e8bfff',
    error: '#ff6b6b',
    onError: '#000000',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    background: '#001a0d',
    onBackground: '#ffffff',
    surface: '#002a1a',
    onSurface: '#ffffff',
    surfaceVariant: '#003a2a',
    onSurfaceVariant: '#80c0a0',
    surfaceContainer: '#003424',
    surfaceContainerHigh: '#003e2e',
    surfaceContainerHighest: '#004838',
    outline: '#2a7a5a',
    outlineVariant: '#1a5a4a',
    inverseSurface: '#e0f8f0',
    inverseOnSurface: '#001a0d',
    inversePrimary: '#00cc66',
    shadow: '#000000',
    scrim: '#000000',
    surfaceTint: '#00ff88',
    genre: 'chillwave',
  },
  {
    name: 'vaporwave',
    primary: '#66e8ff',
    onPrimary: '#000000',
    primaryContainer: '#005a66',
    onPrimaryContainer: '#b3f3ff',
    secondary: '#ff66e8',
    onSecondary: '#000000',
    secondaryContainer: '#661a4d',
    onSecondaryContainer: '#ffb3f0',
    tertiary: '#ffaa00',
    onTertiary: '#000000',
    tertiaryContainer: '#664400',
    onTertiaryContainer: '#ffe580',
    error: '#ff6b6b',
    onError: '#000000',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    background: '#0a1a1a',
    onBackground: '#ffffff',
    surface: '#142a2a',
    onSurface: '#ffffff',
    surfaceVariant: '#1e3a3a',
    onSurfaceVariant: '#a0c0c0',
    surfaceContainer: '#1e3434',
    surfaceContainerHigh: '#283e3e',
    surfaceContainerHighest: '#324848',
    outline: '#4a7a7a',
    outlineVariant: '#3a5a5a',
    inverseSurface: '#f0f8f8',
    inverseOnSurface: '#0a1a1a',
    inversePrimary: '#00b3cc',
    shadow: '#000000',
    scrim: '#000000',
    surfaceTint: '#66e8ff',
    genre: 'vaporwave',
  },
  {
    name: 'outrun',
    primary: '#ff6b9d',
    onPrimary: '#000000',
    primaryContainer: '#661a33',
    onPrimaryContainer: '#ffb3cc',
    secondary: '#00d4ff',
    onSecondary: '#000000',
    secondaryContainer: '#004d66',
    onSecondaryContainer: '#a0efff',
    tertiary: '#ffaa00',
    onTertiary: '#000000',
    tertiaryContainer: '#664400',
    onTertiaryContainer: '#ffe580',
    error: '#ff4444',
    onError: '#000000',
    errorContainer: '#93000a',
    onErrorContainer: '#ffdad6',
    background: '#1a0010',
    onBackground: '#ffffff',
    surface: '#2a0a1a',
    onSurface: '#ffffff',
    surfaceVariant: '#3a1a2a',
    onSurfaceVariant: '#d080a0',
    surfaceContainer: '#340a24',
    surfaceContainerHigh: '#3e142e',
    surfaceContainerHighest: '#481e38',
    outline: '#7a3a5a',
    outlineVariant: '#5a2a4a',
    inverseSurface: '#f8f0f4',
    inverseOnSurface: '#1a0010',
    inversePrimary: '#cc4477',
    shadow: '#000000',
    scrim: '#000000',
    surfaceTint: '#ff6b9d',
    genre: 'outrun',
  },

  // Standard Material You palettes
  ...['blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'teal', 'cyan'].map((color, i) => {
    const seeds = {
      blue: '#1a73e8',
      indigo: '#4f46e5',
      purple: '#8b5cf6',
      pink: '#ec4899',
      red: '#ef4444',
      orange: '#f97316',
      amber: '#f59e0b',
      yellow: '#eab308',
      lime: '#84cc16',
      green: '#22c55e',
      teal: '#14b8a6',
      cyan: '#06b6d4',
    };
    return generatePalette(seeds[color as keyof typeof seeds], color);
  }),
];

export const getPaletteByName = (name: string): TonalPalette | undefined => {
  return MATERIAL_YOU_PALETTES.find(p => p.name === name);
};

export const getPalettesByGenre = (genre: string): TonalPalette[] => {
  return MATERIAL_YOU_PALETTES.filter(p => p.genre === genre);
};

export const getDefaultPalette = (): TonalPalette => {
  return MATERIAL_YOU_PALETTES.find(p => p.name === 'cyberpunk') || MATERIAL_YOU_PALETTES[0];
};