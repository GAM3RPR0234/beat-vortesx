/**
 * Navigation Types
 * Type definitions for React Navigation routes
 */

import { Track } from '@/store/playerStore';

export type RootStackParamList = {
  Main: undefined;
  Player: { trackId?: string; autoplay?: boolean } | undefined;
  Equalizer: undefined;
  Settings: { section?: string } | undefined;
  Podcasts: { podcastId?: string; episodeId?: string } | undefined;
  PlaylistManager: { playlistId?: string; mode?: 'create' | 'edit' | 'view' } | undefined;
  Search: { initialQuery?: string } | undefined;
  Library: {
    initialTab?: 'tracks' | 'albums' | 'artists' | 'playlists' | 'podcasts' | 'offline' | 'history';
    screen?: string;
    params?: any
  } | undefined;
  Downloads: undefined;
  Discovery: { initialTab?: 'radio' | 'mixes' | 'moods' | 'new-releases' } | undefined;
  M3UImport: undefined;
  LastFmSettings: undefined;
  DiscordSettings: undefined;
  Legal: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: { initialQuery?: string } | undefined;
  Library: { initialTab?: string } | undefined;
  Podcasts: undefined;
  Downloads: undefined;
};

// Declare the navigation types for TypeScript
declare module '@react-navigation/native' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface RootParamList extends RootStackParamList {}
}

// Type for PlayerScreen navigation params
export interface PlayerScreenParams {
  trackId?: string;
  autoplay?: boolean;
  track?: Track;
  index?: number;
}

// Type for PodcastScreen navigation params
export interface PodcastScreenParams {
  podcastId?: string;
  episodeId?: string;
}

// Type for PlaylistManagerScreen navigation params
export interface PlaylistManagerScreenParams {
  playlistId?: string;
  mode?: 'create' | 'edit' | 'view';
}

// Type for SearchScreen navigation params
export interface SearchScreenParams {
  initialQuery?: string;
}

// Type for LibraryScreen navigation params
export interface LibraryScreenParams {
  initialTab?: 'tracks' | 'albums' | 'artists' | 'playlists' | 'podcasts' | 'offline' | 'history';
  screen?: string;
  params?: any;
}

// Type for SettingsScreen navigation params
export interface SettingsScreenParams {
  section?: 'appearance' | 'playback' | 'library' | 'downloads' | 'integrations' | 'advanced' | 'about';
}