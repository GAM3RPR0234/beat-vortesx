/**
 * Widget Definitions for expo-widget
 * These define the home screen widgets for BEAT VORTEX
 *
 * Note: expo-widget requires Expo SDK 51+ and native builds (not Expo Go)
 * Widgets are defined here and registered in app.config.js
 */

// Widget configuration for app.config.js
export const widgetConfig = {
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

// Widget types for reference
export type WidgetType = 'miniplayer' | 'recentlyPlayed' | 'quickActions';
export type WidgetSize = 'small' | 'medium' | 'large';