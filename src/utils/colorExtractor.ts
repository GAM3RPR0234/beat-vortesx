import { Platform } from 'react-native';

declare global {
  interface Window {
    Image: new () => HTMLImageElement;
  }
}

interface ExtractedColors {
  primary: string;
  secondary: string;
  background: string;
  textOnPrimary: string;
}

const DEFAULT_COLORS: ExtractedColors = {
  primary: '#00d4ff',
  secondary: '#b84dff',
  background: '#0a0a0f',
  textOnPrimary: '#0a0a0f',
};

const hexToRgb = (hex: string): [number, number, number] | null => {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6) return null;
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return [r, g, b];
};

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
};

const getLuminance = (r: number, g: number, b: number): number => {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
};

const getContrastRatio = (color1: string, color2: string): number => {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 1;
  const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
  const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};

const adjustColorForContrast = (color: string, targetContrast: number = 4.5): string => {
  const rgb = hexToRgb(color);
  if (!rgb) return color;

  const [r, g, b] = rgb;
  const luminance = getLuminance(r, g, b);

  if (luminance > 0.5) {
    let factor = 0.9;
    while (getContrastRatio(rgbToHex(Math.round(r * factor), Math.round(g * factor), Math.round(b * factor)), '#ffffff') < targetContrast && factor > 0.1) {
      factor -= 0.05;
    }
    return rgbToHex(Math.round(r * factor), Math.round(g * factor), Math.round(b * factor));
  } else {
    let factor = 1.1;
    while (getContrastRatio(rgbToHex(Math.min(255, Math.round(r * factor)), Math.min(255, Math.round(g * factor)), Math.min(255, Math.round(b * factor))), '#000000') < targetContrast && factor < 3) {
      factor += 0.1;
    }
    return rgbToHex(Math.min(255, Math.round(r * factor)), Math.min(255, Math.round(g * factor)), Math.min(255, Math.round(b * factor)));
  }
};

const generateComplementary = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#b84dff';
  const [r, g, b] = rgb;
  const hsl = rgbToHsl(r, g, b);
  const compHsl = [(hsl[0] + 180) % 360, hsl[1], hsl[2]];
  return hslToHex(compHsl[0], compHsl[1], compHsl[2]);
};

const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return [h * 360, s * 100, l * 100];
};

const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1))));
  return rgbToHex(f(0), f(8), f(4));
};

export const extractColorsFromImage = async (imageUri: string): Promise<ExtractedColors> => {
  try {
    if (Platform.OS === 'web') {
      return extractColorsFromImageWeb(imageUri);
    }

    return extractColorsFromImageNative(imageUri);
  } catch (error) {
    console.warn('Color extraction failed, using defaults:', error);
    return DEFAULT_COLORS;
  }
};

const extractColorsFromImageWeb = async (imageUri: string): Promise<ExtractedColors> => {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(DEFAULT_COLORS);
        return;
      }

      const size = 100;
      canvas.width = size;
      canvas.height = size;
      ctx.drawImage(img as CanvasImageSource, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size).data;
      const colors = extractDominantColors(imageData);
      resolve(generatePalette(colors));
    };
    img.onerror = () => resolve(DEFAULT_COLORS);
    img.src = imageUri;
  });
};

const extractColorsFromImageNative = async (imageUri: string): Promise<ExtractedColors> => {
  return DEFAULT_COLORS;
};

const extractDominantColors = (data: Uint8ClampedArray): { r: number; g: number; b: number; count: number }[] => {
  const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();
  const step = 4;

  for (let i = 0; i < data.length; i += step * 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 128) continue;

    const quantizedR = Math.round(r / 32) * 32;
    const quantizedG = Math.round(g / 32) * 32;
    const quantizedB = Math.round(b / 32) * 32;
    const key = `${quantizedR},${quantizedG},${quantizedB}`;

    const existing = colorMap.get(key);
    if (existing) {
      existing.count++;
    } else {
      colorMap.set(key, { r: quantizedR, g: quantizedG, b: quantizedB, count: 1 });
    }
  }

  return Array.from(colorMap.values())
    .filter(c => c.count > 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
};

const generatePalette = (dominantColors: { r: number; g: number; b: number; count: number }[]): ExtractedColors => {
  if (dominantColors.length === 0) return DEFAULT_COLORS;

  const primaryColor = dominantColors[0];
  const primaryHex = rgbToHex(primaryColor.r, primaryColor.g, primaryColor.b);

  let secondaryHex = generateComplementary(primaryHex);
  if (dominantColors.length > 1) {
    const altHex = rgbToHex(dominantColors[1].r, dominantColors[1].g, dominantColors[1].b);
    if (getContrastRatio(primaryHex, altHex) > 1.5) {
      secondaryHex = altHex;
    }
  }

  const adjustedPrimary = adjustColorForContrast(primaryHex);
  const adjustedSecondary = adjustColorForContrast(secondaryHex);

  const bgRgb = hexToRgb(adjustedPrimary);
  let backgroundHex = '#0a0a0f';
  if (bgRgb) {
    backgroundHex = rgbToHex(
      Math.round(bgRgb[0] * 0.08),
      Math.round(bgRgb[1] * 0.08),
      Math.round(bgRgb[2] * 0.08)
    );
  }

  const textOnPrimary = getLuminance(
    hexToRgb(adjustedPrimary)?.[0] || 0,
    hexToRgb(adjustedPrimary)?.[1] || 212,
    hexToRgb(adjustedPrimary)?.[2] || 255
  ) > 0.5 ? '#0a0a0f' : '#ffffff';

  return {
    primary: adjustedPrimary,
    secondary: adjustedSecondary,
    background: backgroundHex,
    textOnPrimary,
  };
};

export const generateNeonGradients = (colors: ExtractedColors): string[] => {
  const primaryRgb = hexToRgb(colors.primary);
  const secondaryRgb = hexToRgb(colors.secondary);

  if (!primaryRgb || !secondaryRgb) {
    return ['#0a0a0f', '#1a1a2e', '#16213e'];
  }

  return [
    `rgba(${primaryRgb[0]}, ${primaryRgb[1]}, ${primaryRgb[2]}, 0.15)`,
    `rgba(${secondaryRgb[0]}, ${secondaryRgb[1]}, ${secondaryRgb[2]}, 0.1)`,
    colors.background,
  ];
};

export type { ExtractedColors };
export { DEFAULT_COLORS };