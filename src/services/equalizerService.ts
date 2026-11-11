import { Track } from '@/store/playerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Polyfill for requestAnimationFrame in test environments (Node.js)
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(() => callback(performance.now()), 0) as unknown as number;
  };
  global.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

// Polyfill for performance.now in test environments
if (typeof global.performance === 'undefined') {
  global.performance = {
    now: () => Date.now(),
    timeOrigin: Date.now(),
    timing: {},
    navigation: {},
    eventCounts: [],
    onresourcetimingbufferfull: null,
    clearResourceTimings: () => {},
    setResourceTimingBufferSize: () => {},
    toJSON: () => ({}),
    clearMarks: () => {},
    clearMeasures: () => {},
    getEntries: () => [],
    getEntriesByName: () => [],
    getEntriesByType: () => [],
    mark: () => {},
    measure: () => {},
  } as unknown as Performance;
}

// Mock AsyncStorage for test environments (Node.js without window)
let mockAsyncStorage: Map<string, string> | null = null;
if (typeof window === 'undefined' && typeof global.window === 'undefined') {
  mockAsyncStorage = new Map<string, string>();

  // Override AsyncStorage methods for testing
  const originalGetItem = AsyncStorage.getItem;
  const originalSetItem = AsyncStorage.setItem;
  const originalRemoveItem = AsyncStorage.removeItem;

  AsyncStorage.getItem = async (key: string) => {
    if (mockAsyncStorage && mockAsyncStorage.has(key)) {
      return mockAsyncStorage.get(key) || null;
    }
    return originalGetItem(key);
  };

  AsyncStorage.setItem = async (key: string, value: string) => {
    if (mockAsyncStorage) {
      mockAsyncStorage.set(key, value);
      return;
    }
    return originalSetItem(key, value);
  };

  AsyncStorage.removeItem = async (key: string) => {
    if (mockAsyncStorage) {
      mockAsyncStorage.delete(key);
      return;
    }
    return originalRemoveItem(key);
  };
}

// Export for test cleanup
export function __resetMockAsyncStorage() {
  if (mockAsyncStorage) {
    mockAsyncStorage.clear();
  }
}

export interface EQPreset {
  name: string;
  values: number[];
  icon: string;
  isAI?: boolean;
  genre?: string;
}

export interface EQState {
  values: number[];
  preset: string;
  enabled: boolean;
  isAIMode: boolean;
}

const EQ_BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 16000];

const GENRE_PRESET_MAP: Record<string, number[]> = {
  'synthwave': [6, 4, 2, 0, -2, 2, 6, 8, 6],
  'dark synth': [8, 6, 4, 2, 0, 4, 8, 10, 8],
  'cyberpunk': [8, 6, 4, 2, 0, 4, 8, 10, 8],
  'retrowave': [5, 3, 0, -2, -2, 0, 3, 5, 4],
  'chillwave': [2, 2, 1, 0, 1, 2, 3, 3, 2],
  'electronic': [6, 4, 2, 0, -2, 2, 6, 8, 6],
  'edm': [7, 5, 2, 0, -1, 3, 7, 9, 7],
  'house': [6, 3, 1, 0, 0, 2, 5, 7, 6],
  'techno': [7, 4, 2, 1, 0, 3, 7, 9, 8],
  'trance': [5, 3, 1, 0, 0, 2, 6, 8, 7],
  'dubstep': [9, 7, 4, 1, 0, 3, 6, 8, 7],
  'drum and bass': [6, 4, 2, 1, 0, 3, 7, 9, 8],
  'ambient': [2, 2, 1, 0, 0, 1, 2, 3, 2],
  'rock': [5, 3, 0, -2, -2, 0, 3, 5, 4],
  'alternative': [4, 2, 0, -1, -1, 1, 4, 6, 5],
  'indie': [3, 2, 0, 0, 0, 1, 3, 5, 4],
  'metal': [6, 4, 1, 0, 0, 2, 5, 7, 6],
  'punk': [5, 3, 1, 0, -1, 2, 5, 7, 6],
  'grunge': [5, 3, 0, -1, -1, 1, 4, 6, 5],
  'pop': [3, 2, 1, 2, 3, 4, 3, 2, 1],
  'dance pop': [4, 3, 1, 1, 2, 4, 5, 5, 4],
  'synthpop': [5, 3, 2, 1, 0, 3, 6, 7, 6],
  'k-pop': [4, 3, 2, 2, 3, 4, 4, 3, 2],
  'hip hop': [6, 5, 3, 1, 0, 1, 3, 4, 3],
  'rap': [6, 5, 3, 1, 0, 1, 3, 4, 3],
  'trap': [8, 6, 3, 0, -1, 1, 3, 4, 3],
  'boom bap': [5, 4, 2, 1, 0, 1, 2, 3, 2],
  'r&b': [4, 3, 2, 2, 3, 4, 3, 2, 1],
  'soul': [3, 2, 2, 3, 4, 3, 2, 1, 0],
  'funk': [4, 3, 1, 2, 3, 4, 3, 2, 1],
  'neo soul': [3, 2, 2, 3, 4, 3, 2, 1, 0],
  'jazz': [2, 2, 2, 2, 2, 2, 1, 0, -1],
  'bebop': [1, 1, 2, 2, 2, 1, 1, 0, -1],
  'smooth jazz': [2, 2, 1, 1, 2, 3, 2, 1, 0],
  'classical': [0, 0, 2, 4, 4, 2, 0, -2, -4],
  'orchestral': [0, 0, 1, 3, 4, 2, 1, -1, -2],
  'chamber music': [0, 0, 1, 2, 3, 2, 1, 0, -1],
  'opera': [-1, 0, 1, 2, 3, 2, 1, 0, -1],
  'folk': [1, 1, 1, 2, 3, 2, 1, 0, 0],
  'acoustic': [1, 1, 1, 2, 3, 2, 1, 0, 0],
  'singer-songwriter': [1, 1, 1, 2, 3, 2, 1, 0, 0],
  'indie folk': [1, 1, 1, 2, 3, 2, 1, 0, 0],
  'latin': [3, 3, 2, 1, 2, 3, 4, 4, 3],
  'reggaeton': [6, 5, 3, 1, 0, 2, 4, 5, 4],
  'bachata': [3, 3, 2, 2, 3, 3, 3, 2, 1],
  'salsa': [3, 3, 2, 2, 3, 3, 3, 2, 1],
  'cumbia': [4, 4, 3, 2, 2, 3, 3, 3, 2],
  'latin pop': [3, 3, 2, 2, 3, 4, 4, 3, 2],
  'vocal': [-4, -2, 0, 2, 4, 6, 4, 2, 0],
  'bass': [8, 6, 3, 0, -2, -4, -4, -6, -8],
  'treble': [-6, -4, -2, 0, 2, 4, 6, 8, 10],
  'flat': [0, 0, 0, 0, 0, 0, 0, 0, 0],
};

