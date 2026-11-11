// Beat Vortex - Placeholder Image Generator
// Generates local placeholder images without external dependencies

/**
 * Generate a data URI for a simple colored placeholder with text
 * Uses SVG encoded as data URI
 */
export function generatePlaceholderSvg(
  text: string,
  width: number = 300,
  height: number = 300,
  bgColor: string = '#1a1a2e',
  textColor: string = '#00d4ff',
  fontSize: number = 24
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="${bgColor}"/>
      <text
        x="50%"
        y="50%"
        dominant-baseline="middle"
        text-anchor="middle"
        font-family="system-ui, sans-serif"
        font-size="${fontSize}"
        fill="${textColor}"
        font-weight="600"
      >
        ${text}
      </text>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate a gradient placeholder SVG
 */
export function generateGradientPlaceholder(
  width: number = 300,
  height: number = 300,
  colors: string[] = ['#0a0a0f', '#1a1a2e', '#16213e'],
  direction: 'horizontal' | 'vertical' | 'diagonal' = 'diagonal'
): string {
  const gradientId = `gradient-${Date.now()}`;
  const stops = colors.map((color, i) =>
    `<stop offset="${Math.round(i / (colors.length - 1) * 100)}%" stop-color="${color}"/>`
  ).join('');

  let gradientDef = '';
  if (direction === 'horizontal') {
    gradientDef = `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="0%">${stops}</linearGradient>`;
  } else if (direction === 'vertical') {
    gradientDef = `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="0%" y2="100%">${stops}</linearGradient>`;
  } else {
    gradientDef = `<linearGradient id="${gradientId}" x1="0%" y1="0%" x2="100%" y2="100%">${stops}</linearGradient>`;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>${gradientDef}</defs>
      <rect width="100%" height="100%" fill="url(#${gradientId})"/>
    </svg>
  `;

  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

/**
 * Generate a music-themed placeholder based on context
 */
export function getMusicPlaceholder(type: 'track' | 'album' | 'artist' | 'playlist' | 'podcast' | 'generic', width = 300, height = 300): string {
  const icons: Record<string, string> = {
    track: '♪',
    album: '💿',
    artist: '🎤',
    playlist: '📋',
    podcast: '🎙',
    generic: '🎵',
  };

  const gradients: Record<string, string[]> = {
    track: ['#1a1a2e', '#0d1b2a', '#00d4ff'],
    album: ['#1a1a2e', '#2d1b4e', '#b84dff'],
    artist: ['#1a1a2e', '#2a0d2a', '#ff2d75'],
    playlist: ['#1a1a2e', '#1b2a1d', '#00ff88'],
    podcast: ['#1a1a2e', '#2a2a1d', '#ffaa00'],
    generic: ['#0a0a0f', '#1a1a2e', '#16213e'],
  };

  return generateGradientPlaceholder(width, height, gradients[type] || gradients.generic, 'diagonal');
}

/**
 * Fallback image for when artwork fails to load
 * Uses a data URI with a simple geometric pattern
 */
export const FALLBACK_ARTWORK = generateGradientPlaceholder(300, 300, ['#0a0a0f', '#1a1a2e', '#16213e'], 'diagonal');
export const FALLBACK_ARTWORK_SMALL = generateGradientPlaceholder(100, 100, ['#0a0a0f', '#1a1a2e', '#16213e'], 'diagonal');