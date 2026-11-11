import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Track } from '@/store/playerStore';

export interface Playlist {
  id: string;
  title: string;
  description: string;
  artwork: string;
  tracks: string[]; // track IDs
  createdAt: number;
  updatedAt: number;
  isSmart: boolean;
  smartRules?: any[];
}

interface PlaylistStoreState {
  playlists: Playlist[];

  // Actions
  createPlaylist: (playlist: Omit<Playlist, 'id' | 'createdAt' | 'updatedAt'>) => Promise<string>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  getPlaylist: (id: string) => Playlist | undefined;
  addTrackToPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => Promise<void>;
  reorderPlaylistTracks: (playlistId: string, fromIndex: number, toIndex: number) => Promise<void>;
}

export const usePlaylistStore = create<PlaylistStoreState>()(
  persist(
    (set, get) => ({
      playlists: [],

      createPlaylist: async (playlistData) => {
        const id = `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const now = Date.now();
        const newPlaylist: Playlist = {
          ...playlistData,
          id,
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ playlists: [...state.playlists, newPlaylist] }));
        return id;
      },

      updatePlaylist: async (id, updates) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        }));
      },

      deletePlaylist: async (id) => {
        set((state) => ({ playlists: state.playlists.filter((p) => p.id !== id) }));
      },

      getPlaylist: (id) => {
        return get().playlists.find((p) => p.id === id);
      },

      addTrackToPlaylist: async (playlistId, trackId) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId && !p.tracks.includes(trackId)
              ? { ...p, tracks: [...p.tracks, trackId], updatedAt: Date.now() }
              : p
          ),
        }));
      },

      removeTrackFromPlaylist: async (playlistId, trackId) => {
        set((state) => ({
          playlists: state.playlists.map((p) =>
            p.id === playlistId
              ? { ...p, tracks: p.tracks.filter((t) => t !== trackId), updatedAt: Date.now() }
              : p
          ),
        }));
      },

      reorderPlaylistTracks: async (playlistId, fromIndex, toIndex) => {
        set((state) => ({
          playlists: state.playlists.map((p) => {
            if (p.id !== playlistId) return p;
            const newTracks = [...p.tracks];
            const [removed] = newTracks.splice(fromIndex, 1);
            newTracks.splice(toIndex, 0, removed);
            return { ...p, tracks: newTracks, updatedAt: Date.now() };
          }),
        }));
      },
    }),
    {
      name: 'beat-vortex-playlists',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        playlists: state.playlists,
      }),
    }
  )
);