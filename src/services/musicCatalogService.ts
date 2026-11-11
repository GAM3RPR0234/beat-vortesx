import { Track } from '@/store/playerStore';
import { getMusicPlaceholder } from '@/utils/placeholderImages';

export interface SearchResult {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration: number; // seconds
  url: string;
  quality: string;
  genre?: string;
  bpm?: number;
  year?: string;
}

class MusicCatalogService {
  private readonly AUDIO_DB_API = 'https://api.audiodb.com/api/v1/json/2';
  private readonly LRCLIB_API = 'https://lrclib.net/api';
  private readonly JAMENDO_API = 'https://api.jamendo.com/v3.0';
  private readonly JAMENDO_CLIENT_ID = 'your_client_id'; // Would be configured in env

  private cache = new Map<string, { data: SearchResult[]; timestamp: number }>();
  private readonly CACHE_DURATION = 1000 * 60 * 10; // 10 minutes

  /**
   * Search for tracks across multiple sources
   */
  async searchTracks(query: string, limit: number = 20): Promise<SearchResult[]> {
    const cacheKey = `search:${query.toLowerCase()}:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Try multiple sources in parallel for best results
      const [audioDbResults, jamendoResults] = await Promise.allSettled([
        this.searchAudioDB(query, limit),
        this.searchJamendo(query, limit),
      ]);

      let results: SearchResult[] = [];

      if (audioDbResults.status === 'fulfilled') {
        results = [...results, ...audioDbResults.value];
      }

      if (jamendoResults.status === 'fulfilled') {
        results = [...results, ...jamendoResults.value];
      }

      // Deduplicate by title+artist
      const seen = new Set<string>();
      const uniqueResults = results.filter(r => {
        const key = `${r.title.toLowerCase()}-${r.artist.toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Sort by relevance (simple heuristic)
      const sorted = uniqueResults
        .sort((a, b) => {
          const aMatch = this.calculateRelevance(query, a);
          const bMatch = this.calculateRelevance(query, b);
          return bMatch - aMatch;
        })
        .slice(0, limit);

      this.saveToCache(cacheKey, sorted);
      return sorted;
    } catch (error) {
      console.warn('Music catalog search failed:', error);
      // Fallback to mock data for offline/demo
      return this.getMockResults(query, limit);
    }
  }

