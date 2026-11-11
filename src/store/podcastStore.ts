// Beat Vortex - Podcast Store
// Zustand store for podcast management

import { create } from 'zustand';
import { podcastService, Podcast, PodcastEpisode, PodcastSearchResult } from '@/services/podcastService';

interface PodcastState {
  podcasts: Podcast[];
  episodes: Record<string, PodcastEpisode[]>;
  searchResults: PodcastSearchResult[];
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  searchPodcasts: (query: string, limit?: number) => Promise<PodcastSearchResult[]>;
  addPodcastByUrl: (feedUrl: string) => Promise<Podcast | null>;
  subscribe: (podcastId: string) => Promise<boolean>;
  unsubscribe: (podcastId: string) => Promise<boolean>;
  removePodcast: (podcastId: string) => Promise<void>;
  refreshPodcast: (podcastId: string) => Promise<boolean>;
  refreshAllSubscribed: () => Promise<void>;
  getEpisodes: (podcastId: string) => PodcastEpisode[];
  getEpisode: (podcastId: string, episodeId: string) => PodcastEpisode | undefined;
  updatePlayProgress: (podcastId: string, episodeId: string, progress: number, played?: boolean) => Promise<void>;
  markDownloaded: (podcastId: string, episodeId: string, path: string) => Promise<void>;
  removeDownload: (podcastId: string, episodeId: string) => Promise<void>;
  getSubscribedPodcasts: () => Podcast[];
  getDownloadedEpisodes: () => PodcastEpisode[];
  getInProgressEpisodes: () => PodcastEpisode[];
  getLatestEpisodes: (limit?: number) => PodcastEpisode[];
  searchEpisodes: (query: string) => PodcastEpisode[];
  clearSearch: () => void;
}

export const usePodcastStore = create<PodcastState>((set, get) => ({
  podcasts: [],
  episodes: {},
  searchResults: [],
  isLoading: true,
  isSearching: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      await podcastService.initialize();
      const podcasts = podcastService.getPodcasts();

      // Load episodes for all podcasts
      const episodes: Record<string, PodcastEpisode[]> = {};
      for (const podcast of podcasts) {
        episodes[podcast.id] = podcastService.getEpisodes(podcast.id);
      }

      set({ podcasts, episodes, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to initialize podcasts', isLoading: false });
    }
  },

  searchPodcasts: async (query, limit = 20) => {
    if (!query.trim()) {
      set({ searchResults: [], isSearching: false });
      return [];
    }

    set({ isSearching: true, error: null });
    try {
      const results = await podcastService.searchPodcasts(query, limit);
      set({ searchResults: results, isSearching: false });
      return results;
    } catch (error) {
      set({ error: 'Search failed', isSearching: false });
      return [];
    }
  },

  addPodcastByUrl: async (feedUrl) => {
    set({ error: null });
    try {
      const podcast = await podcastService.addPodcastByUrl(feedUrl);
      if (podcast) {
        const podcasts = podcastService.getPodcasts();
        const episodes = { ...get().episodes };
        episodes[podcast.id] = podcastService.getEpisodes(podcast.id);
        set({ podcasts, episodes });
      }
      return podcast;
    } catch (error) {
      set({ error: 'Failed to add podcast' });
      return null;
    }
  },

  subscribe: async (podcastId) => {
    set({ error: null });
    try {
      const success = await podcastService.subscribe(podcastId);
      if (success) {
        const podcasts = podcastService.getPodcasts();
        set({ podcasts });
      }
      return success;
    } catch (error) {
      set({ error: 'Failed to subscribe' });
      return false;
    }
  },

  unsubscribe: async (podcastId) => {
    set({ error: null });
    try {
      const success = await podcastService.unsubscribe(podcastId);
      if (success) {
        const podcasts = podcastService.getPodcasts();
        set({ podcasts });
      }
      return success;
    } catch (error) {
      set({ error: 'Failed to unsubscribe' });
      return false;
    }
  },

  removePodcast: async (podcastId) => {
    set({ error: null });
    try {
      await podcastService.removePodcast(podcastId);
      const podcasts = podcastService.getPodcasts();
      const episodes = { ...get().episodes };
      delete episodes[podcastId];
      set({ podcasts, episodes });
    } catch (error) {
      set({ error: 'Failed to remove podcast' });
    }
  },

  refreshPodcast: async (podcastId) => {
    set({ error: null });
    try {
      const success = await podcastService.refreshPodcast(podcastId);
      if (success) {
        const podcasts = podcastService.getPodcasts();
        const episodes = { ...get().episodes };
        episodes[podcastId] = podcastService.getEpisodes(podcastId);
        set({ podcasts, episodes });
      }
      return success;
    } catch (error) {
      set({ error: 'Failed to refresh podcast' });
      return false;
    }
  },

  refreshAllSubscribed: async () => {
    set({ error: null });
    try {
      await podcastService.refreshAllSubscribed();
      const podcasts = podcastService.getPodcasts();
      const episodes: Record<string, PodcastEpisode[]> = {};
      for (const podcast of podcasts) {
        episodes[podcast.id] = podcastService.getEpisodes(podcast.id);
      }
      set({ podcasts, episodes });
    } catch (error) {
      set({ error: 'Failed to refresh podcasts' });
    }
  },

  getEpisodes: (podcastId) => {
    return podcastService.getEpisodes(podcastId);
  },

  getEpisode: (podcastId, episodeId) => {
    return podcastService.getEpisode(podcastId, episodeId);
  },

  updatePlayProgress: async (podcastId, episodeId, progress, played = false) => {
    try {
      await podcastService.updatePlayProgress(podcastId, episodeId, progress, played);
      const episodes = { ...get().episodes };
      episodes[podcastId] = podcastService.getEpisodes(podcastId);
      set({ episodes });
    } catch (error) {
      set({ error: 'Failed to update progress' });
    }
  },

  markDownloaded: async (podcastId, episodeId, path) => {
    try {
      await podcastService.markDownloaded(podcastId, episodeId, path);
      const episodes = { ...get().episodes };
      episodes[podcastId] = podcastService.getEpisodes(podcastId);
      set({ episodes });
    } catch (error) {
      set({ error: 'Failed to mark download' });
    }
  },

  removeDownload: async (podcastId, episodeId) => {
    try {
      await podcastService.removeDownload(podcastId, episodeId);
      const episodes = { ...get().episodes };
      episodes[podcastId] = podcastService.getEpisodes(podcastId);
      set({ episodes });
    } catch (error) {
      set({ error: 'Failed to remove download' });
    }
  },

  getSubscribedPodcasts: () => {
    return podcastService.getSubscribedPodcasts();
  },

  getDownloadedEpisodes: () => {
    return podcastService.getDownloadedEpisodes();
  },

  getInProgressEpisodes: () => {
    return podcastService.getInProgressEpisodes();
  },

  getLatestEpisodes: (limit = 20) => {
    return podcastService.getLatestEpisodes(limit);
  },

  searchEpisodes: (query) => {
    return podcastService.searchEpisodes(query);
  },

  clearSearch: () => {
    set({ searchResults: [] });
  },
}));

// Subscribe to podcast service updates
podcastService.onPodcastsChange((podcasts) => {
  const episodes: Record<string, PodcastEpisode[]> = {};
  for (const podcast of podcasts) {
    episodes[podcast.id] = podcastService.getEpisodes(podcast.id);
  }
  usePodcastStore.setState({ podcasts, episodes });
});