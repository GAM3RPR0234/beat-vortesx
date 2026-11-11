import { Platform } from 'react-native';
import { Track } from '@/store/playerStore';

// Type definitions for widget data
export interface MiniPlayerWidgetData {
  currentTrack: Track | null;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  queueLength: number;
}

export interface RecentlyPlayedWidgetData {
  recentTracks: Array<{
    id: string;
    title: string;
    artist: string;
    artwork: string;
    playedAt: number;
  }>;
}

export interface QuickActionsWidgetData {
  hasDownloads: boolean;
  queueLength: number;
  isPlaying: boolean;
}

// Widget data storage keys
const WIDGET_KEYS = {
  miniplayer: '@beat_vortex_widget_miniplayer',
  recentlyPlayed: '@beat_vortex_widget_recently_played',
  quickActions: '@beat_vortex_widget_quick_actions',
} as const;

// In-memory cache for web/preview
const memoryCache: Record<string, string> = {};

/**
 * Widget Data Bridge
 * Handles communication between the React Native app and native home screen widgets
 * Uses expo-widget's setWidgetData on native platforms, falls back to AsyncStorage on web
 */
export const WidgetDataBridge = {
  /**
   * Update MiniPlayer widget data
   */
  async updateMiniPlayerWidget(data: MiniPlayerWidgetData): Promise<void> {
    const payload = JSON.stringify({
      ...data,
      timestamp: Date.now(),
      trackTitle: data.currentTrack?.title || 'No Track',
      trackArtist: data.currentTrack?.artist || '',
      trackArtwork: data.currentTrack?.artwork || '',
      progressPercent: data.duration > 0 ? (data.progress / data.duration) * 100 : 0,
    });

    await this.writeWidgetData(WIDGET_KEYS.miniplayer, payload);
  },

  /**
   * Update Recently Played widget data
   */
  async updateRecentlyPlayedWidget(data: RecentlyPlayedWidgetData): Promise<void> {
    const payload = JSON.stringify({
      ...data,
      timestamp: Date.now(),
      tracks: data.recentTracks.map((t) => ({
        id: t.id,
        title: t.title,
        artist: t.artist,
        artwork: t.artwork,
        playedAt: t.playedAt,
        timeAgo: this.formatTimeAgo(t.playedAt),
      })),
    });

    await this.writeWidgetData(WIDGET_KEYS.recentlyPlayed, payload);
  },

  /**
   * Update Quick Actions widget data
   */
  async updateQuickActionsWidget(data: QuickActionsWidgetData): Promise<void> {
    const payload = JSON.stringify({
      ...data,
      timestamp: Date.now(),
      actions: [
        {
          id: 'shuffle-all',
          label: 'Shuffle All',
          icon: 'shuffle',
          enabled: true,
        },
        {
          id: 'favorites',
          label: 'Favorites',
          icon: 'heart',
          enabled: true,
        },
        {
          id: 'downloads',
          label: 'Downloads',
          icon: 'download',
          enabled: data.hasDownloads,
        },
        {
          id: 'play-pause',
          label: data.isPlaying ? 'Pause' : 'Play',
          icon: data.isPlaying ? 'pause' : 'play',
          enabled: data.queueLength > 0,
        },
      ],
    });

    await this.writeWidgetData(WIDGET_KEYS.quickActions, payload);
  },

  /**
   * Write widget data to platform-appropriate storage
   */
  async writeWidgetData(key: string, data: string): Promise<void> {
    if (Platform.OS === 'web') {
      // Web: store in memory cache (widgets don't work on web)
      memoryCache[key] = data;
      return;
    }

    try {
      // Native: use expo-widget's setWidgetData
      const { setWidgetData } = await import('expo-widget');
      setWidgetData(key, data);
    } catch {
      // Fallback: store in AsyncStorage for native widget extension to read
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      await AsyncStorage.setItem(key, data);
    }
  },

  /**
   * Read widget data (for debugging/preview)
   */
  async readWidgetData(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return memoryCache[key] || null;
    }

    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      return await AsyncStorage.getItem(key);
    } catch {
      return null;
    }
  },

  /**
   * Format time ago for display
   */
  formatTimeAgo(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  },

  /**
   * Get all widget data (for debugging)
   */
  async getAllWidgetData(): Promise<Record<string, string>> {
    const keys = Object.values(WIDGET_KEYS);
    const data: Record<string, string> = {};

    for (const key of keys) {
      data[key] = (await this.readWidgetData(key)) || '';
    }

    return data;
  },

  /**
   * Clear all widget data
   */
  async clearAllWidgetData(): Promise<void> {
    if (Platform.OS === 'web') {
      Object.keys(memoryCache).forEach((key) => delete memoryCache[key]);
      return;
    }

    try {
      const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
      for (const key of Object.values(WIDGET_KEYS)) {
        await AsyncStorage.removeItem(key);
      }
    } catch {
      // Ignore errors
    }
  },
};