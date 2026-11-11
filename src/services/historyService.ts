// Beat Vortex - History Service
// Playback history tracking with persistence

import { Track } from '@/store/playerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HistoryEntry {
  id: string;
  track: Track;
  playedAt: number; // Unix timestamp
  source: 'library' | 'search' | 'radio' | 'playlist' | 'album' | 'artist' | 'recommendation' | 'imported';
  progress: number; // 0-1 percentage played
  completed: boolean; // true if >= 50% or 4 minutes played
  duration: number; // Track duration at time of play
}

export interface HistoryStats {
  totalPlays: number;
  uniqueTracks: number;
  uniqueArtists: number;
  totalListeningTime: number; // seconds
  favoriteGenre: string | null;
  favoriteArtist: string | null;
  topTracks: Array<{ track: Track; count: number }>;
  topArtists: Array<{ artist: string; count: number }>;
  recentActivity: HistoryEntry[];
}

const STORAGE_KEY = 'beat-vortex-history';
const MAX_HISTORY_ENTRIES = 1000;
const MIN_PLAY_THRESHOLD = 0.5; // 50% or 4 minutes
const MIN_PLAY_SECONDS = 240; // 4 minutes

class HistoryService {
  private history: HistoryEntry[] = [];
  private initialized = false;
  private listeners: Set<(history: HistoryEntry[]) => void> = new Set();