const BUILTIN_PRESETS: EQPreset[] = [
  { name: 'Plano', values: [0, 0, 0, 0, 0, 0, 0, 0, 0], icon: 'remove' },
  { name: 'Bass Boost', values: [8, 6, 3, 0, -2, -4, -4, -6, -8], icon: 'volume-high' },
  { name: 'Vocal', values: [-4, -2, 0, 2, 4, 6, 4, 2, 0], icon: 'mic' },
  { name: 'Electrónica', values: [6, 4, 2, 0, -2, 2, 6, 8, 6], icon: 'flash' },
  { name: 'Rock', values: [5, 3, 0, -2, -2, 0, 3, 5, 4], icon: 'git-network' },
  { name: 'Clásica', values: [0, 0, 2, 4, 4, 2, 0, -2, -4], icon: 'musical-notes' },
  { name: 'Cyberpunk', values: [8, 6, 4, 2, 0, 4, 8, 10, 8], icon: 'rocket' },
  { name: 'IA Adaptativo', values: [4, 3, 2, 1, 0, 3, 6, 8, 7], icon: 'sparkles', isAI: true },
];

const STORAGE_KEYS = {
  EQ_PREFS: 'beatvortex_eq_preferences',
  EQ_USER_PRESETS: 'beatvortex_eq_user_presets',
};

interface EQPreferences {
  enabled: boolean;
  isAIMode: boolean;
  lastPreset: string;
  genrePreferences: Record<string, number[]>;
}

class EqualizerService {
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private animationFrame: number | null = null;
  private fftData: Uint8Array | null = null;
  private callbacks: Set<(fftData: Uint8Array) => void> = new Set();
  private currentEQValues: number[] = new Array(9).fill(0);
  private targetEQValues: number[] = new Array(9).fill(0);
  private interpolationProgress = 1;
  private isInterpolating = false;

  async initAudioContext(audioElement: HTMLAudioElement): Promise<void> {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.sourceNode = this.audioContext.createMediaElementSource(audioElement);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);