  /**
   * Search TheAudioDB (free, no auth required)
   */
  private async searchAudioDB(query: string, limit: number): Promise<SearchResult[]> {
    try {
      const response = await fetch(`${this.AUDIO_DB_API}/searchtrack.php?s=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (!data.track || !Array.isArray(data.track)) return [];

      return data.track.slice(0, limit).map((track: any) => ({
        id: `audiodb-${track.idTrack}`,
        title: track.strTrack || 'Unknown',
        artist: track.strArtist || 'Unknown',
        album: track.strAlbum || 'Unknown',
        artwork: track.strTrackThumb || getMusicPlaceholder('track'),
        duration: parseInt(track.strDuration || '0') || 0,
        url: track.strMusicVid ? track.strMusicVid.replace('watch?v=', 'embed/') : '',
        quality: '320kbps',
        genre: track.strGenre,
        year: track.intYearReleased?.toString(),
      }));
    } catch (error) {
      console.warn('AudioDB search failed:', error);
      return [];
    }
  }

  /**
   * Search Jamendo (free music archive)
   */
  private async searchJamendo(query: string, limit: number): Promise<SearchResult[]> {
    try {
      const response = await fetch(
        `${this.JAMENDO_API}/tracks/?client_id=${this.JAMENDO_CLIENT_ID}&format=json&search=${encodeURIComponent(query)}&limit=${limit}&include=musicinfo`
      );
      const data = await response.json();

      if (!data.results || !Array.isArray(data.results)) return [];

      return data.results.map((track: any) => ({
        id: `jamendo-${track.id}`,
        title: track.name || 'Unknown',
        artist: track.artist_name || 'Unknown',
        album: track.album_name || 'Unknown',
        artwork: track.image || getMusicPlaceholder('track'),
        duration: track.duration || 0,
        url: track.audiodownload || track.audio || '',
        quality: '320kbps',
        genre: track.tags?.genres?.[0],
        bpm: track.musicinfo?.bpm,
        year: track.releasedate?.split('-')[0],
      }));
    } catch (error) {
      console.warn('Jamendo search failed:', error);
      return [];
    }
  }

  /**
   * Get track by ID from any source
   */
  async getTrackById(id: string): Promise<SearchResult | null> {
    if (id.startsWith('audiodb-')) {
      const trackId = id.replace('audiodb-', '');
      try {
        const response = await fetch(`${this.AUDIO_DB_API}/track.php?h=${trackId}`);
        const data = await response.json();
        if (data.track?.[0]) {
          const t = data.track[0];
          return {
            id,
            title: t.strTrack || 'Unknown',
            artist: t.strArtist || 'Unknown',
            album: t.strAlbum || 'Unknown',
            artwork: t.strTrackThumb || getMusicPlaceholder('track'),
            duration: parseInt(t.strDuration || '0') || 0,
            url: t.strMusicVid ? t.strMusicVid.replace('watch?v=', 'embed/') : '',
            quality: '320kbps',
            genre: t.strGenre,
            year: t.intYearReleased?.toString(),
          };
        }
      } catch (error) {
        console.warn('AudioDB getTrack failed:', error);
      }
    } else if (id.startsWith('jamendo-')) {
      const trackId = id.replace('jamendo-', '');
      try {
        const response = await fetch(
          `${this.JAMENDO_API}/tracks/?client_id=${this.JAMENDO_CLIENT_ID}&format=json&id=${trackId}&include=musicinfo`
        );
        const data = await response.json();
        if (data.results?.[0]) {
          const t = data.results[0];
          return {
            id,
            title: t.name || 'Unknown',
            artist: t.artist_name || 'Unknown',
            album: t.album_name || 'Unknown',
            artwork: t.image || getMusicPlaceholder('track'),
            duration: t.duration || 0,
            url: t.audiodownload || t.audio || '',
            quality: '320kbps',
            genre: t.tags?.genres?.[0],
            bpm: t.musicinfo?.bpm,
            year: t.releasedate?.split('-')[0],
          };
        }
      } catch (error) {
        console.warn('Jamendo getTrack failed:', error);
      }
    }
    return null;
  }

  /**
   * Get artist info
   */
  async getArtist(artistName: string): Promise<any> {
    try {
      const response = await fetch(`${this.AUDIO_DB_API}/search.php?s=${encodeURIComponent(artistName)}`);
      const data = await response.json();
      return data.artists?.[0] || null;
    } catch (error) {
      console.warn('Get artist failed:', error);
      return null;
    }
  }

  /**
   * Get album info
   */
  async getAlbum(albumName: string, artistName: string): Promise<any> {
    try {
      const response = await fetch(`${this.AUDIO_DB_API}/searchalbum.php?s=${encodeURIComponent(artistName)}&a=${encodeURIComponent(albumName)}`);
      const data = await response.json();
      return data.album?.[0] || null;
    } catch (error) {
      console.warn('Get album failed:', error);
      return null;
    }
  }

  /**
   * Get trending/popular tracks
   */
  async getTrending(limit: number = 20): Promise<SearchResult[]> {
    const cacheKey = `trending:${limit}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Use genre searches for trending electronic/synthwave
      const [synthwave, cyberpunk, retrowave] = await Promise.allSettled([
        this.searchAudioDB('synthwave', Math.ceil(limit / 3)),
        this.searchAudioDB('cyberpunk', Math.ceil(limit / 3)),
        this.searchAudioDB('retrowave', Math.ceil(limit / 3)),
      ]);

      const results: SearchResult[] = [];
      if (synthwave.status === 'fulfilled') results.push(...synthwave.value);
      if (cyberpunk.status === 'fulfilled') results.push(...cyberpunk.value);
      if (retrowave.status === 'fulfilled') results.push(...retrowave.value);

      // Shuffle and limit
      const shuffled = results.sort(() => Math.random() - 0.5).slice(0, limit);
      this.saveToCache(cacheKey, shuffled);
      return shuffled;
    } catch (error) {
      console.warn('Get trending failed:', error);
      return this.getMockResults('trending', limit);
    }
  }

  /**
   * Get recommendations based on a seed track
   */
  async getRecommendations(seedTrack: Track, limit: number = 10): Promise<SearchResult[]> {
    // Search by genre and artist
    const queries = [
      seedTrack.genre || 'synthwave',
      seedTrack.artist,
    ].filter(Boolean);

    const results: SearchResult[] = [];
    for (const query of queries) {
      const searchResults = await this.searchTracks(query, Math.ceil(limit / queries.length));
      results.push(...searchResults);
    }

    // Filter out the seed track itself
    const filtered = results
      .filter(r => r.title.toLowerCase() !== seedTrack.title.toLowerCase() ||
                   r.artist.toLowerCase() !== seedTrack.artist.toLowerCase())
      .slice(0, limit);

    return filtered;
  }

  /**
   * Simple relevance scoring for sorting
   */
  private calculateRelevance(query: string, result: SearchResult): number {
    const q = query.toLowerCase();
    let score = 0;

    if (result.title.toLowerCase().includes(q)) score += 10;
    if (result.artist.toLowerCase().includes(q)) score += 8;
    if (result.album.toLowerCase().includes(q)) score += 5;
    if (result.title.toLowerCase().startsWith(q)) score += 5;
    if (result.artist.toLowerCase().startsWith(q)) score += 3;

    return score;
  }

  /**
   * Cache management
   */
  private getFromCache(key: string): SearchResult[] | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_DURATION) {
      return entry.data;
    }
    this.cache.delete(key);
    return null;
  }

  private saveToCache(key: string, data: SearchResult[]): void {
    this.cache.set(key, { data, timestamp: Date.now() });

    // Prevent cache from growing too large
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }
  }

  /**
   * Mock results for offline/demo mode
   */
  private getMockResults(query: string, limit: number): SearchResult[] {
    const mockTracks: SearchResult[] = [
      { id: 'm1', title: 'Midnight Drive', artist: 'Synthwave Dreams', album: 'Neon Nights', artwork: getMusicPlaceholder('track'), duration: 222, url: '', quality: '320kbps', genre: 'synthwave' },
      { id: 'm2', title: 'Neon Nights', artist: 'Cyber Pulse', album: 'Digital Rain', artwork: getMusicPlaceholder('track'), duration: 255, url: '', quality: '320kbps', genre: 'cyberpunk' },
      { id: 'm3', title: 'Digital Rain', artist: 'Void Walker', album: 'Void Walker EP', artwork: getMusicPlaceholder('track'), duration: 208, url: '', quality: '320kbps', genre: 'dark synth' },
      { id: 'm4', title: 'Electric Heart', artist: 'Neon Genesis', album: 'Synthwave Chronicles', artwork: getMusicPlaceholder('track'), duration: 243, url: '', quality: '320kbps', genre: 'retrowave' },
      { id: 'm5', title: 'Synthetic Dreams', artist: 'Timecop1983', album: 'Journeys', artwork: getMusicPlaceholder('track'), duration: 289, url: '', quality: '320kbps', genre: 'synthwave' },
      { id: 'm6', title: 'Retro Future', artist: 'The Midnight', album: 'Heroes', artwork: getMusicPlaceholder('track'), duration: 312, url: '', quality: '320kbps', genre: 'retrowave' },
      { id: 'm7', title: 'Neon Horizon', artist: 'Gunship', album: 'Unicorn', artwork: getMusicPlaceholder('track'), duration: 267, url: '', quality: '320kbps', genre: 'synthwave' },
      { id: 'm8', title: 'Night Drive', artist: 'FM-84', album: 'Atlas', artwork: getMusicPlaceholder('track'), duration: 245, url: '', quality: '320kbps', genre: 'retrowave' },
    ];

    const filtered = mockTracks.filter(t =>
      t.title.toLowerCase().includes(query.toLowerCase()) ||
      t.artist.toLowerCase().includes(query.toLowerCase()) ||
      t.genre?.toLowerCase().includes(query.toLowerCase())
    );

    return filtered.length > 0 ? filtered.slice(0, limit) : mockTracks.slice(0, limit);
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const musicCatalogService = new MusicCatalogService();