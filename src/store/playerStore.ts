import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration: number;
  url?: string;
  quality?: string;
  lyrics?: string;
  translatedLyrics?: string;
  genre?: string;
  bpm?: number;
  year?: number;
  trackNumber?: number;
  totalTracks?: number;
  key?: string;
  energy?: number;
  danceability?: number;
  valence?: number;
  // ReplayGain metadata
  replayGainTrackGain?: number;
  replayGainTrackPeak?: number;
  replayGainAlbumGain?: number;
  replayGainAlbumPeak?: number;
  // Local file path for downloaded tracks
  downloadPath?: string;
}

export interface ParsedLyricLine {
  time: number;
  text: string;
  translation?: string;
  words?: { time: number; text: string }[];
}

export interface LyricsData {
  synced: ParsedLyricLine[];
  plain: string;
  language: 'es' | 'en' | 'unknown';
  source: 'embedded' | 'lrclib' | 'generated';
}

interface PlayerState {
  currentTrack: Track | null;
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  isShuffle: boolean;
  repeatMode: 'off' | 'all' | 'one';
  isMiniPlayerVisible: boolean;
  showLyrics: boolean;
  lyricsTranslation: string | null;
  dynamicColors: {
    primary: string;
    secondary: string;
    background: string;
    textOnPrimary: string;
  } | null;
  showQueue: boolean;

  // Advanced Audio Features
  crossfadeDuration: number; // 0-12000ms
  playbackRate: number; // 0.5-2.0
  pitchShift: number; // -12 to +12 semitones
  replayGainEnabled: boolean;
  gaplessEnabled: boolean;

  // AI Smart Queue
  smartQueueMode: 'off' | 'radio' | 'mix' | 'discovery';
  smartQueue: Track[];
  setSmartQueueMode: (mode: PlayerState['smartQueueMode']) => void;
  generateSmartQueue: () => Promise<void>;

  // Adaptive EQ
  eqPreset: string;
  eqValues: number[];
  eqEnabled: boolean;
  isAIMode: boolean;
  setEQPreset: (preset: string) => void;
  setEQValues: (values: number[]) => void;
  setEQEnabled: (enabled: boolean) => void;
  toggleAIMode: () => void;

  // Lyrics
  lyricsData: LyricsData | null;
  lyricsLoading: boolean;
  setLyricsData: (data: LyricsData | null) => void;
  setLyricsLoading: (loading: boolean) => void;

  setCurrentTrack: (track: Track, index?: number) => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  next: () => void;
  previous: () => void;
  seek: (position: number) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setMiniPlayerVisible: (visible: boolean) => void;
  setShowLyrics: (show: boolean) => void;
  setShowQueue: (show: boolean) => void;
  setLyricsTranslation: (lang: string | null) => void;
  setDynamicColors: (colors: PlayerState['dynamicColors']) => void;
  clearQueue: () => void;

  // Audio feature setters
  setCrossfadeDuration: (duration: number) => void;
  setPlaybackRate: (rate: number) => void;
  setPitchShift: (semitones: number) => void;
  setReplayGainEnabled: (enabled: boolean) => void;
  setGaplessEnabled: (enabled: boolean) => void;
}

const DEFAULT_COLORS = {
  primary: '#00d4ff',
  secondary: '#b84dff',
  background: '#0a0a0f',
  textOnPrimary: '#0a0a0f',
};