      this.fftData = new Uint8Array(this.analyser.frequencyBinCount);
      this.startFFTLoop();
    } catch (error) {
      console.warn('AudioContext initialization failed:', error);
    }
  }

  private startFFTLoop(): void {
    if (!this.analyser || !this.fftData) return;

    const loop = () => {
      this.analyser!.getByteFrequencyData(this.fftData! as any);
      this.callbacks.forEach(cb => cb(this.fftData!));
      this.animationFrame = requestAnimationFrame(loop);
    };
    loop();
  }

  stopRealTimeAnalysis(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  subscribeFFT(callback: (fftData: Uint8Array) => void): () => void {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  getFFTData(): Uint8Array | null {
    return this.fftData;
  }

  getBandsForFrequencyRange(startFreq: number, endFreq: number): number[] {
    if (!this.fftData || !this.analyser) return [];

    const sampleRate = this.audioContext?.sampleRate || 44100;
    const nyquist = sampleRate / 2;
    const binWidth = nyquist / this.analyser.frequencyBinCount;

    const startBin = Math.floor(startFreq / binWidth);
    const endBin = Math.floor(endFreq / binWidth);

    const result: number[] = [];
    for (let i = startBin; i <= endBin && i < this.fftData.length; i++) {
      result.push(this.fftData[i] / 255);
    }
    return result;
  }

  getPresetForGenre(genre: string): number[] {
    const normalized = genre.toLowerCase().trim();
    return GENRE_PRESET_MAP[normalized] || GENRE_PRESET_MAP['flat'] || new Array(9).fill(0);
  }

  getAIRecommendation(track: Track): { preset: string; values: number[]; confidence: number } {
    const genre = track.genre || 'unknown';
    const bpm = track.bpm || 120;

    const presetValues = this.getPresetForGenre(genre);
    let confidence = 0.7;

    if (track.genre) {
      const normalized = track.genre.toLowerCase().trim();
      if (GENRE_PRESET_MAP[normalized]) {
        confidence = 0.9;
      }
    }

    if (bpm > 140 && (genre.includes('electronic') || genre.includes('techno') || genre.includes('dubstep'))) {
      confidence = Math.min(0.95, confidence + 0.1);
    }

    return {
      preset: 'IA Adaptativo',
      values: presetValues,
      confidence,
    };
  }

  applyPreset(presetName: string, currentValues: number[] = new Array(9).fill(0)): number[] {
    const preset = BUILTIN_PRESETS.find(p => p.name === presetName);
    if (preset) {
      return [...preset.values];
    }

    if (GENRE_PRESET_MAP[presetName.toLowerCase()]) {
      return [...GENRE_PRESET_MAP[presetName.toLowerCase()]];
    }

    return currentValues;
  }

  interpolatePresets(from: number[], to: number[], progress: number): number[] {
    if (from.length !== to.length) return to;
    return from.map((val, i) => val + (to[i] - val) * progress);
  }

  startSmoothTransition(from: number[], to: number[], durationMs: number = 300): Promise<number[]> {
    return new Promise(resolve => {
      this.currentEQValues = [...from];
      this.targetEQValues = [...to];
      this.interpolationProgress = 0;
      this.isInterpolating = true;

      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        this.interpolationProgress = Math.min(1, elapsed / durationMs);

        this.currentEQValues = this.interpolatePresets(from, to, this.interpolationProgress);

        if (this.interpolationProgress >= 1) {
          this.isInterpolating = false;
          resolve([...this.currentEQValues]);
        } else {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
    });
  }

  getCurrentInterpolatedValues(): number[] {
    if (this.isInterpolating) {
      return [...this.currentEQValues];
    }
    return [...this.targetEQValues];
  }

  async loadPreferences(): Promise<EQPreferences> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.EQ_PREFS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load EQ preferences:', error);
    }
    return {
      enabled: true,
      isAIMode: false,
      lastPreset: 'Plano',
      genrePreferences: {},
    };
  }

  async savePreferences(prefs: Partial<EQPreferences>): Promise<void> {
    try {
      const current = await this.loadPreferences();
      const updated = { ...current, ...prefs };
      await AsyncStorage.setItem(STORAGE_KEYS.EQ_PREFS, JSON.stringify(updated));
    } catch (error) {
      console.warn('Failed to save EQ preferences:', error);
    }
  }

  async getGenrePreference(genre: string): Promise<number[] | null> {
    const prefs = await this.loadPreferences();
    const normalized = genre.toLowerCase().trim();
    return prefs.genrePreferences[normalized] || null;
  }

  async setGenrePreference(genre: string, values: number[]): Promise<void> {
    const prefs = await this.loadPreferences();
    const normalized = genre.toLowerCase().trim();
    prefs.genrePreferences[normalized] = values;
    await this.savePreferences(prefs);
  }

  async getUserPresets(): Promise<EQPreset[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.EQ_USER_PRESETS);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Failed to load user presets:', error);
    }
    return [];
  }

  async saveUserPreset(preset: EQPreset): Promise<void> {
    const presets = await this.getUserPresets();
    const existingIndex = presets.findIndex(p => p.name === preset.name);
    if (existingIndex >= 0) {
      presets[existingIndex] = preset;
    } else {
      presets.push(preset);
    }
    await AsyncStorage.setItem(STORAGE_KEYS.EQ_USER_PRESETS, JSON.stringify(presets));
  }

  async deleteUserPreset(name: string): Promise<void> {
    const presets = await this.getUserPresets();
    const filtered = presets.filter(p => p.name !== name);
    await AsyncStorage.setItem(STORAGE_KEYS.EQ_USER_PRESETS, JSON.stringify(filtered));
  }

  getBuiltinPresets(): EQPreset[] {
    return [...BUILTIN_PRESETS];
  }

  getAllPresets(): Promise<EQPreset[]> {
    return this.getUserPresets().then(userPresets => [...BUILTIN_PRESETS, ...userPresets]);
  }

  getBands(): number[] {
    return [...EQ_BANDS];
  }
}

export const equalizerService = new EqualizerService();