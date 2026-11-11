// app.config.js - Expo configuration with widget support
// This file runs in Node.js context (not Metro), so use relative paths

const widgetConfig = {
  android: {
    src: 'widgets/android',
    widgets: [
      {
        name: 'MiniPlayer',
        description: 'Control playback from your home screen',
        icon: 'play-circle',
        sizes: ['small', 'medium', 'large'],
        dataKey: '@beat_vortex_widget_miniplayer',
        updateInterval: 30, // seconds
      },
      {
        name: 'Recently Played',
        description: 'Quick access to your recent tracks',
        icon: 'history',
        sizes: ['medium', 'large'],
        dataKey: '@beat_vortex_widget_recently_played',
        updateInterval: 300, // 5 minutes
      },
      {
        name: 'Quick Actions',
        description: 'Shuffle, favorites, downloads, play/pause',
        icon: 'flash',
        sizes: ['small', 'medium'],
        dataKey: '@beat_vortex_widget_quick_actions',
        updateInterval: 60, // 1 minute
      },
    ],
  },
  ios: {
    src: 'widgets/ios',
    widgets: [
      {
        name: 'MiniPlayer',
        description: 'Control playback from your home screen',
        icon: 'play-circle',
        sizes: ['small', 'medium', 'large'],
        dataKey: '@beat_vortex_widget_miniplayer',
        updateInterval: 30,
      },
      {
        name: 'Recently Played',
        description: 'Quick access to your recent tracks',
        icon: 'history',
        sizes: ['medium', 'large'],
        dataKey: '@beat_vortex_widget_recently_played',
        updateInterval: 300,
      },
      {
        name: 'Quick Actions',
        description: 'Shuffle, favorites, downloads, play/pause',
        icon: 'flash',
        sizes: ['small', 'medium'],
        dataKey: '@beat_vortex_widget_quick_actions',
        updateInterval: 60,
      },
    ],
  },
};

export default (config) => {
  // getConfig passes an object with { projectRoot, staticConfigPath, packageJsonPath, config }
  // where config.config is the actual static config from app.json
  const baseConfig = config.config || config;
  // Filter out string 'expo-widget' from plugins to avoid duplicate plugin with no options
  // Also filter out expo-widget array plugin from base config (we define our own below)
  const filteredPlugins = (baseConfig.plugins || []).filter(p => {
    if (p === 'expo-widget') return false;
    if (Array.isArray(p) && p[0] === 'expo-widget') return false;
    return true;
  });
  // TODO: Re-enable expo-widget when widget source files are implemented
  // For now, disable to allow Android build to succeed
  return {
    ...baseConfig,
    plugins: filteredPlugins,
  };
};