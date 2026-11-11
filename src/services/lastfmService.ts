// Beat Vortex - Last.fm Scrobbling Service
// OAuth 1.0a authentication and scrobbling

import CryptoJS from 'crypto-js';
import { Track } from '@/store/playerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LastFmSession {
  name: string;
  key: string;
  subscriber: boolean;
}

export interface LastFmTrack {
  artist: string;
  track: string;
  album?: string;
  albumArtist?: string;
  timestamp: number;
  duration?: number;
  trackNumber?: number;
  mbid?: string;
}

const STORAGE_KEY = 'beat-vortex-lastfm';
const API_ROOT = 'https://ws.audioscrobbler.com/2.0/';
const API_KEY = process.env.EXPO_PUBLIC_LASTFM_API_KEY || 'your_api_key';
const API_SECRET = process.env.EXPO_PUBLIC_LASTFM_SECRET || 'your_secret';

interface ScrobbleQueueItem {
  track: LastFmTrack;
  retries: number;
  timestamp: number;
}

class LastFmService {
  private session: LastFmSession | null = null;
  private enabled = false;
  private scrobbleQueue: ScrobbleQueueItem[] = [];
  private isProcessingQueue = false;
  private listeners: Set<(session: LastFmSession | null) => void> = new Set();

  async initialize() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.session = data.session;
        this.enabled = data.enabled ?? false;
        this.scrobbleQueue = data.queue || [];
      }
    } catch (error) {
      console.warn('Failed to load Last.fm settings:', error);
    }

    // Process any queued scrobbles
    if (this.scrobbleQueue.length > 0) {
      this.processQueue();
    }
  }

  private async persist() {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({
        session: this.session,
        enabled: this.enabled,
        queue: this.scrobbleQueue,
      }));
    } catch (error) {
      console.warn('Failed to persist Last.fm settings:', error);
    }
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.session));
  }

  subscribe(listener: (session: LastFmSession | null) => void) {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  getSession(): LastFmSession | null {
    return this.session;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  isAuthenticated(): boolean {
    return !!this.session?.key;
  }

  /**
   * Generate OAuth 1.0a signature
   */
  private generateSignature(params: Record<string, string>, httpMethod: string = 'POST'): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
      .join('&');

    const baseString = `${httpMethod.toUpperCase()}&${encodeURIComponent(API_ROOT)}&${encodeURIComponent(sortedParams)}`;
    const signingKey = `${encodeURIComponent(API_SECRET)}&${this.session?.key ? encodeURIComponent(this.session.key) : ''}`;

    return CryptoJS.HmacSHA1(baseString, signingKey).toString(CryptoJS.enc.Base64);
  }

  /**
   * Make signed API request
   */
  private async apiCall(method: string, params: Record<string, string>, requireAuth: boolean = false): Promise<any> {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = Math.random().toString(36).substring(2, 15);

    const allParams: Record<string, string> = {
      method,
      api_key: API_KEY,
      format: 'json',
      ...params,
    };

    if (requireAuth && this.session?.key) {
      allParams.sk = this.session.key;
    }

    allParams.api_sig = this.generateSignature(allParams);

    const formData = new URLSearchParams(allParams);

    try {
      const response = await fetch(API_ROOT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.message || `Last.fm API error: ${data.error}`);
      }

      return data;
    } catch (error) {
      console.error(`Last.fm API call failed (${method}):`, error);
      throw error;
    }
  }

  /**
   * Get authentication URL for web-based OAuth
   */
  getAuthUrl(): string {
    const callback = 'beatvortex://lastfm-callback';
    return `https://www.last.fm/api/auth/?api_key=${API_KEY}&cb=${encodeURIComponent(callback)}`;
  }

  /**
   * Complete authentication with token
   */
  async authenticate(token: string): Promise<LastFmSession> {
    try {
      const data = await this.apiCall('auth.getSession', { token });

      this.session = {
        name: data.session.name,
        key: data.session.key,
        subscriber: data.session.subscriber === '1',
      };
      this.enabled = true;

      await this.persist();
      return this.session;
    } catch (error) {
      console.error('Last.fm authentication failed:', error);
      throw error;
    }
  }

  /**
   * Logout / disconnect
   */
  async disconnect() {
    this.session = null;
    this.enabled = false;
    this.scrobbleQueue = [];
    await this.persist();
  }

  /**
   * Enable/disable scrobbling
   */
  async setEnabled(enabled: boolean) {
    this.enabled = enabled;
    await this.persist();
  }

  /**
   * Scrobble a track (play count)
   */
  async scrobble(track: Track, source: 'library' | 'search' | 'radio' | 'playlist' = 'library') {
    if (!this.enabled || !this.session?.key) return;

    const scrobbleTrack: LastFmTrack = {
      artist: track.artist,
      track: track.title,
      album: track.album,
      timestamp: Math.floor(Date.now() / 1000) - Math.floor(track.duration || 0),
      duration: track.duration,
      trackNumber: track.trackNumber,
    };

    await this.queueScrobble(scrobbleTrack);
  }

  /**
   * Update "Now Playing" (without incrementing play count)
   */
  async updateNowPlaying(track: Track) {
    if (!this.enabled || !this.session?.key) return;

    const nowPlayingTrack: LastFmTrack = {
      artist: track.artist,
      track: track.title,
      album: track.album,
      timestamp: Math.floor(Date.now() / 1000),
      duration: track.duration,
      trackNumber: track.trackNumber,
    };

    try {
      await this.apiCall('track.updateNowPlaying', {
        artist: nowPlayingTrack.artist,
        track: nowPlayingTrack.track,
        album: nowPlayingTrack.album || '',
        duration: (nowPlayingTrack.duration || 0).toString(),
        trackNumber: (nowPlayingTrack.trackNumber || 0).toString(),
      }, true);
    } catch (error) {
      console.warn('Now Playing update failed:', error);
    }
  }

  /**
   * Love/unlove a track
   */
  async loveTrack(track: Track, love: boolean = true) {
    if (!this.enabled || !this.session?.key) return;

    try {
      await this.apiCall(love ? 'track.love' : 'track.unlove', {
        artist: track.artist,
        track: track.title,
      }, true);
    } catch (error) {
      console.warn(`${love ? 'Love' : 'Unlove'} failed:`, error);
    }
  }

  /**
   * Queue scrobble for later (offline support)
   */
  private async queueScrobble(track: LastFmTrack) {
    const item: ScrobbleQueueItem = {
      track,
      retries: 0,
      timestamp: Date.now(),
    };

    this.scrobbleQueue.push(item);
    await this.persist();

    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process scrobble queue
   */
  private async processQueue() {
    if (this.isProcessingQueue || this.scrobbleQueue.length === 0 || !this.enabled || !this.session?.key) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.scrobbleQueue.length > 0) {
      const item = this.scrobbleQueue[0];

      try {
        await this.apiCall('track.scrobble', {
          artist: item.track.artist,
          track: item.track.track,
          album: item.track.album || '',
          timestamp: item.track.timestamp.toString(),
          duration: (item.track.duration || 0).toString(),
          trackNumber: (item.track.trackNumber || 0).toString(),
        }, true);

        // Success - remove from queue
        this.scrobbleQueue.shift();
        await this.persist();
      } catch (error) {
        item.retries++;

        if (item.retries >= 3) {
          // Max retries reached - remove and log
          console.error('Scrobble failed after 3 retries:', item.track);
          this.scrobbleQueue.shift();
          await this.persist();
        } else {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, item.retries) * 1000));
        }
      }
    }

    this.isProcessingQueue = false;
  }

  /**
   * Get queued scrobbles count
   */
  getQueuedCount(): number {
    return this.scrobbleQueue.length;
  }

  /**
   * Clear scrobble queue
   */
  async clearQueue() {
    this.scrobbleQueue = [];
    await this.persist();
  }
}

export const lastfmService = new LastFmService();