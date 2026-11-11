// app.config.js - Expo configuration with widget support
// This file runs in Node.js context (not Metro), so use relative paths

const widgetConfig = {
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
};

export default (config) => {
  // The config passed in is already the expo config object
  return {
    ...config,
    // expo-widget configuration
    plugins: [
      ...(config.plugins || []),
      [
        'expo-widget',
        {
          widgets: widgetConfig.widgets,
        },
      ],
    ],
  };
};