export const usePlayerStore = create<PlayerState>()(
  persist(
    (set, get) => ({
      currentTrack: null,
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      progress: 0,
      duration: 0,
      volume: 1,
      isShuffle: false,
      repeatMode: 'off',
      isMiniPlayerVisible: false,
      showLyrics: false,
      lyricsTranslation: null,
      dynamicColors: DEFAULT_COLORS,
      showQueue: false,

      // Advanced Audio Features
      crossfadeDuration: 0,
      playbackRate: 1.0,
      pitchShift: 0,
      replayGainEnabled: false,
      gaplessEnabled: true,

      // AI Smart Queue
      smartQueueMode: 'off',
      smartQueue: [],
      setSmartQueueMode: (mode) => set({ smartQueueMode: mode }),
      generateSmartQueue: async () => {
        const { currentTrack, queue, smartQueueMode } = get();
        if (!currentTrack || smartQueueMode === 'off') return;

        const { aiService } = await import('@/services/aiService');
        const allTracks = [...queue];
        const config = {
          mode: smartQueueMode,
          seedTrackId: currentTrack.id,
          maxLength: 20,
          diversityFactor: smartQueueMode === 'discovery' ? 0.7 : 0.3,
        };
        const smartQueue = await aiService.generateSmartQueue(config, allTracks);
        set({ smartQueue });
      },

      // Adaptive EQ
      eqPreset: 'Plano',
      eqValues: new Array(9).fill(0),
      eqEnabled: true,
      isAIMode: false,
      setEQPreset: (preset) => set({ eqPreset: preset }),
      setEQValues: (values) => set({ eqValues: values }),
      setEQEnabled: (enabled) => set({ eqEnabled: enabled }),
      toggleAIMode: () => set((state) => ({ isAIMode: !state.isAIMode })),

      // Lyrics
      lyricsData: null,
      lyricsLoading: false,
      setLyricsData: (data) => set({ lyricsData: data }),
      setLyricsLoading: (loading) => set({ lyricsLoading: loading }),

      setCurrentTrack: (track, index = 0) => {
        const queue = get().queue;
        const newIndex = index >= 0 && index < queue.length ? index : 0;
        set({ currentTrack: track, currentIndex: newIndex, progress: 0 });
      },

      setQueue: (tracks, startIndex = 0) => {
        if (tracks.length === 0) return;
        set({
          queue: tracks,
          currentIndex: Math.min(startIndex, tracks.length - 1),
          currentTrack: tracks[Math.min(startIndex, tracks.length - 1)],
          progress: 0,
        });
      },

      addToQueue: (track) => {
        set((state) => ({
          queue: [...state.queue, track],
        }));
      },

      removeFromQueue: (index) => {
        set((state) => {
          const newQueue = state.queue.filter((_, i) => i !== index);
          let newIndex = state.currentIndex;
          if (index < state.currentIndex) newIndex -= 1;
          else if (index === state.currentIndex && newQueue.length > 0) {
            newIndex = Math.min(state.currentIndex, newQueue.length - 1);
          } else if (newQueue.length === 0) {
            newIndex = -1;
          }
          return {
            queue: newQueue,
            currentIndex: newIndex,
            currentTrack: newQueue[newIndex] || null,
          };
        });
      },

      play: () => set({ isPlaying: true }),
      pause: () => set({ isPlaying: false }),
      togglePlay: () => set((state) => ({ isPlaying: !state.isPlaying })),

      next: () => {
        const { queue, currentIndex, isShuffle, repeatMode } = get();
        if (queue.length === 0) return;

        let nextIndex: number;
        if (isShuffle) {
          nextIndex = Math.floor(Math.random() * queue.length);
        } else {
          nextIndex = currentIndex + 1;
          if (nextIndex >= queue.length) {
            if (repeatMode === 'all') nextIndex = 0;
            else return;
          }
        }
        set({
          currentIndex: nextIndex,
          currentTrack: queue[nextIndex],
          progress: 0,
          isPlaying: true,
        });
      },

      previous: () => {
        const { queue, currentIndex, progress } = get();
        if (queue.length === 0) return;

        if (progress > 3) {
          set({ progress: 0 });
          return;
        }

        let prevIndex = currentIndex - 1;
        if (prevIndex < 0) prevIndex = queue.length - 1;
        set({
          currentIndex: prevIndex,
          currentTrack: queue[prevIndex],
          progress: 0,
          isPlaying: true,
        });
      },

      seek: (position) => set({ progress: Math.max(0, Math.min(position, get().duration)) }),
      setProgress: (progress) => set({ progress }),
      setDuration: (duration) => set({ duration }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),

      toggleShuffle: () => set((state) => ({ isShuffle: !state.isShuffle })),
      cycleRepeat: () =>
        set((state) => ({
          repeatMode: state.repeatMode === 'off' ? 'all' : state.repeatMode === 'all' ? 'one' : 'off',
        })),

      setMiniPlayerVisible: (visible: boolean) => set({ isMiniPlayerVisible: visible }),
      setShowLyrics: (show: boolean) => set({ showLyrics: show }),
      setLyricsTranslation: (lang: string | null) => set({ lyricsTranslation: lang }),
      setDynamicColors: (colors: PlayerState['dynamicColors']) => set({ dynamicColors: colors }),
      setShowQueue: (show: boolean) => set({ showQueue: show }),

      // Audio feature setters
      setCrossfadeDuration: (duration: number) => set({ crossfadeDuration: Math.max(0, Math.min(12000, duration)) }),
      setPlaybackRate: (rate: number) => set({ playbackRate: Math.max(0.5, Math.min(2.0, rate)) }),
      setPitchShift: (semitones: number) => set({ pitchShift: Math.max(-12, Math.min(12, semitones)) }),
      setReplayGainEnabled: (enabled: boolean) => set({ replayGainEnabled: enabled }),
      setGaplessEnabled: (enabled: boolean) => set({ gaplessEnabled: enabled }),

      clearQueue: () =>
        set({
          queue: [],
          currentIndex: -1,
          currentTrack: null,
          progress: 0,
          duration: 0,
          isPlaying: false,
        }),
    }),
    {
      name: 'beat-vortex-player',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        queue: state.queue,
        currentIndex: state.currentIndex,
        volume: state.volume,
        isShuffle: state.isShuffle,
        repeatMode: state.repeatMode,
        showLyrics: state.showLyrics,
        // Advanced Audio Features
        crossfadeDuration: state.crossfadeDuration,
        playbackRate: state.playbackRate,
        pitchShift: state.pitchShift,
        replayGainEnabled: state.replayGainEnabled,
        gaplessEnabled: state.gaplessEnabled,
      }),
    }
  )
);