  async initialize() {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.history = JSON.parse(stored);
        // Sort newest first
        this.history.sort((a, b) => b.playedAt - a.playedAt);
        // Trim if needed
        if (this.history.length > MAX_HISTORY_ENTRIES) {
          this.history = this.history.slice(0, MAX_HISTORY_ENTRIES);
        }
      }
    } catch (error) {
      console.warn('Failed to load history:', error);
      this.history = [];
    }

    this.initialized = true;
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.history));
    } catch (error) {
      console.warn('Failed to persist history:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.history]));
  }

  subscribe(listener: (history: HistoryEntry[]) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  /**
   * Record a track play
   */
  async recordPlay(
    track: Track,
    source: HistoryEntry['source'] = 'library',
    progress: number = 1,
    duration?: number
  ): Promise<HistoryEntry> {
    await this.initialize();

    const completed = progress >= MIN_PLAY_THRESHOLD || (duration !== undefined && progress * duration >= MIN_PLAY_SECONDS);

    const entry: HistoryEntry = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      track,
      playedAt: Date.now(),
      source,
      progress: Math.max(0, Math.min(1, progress)),
      completed: Boolean(completed),
      duration: duration || track.duration,
    };

    // Add to beginning (newest first)
    this.history.unshift(entry);

    // Trim if needed
    if (this.history.length > MAX_HISTORY_ENTRIES) {
      this.history = this.history.slice(0, MAX_HISTORY_ENTRIES);
    }

    await this.persist();
    this.notifyListeners();

    return entry;
  }

  /**
   * Update progress for the most recent play of a track
   */
  async updateProgress(trackId: string, progress: number, duration: number) {
    await this.initialize();

    const index = this.history.findIndex(e => e.track.id === trackId);
    if (index !== -1) {
      const entry = this.history[index];
      entry.progress = Math.max(entry.progress, Math.max(0, Math.min(1, progress)));
      entry.completed = entry.progress >= MIN_PLAY_THRESHOLD || entry.progress * duration >= MIN_PLAY_SECONDS;
      entry.duration = duration;

      await this.persist();
      this.notifyListeners();
    }
  }

  /**
   * Get recently played tracks (unique, most recent first)
   */
  getRecentTracks(limit: number = 20): Track[] {
    const seen = new Set<string>();
    const recent: Track[] = [];

    for (const entry of this.history) {
      if (!seen.has(entry.track.id)) {
        seen.add(entry.track.id);
        recent.push(entry.track);
        if (recent.length >= limit) break;
      }
    }

    return recent;
  }

  /**
   * Get recently played entries (with full history info)
   */
  getRecentEntries(limit: number = 50): HistoryEntry[] {
    return this.history.slice(0, limit);
  }

  /**
   * Get history for a specific time range
   */
  getHistoryByDateRange(startDate: Date, endDate: Date): HistoryEntry[] {
    const start = startDate.getTime();
    const end = endDate.getTime();
    return this.history.filter(e => e.playedAt >= start && e.playedAt <= end);
  }

  /**
   * Get today's plays
   */
  getTodayPlays(): HistoryEntry[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return this.getHistoryByDateRange(today, tomorrow);
  }

  /**
   * Get this week's plays
   */
  getThisWeekPlays(): HistoryEntry[] {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    weekStart.setHours(0, 0, 0, 0);
    return this.getHistoryByDateRange(weekStart, today);
  }

  /**
   * Get play count for a track
   */
  getTrackPlayCount(trackId: string): number {
    return this.history.filter(e => e.track.id === trackId).length;
  }

  /**
   * Get play count for an artist
   */
  getArtistPlayCount(artist: string): number {
    const normalized = artist.toLowerCase();
    return this.history.filter(e => e.track.artist.toLowerCase() === normalized).length;
  }

  /**
   * Clear all history
   */
  async clearHistory() {
    this.history = [];
    await this.persist();
    this.notifyListeners();
  }

  /**
   * Remove a specific entry
   */
  async removeEntry(entryId: string) {
    this.history = this.history.filter(e => e.id !== entryId);
    await this.persist();
    this.notifyListeners();
  }

  /**
   * Export history to JSON
   */
  exportHistory(): string {
    return JSON.stringify(this.history, null, 2);
  }

  /**
   * Import history from JSON
   */
  async importHistory(json: string) {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        // Merge with existing, deduplicate by ID
        const existingIds = new Set(this.history.map(e => e.id));
        const newEntries = imported.filter(e => !existingIds.has(e.id));
        this.history = [...newEntries, ...this.history]
          .sort((a, b) => b.playedAt - a.playedAt)
          .slice(0, MAX_HISTORY_ENTRIES);
        await this.persist();
        this.notifyListeners();
      }
    } catch (error) {
      console.error('Failed to import history:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive stats
   */
  getStats(): HistoryStats {
    if (this.history.length === 0) {
      return {
        totalPlays: 0,
        uniqueTracks: 0,
        uniqueArtists: 0,
        totalListeningTime: 0,
        favoriteGenre: null,
        favoriteArtist: null,
        topTracks: [],
        topArtists: [],
        recentActivity: [],
      };
    }

    const completedPlays = this.history.filter(e => e.completed);
    const totalListeningTime = completedPlays.reduce((sum, e) => sum + e.duration, 0);

    // Track counts
    const trackCounts = new Map<string, { track: Track; count: number }>();
    const artistCounts = new Map<string, number>();
    const genreCounts = new Map<string, number>();

    for (const entry of completedPlays) {
      // Tracks
      const trackKey = entry.track.id;
      const trackEntry = trackCounts.get(trackKey) || { track: entry.track, count: 0 };
      trackEntry.count++;
      trackCounts.set(trackKey, trackEntry);

      // Artists
      const artist = entry.track.artist;
      artistCounts.set(artist, (artistCounts.get(artist) || 0) + 1);

      // Genres
      if (entry.track.genre) {
        genreCounts.set(entry.track.genre, (genreCounts.get(entry.track.genre) || 0) + 1);
      }
    }

    // Sort top tracks
    const topTracks = Array.from(trackCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Sort top artists
    const topArtists = Array.from(artistCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([artist, count]) => ({ artist, count }));

    // Favorite genre
    let favoriteGenre: string | null = null;
    let maxGenreCount = 0;
    for (const [genre, count] of genreCounts.entries()) {
      if (count > maxGenreCount) {
        maxGenreCount = count;
        favoriteGenre = genre;
      }
    }

    // Favorite artist
    const favoriteArtist = topArtists[0]?.artist || null;

    return {
      totalPlays: this.history.length,
      uniqueTracks: trackCounts.size,
      uniqueArtists: artistCounts.size,
      totalListeningTime,
      favoriteGenre,
      favoriteArtist,
      topTracks,
      topArtists,
      recentActivity: this.history.slice(0, 20),
    };
  }

  /**
   * Get tracks played on a specific date
   */
  getPlaysByDate(date: Date): HistoryEntry[] {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return this.getHistoryByDateRange(start, end);
  }

  /**
   * Search history
   */
  searchHistory(query: string): HistoryEntry[] {
    const lower = query.toLowerCase();
    return this.history.filter(e =>
      e.track.title.toLowerCase().includes(lower) ||
      e.track.artist.toLowerCase().includes(lower) ||
      e.track.album.toLowerCase().includes(lower)
    );
  }
}

export const historyService = new HistoryService();