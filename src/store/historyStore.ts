// Beat Vortex - History Store
// Zustand store for playback history

import { create } from 'zustand';
import { historyService, HistoryEntry, HistoryStats } from '@/services/historyService';
import { Track } from '@/store/playerStore';

interface HistoryState {
  history: HistoryEntry[];
  stats: HistoryStats | null;
  isLoading: boolean;
  recentTracks: Track[];

  // Actions
  initialize: () => Promise<void>;
  recordPlay: (track: Track, source?: HistoryEntry['source'], progress?: number, duration?: number) => Promise<HistoryEntry>;
  updateProgress: (trackId: string, progress: number, duration: number) => Promise<void>;
  getRecentTracks: (limit?: number) => Track[];
  getRecentEntries: (limit?: number) => HistoryEntry[];
  getStats: () => HistoryStats;
  clearHistory: () => Promise<void>;
  removeEntry: (entryId: string) => Promise<void>;
  exportHistory: () => string;
  importHistory: (json: string) => Promise<void>;
  searchHistory: (query: string) => HistoryEntry[];
  refreshStats: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  history: [],
  stats: null,
  isLoading: true,
  recentTracks: [],

  initialize: async () => {
    await historyService.initialize();
    const history = historyService.getHistory();
    const recentTracks = historyService.getRecentTracks(20);
    const stats = historyService.getStats();
    set({ history, recentTracks, stats, isLoading: false });
  },

  recordPlay: async (track, source = 'library', progress = 1, duration) => {
    const entry = await historyService.recordPlay(track, source, progress, duration);
    const history = historyService.getHistory();
    const recentTracks = historyService.getRecentTracks(20);
    const stats = historyService.getStats();
    set({ history, recentTracks, stats });
    return entry;
  },

  updateProgress: async (trackId, progress, duration) => {
    await historyService.updateProgress(trackId, progress, duration);
    const history = historyService.getHistory();
    const stats = historyService.getStats();
    set({ history, stats });
  },

  getRecentTracks: (limit = 20) => {
    return historyService.getRecentTracks(limit);
  },

  getRecentEntries: (limit = 50) => {
    return historyService.getRecentEntries(limit);
  },

  getStats: () => {
    return historyService.getStats();
  },

  clearHistory: async () => {
    await historyService.clearHistory();
    set({ history: [], recentTracks: [], stats: historyService.getStats() });
  },

  removeEntry: async (entryId) => {
    await historyService.removeEntry(entryId);
    const history = historyService.getHistory();
    const recentTracks = historyService.getRecentTracks(20);
    const stats = historyService.getStats();
    set({ history, recentTracks, stats });
  },

  exportHistory: () => {
    return historyService.exportHistory();
  },

  importHistory: async (json) => {
    await historyService.importHistory(json);
    const history = historyService.getHistory();
    const recentTracks = historyService.getRecentTracks(20);
    const stats = historyService.getStats();
    set({ history, recentTracks, stats });
  },

  searchHistory: (query) => {
    return historyService.searchHistory(query);
  },

  refreshStats: () => {
    const stats = historyService.getStats();
    set({ stats });
  },
}));

// Subscribe to history service updates
historyService.subscribe((history) => {
  const recentTracks = history.slice(0, 20).map(e => e.track);
  const stats = historyService.getStats();
  useHistoryStore.setState({ history, recentTracks, stats });
});