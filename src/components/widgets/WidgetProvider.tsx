import React, { useEffect, useCallback } from 'react';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { usePlayerStore } from '@/store/playerStore';
import { useWidgetStore } from '@/store/widgetStore';
import { useHistoryStore } from '@/store/historyStore';
import { useDownloadStore } from '@/store/downloadStore';
import { WidgetDataBridge } from '@/utils/widgetDataBridge';
import { HistoryEntry } from '@/services/historyService';

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  const { currentTrack, isPlaying, progress, duration, queue, volume } = usePlayerStore();
  const { getEnabledWidgets } = useWidgetStore();
  const { history } = useHistoryStore();
  const { activeDownloads } = useDownloadStore();

  const updateWidgetData = useCallback(async () => {
    const enabledWidgets = getEnabledWidgets();

    for (const widget of enabledWidgets) {
      switch (widget.type) {
        case 'miniplayer':
          await WidgetDataBridge.updateMiniPlayerWidget({
            currentTrack,
            isPlaying,
            progress,
            duration,
            volume,
            queueLength: queue.length,
          });
          break;
        case 'recentlyPlayed':
          await WidgetDataBridge.updateRecentlyPlayedWidget({
            recentTracks: history.slice(0, 5).map((entry: HistoryEntry) => ({
              id: entry.track.id,
              title: entry.track.title,
              artist: entry.track.artist,
              artwork: entry.track.artwork,
              playedAt: entry.playedAt,
            })),
          });
          break;
        case 'quickActions':
          await WidgetDataBridge.updateQuickActionsWidget({
            hasDownloads: activeDownloads.some((d) => d.status === 'completed'),
            queueLength: queue.length,
            isPlaying,
          });
          break;
      }
    }
  }, [currentTrack, isPlaying, progress, duration, volume, queue, history, activeDownloads, getEnabledWidgets]);

  // Update on app state change (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active' || nextAppState === 'background') {
        updateWidgetData();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [updateWidgetData]);

  // Update on player state changes (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      updateWidgetData();
    }, 1000);

    return () => clearTimeout(timer);
  }, [currentTrack, isPlaying, progress, updateWidgetData]);

  // Initial update
  useEffect(() => {
    updateWidgetData();
  }, []);

  return <>{children}</>;
}

// Platform-specific widget registration (only on native)
if (Platform.OS !== 'web') {
  // Widget definitions are registered in app.config.js via expo-widget
  // This file serves as the data bridge
}