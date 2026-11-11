// Beat Vortex - Podcast Service
// RSS feed parser and podcast management

import { Track } from '@/store/playerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DOMParser } from '@xmldom/xmldom';
import { getMusicPlaceholder } from '@/utils/placeholderImages';

type XMLDocument = ReturnType<DOMParser['parseFromString']>;
type XMLElement = ReturnType<XMLDocument['getElementsByTagName']>[0];

export interface Podcast {
  id: string;
  title: string;
  author: string;
  description: string;
  artwork: string;
  feedUrl: string;
  website?: string;
  language?: string;
  categories: string[];
  explicit: boolean;
  lastUpdated: number;
  episodeCount: number;
  subscribed: boolean;
  subscribedAt?: number;
}

export interface PodcastEpisode {
  id: string;
  podcastId: string;
  title: string;
  description: string;
  pubDate: number;
  duration: number;
  audioUrl: string;
  artwork?: string;
  episodeNumber?: number;
  seasonNumber?: number;
  episodeType: 'full' | 'trailer' | 'bonus';
  explicit: boolean;
  chapters?: PodcastChapter[];
  transcriptUrl?: string;
  played: boolean;
  playProgress: number; // 0-1
  downloaded: boolean;
  downloadPath?: string;
}

export interface PodcastChapter {
  startTime: number;
  endTime: number;
  title: string;
  artwork?: string;
}

export interface PodcastSearchResult {
  id: string;
  title: string;
  author: string;
  artwork: string;
  feedUrl: string;
  description: string;
  category: string;
  episodeCount: number;
}

const STORAGE_KEY = 'beat-vortex-podcasts';
const EPISODES_KEY = 'beat-vortex-podcast-episodes';
const SUBSCRIPTIONS_KEY = 'beat-vortex-podcast-subscriptions';
const MAX_EPISODES_PER_PODCAST = 500;
const REFRESH_INTERVAL = 1000 * 60 * 60 * 6; // 6 hours

class PodcastService {
  private podcasts: Map<string, Podcast> = new Map();
  private episodes: Map<string, PodcastEpisode[]> = new Map();
  private subscriptions: Set<string> = new Set();
  private initialized = false;
  private refreshTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private listeners: Set<(podcasts: Podcast[]) => void> = new Set();

  async initialize() {
    if (this.initialized) return;

    try {
      // Load podcasts
      const storedPodcasts = await AsyncStorage.getItem(STORAGE_KEY);
      if (storedPodcasts) {
        const parsed = JSON.parse(storedPodcasts);
        Object.entries(parsed).forEach(([id, podcast]) => {
          this.podcasts.set(id, podcast as Podcast);
        });
      }

      // Load episodes
      const storedEpisodes = await AsyncStorage.getItem(EPISODES_KEY);
      if (storedEpisodes) {
        const parsed = JSON.parse(storedEpisodes);
        Object.entries(parsed).forEach(([id, eps]) => {
          this.episodes.set(id, eps as PodcastEpisode[]);
        });
      }

      // Load subscriptions
      const storedSubs = await AsyncStorage.getItem(SUBSCRIPTIONS_KEY);
      if (storedSubs) {
        this.subscriptions = new Set(JSON.parse(storedSubs));
      }

      // Start refresh timers for subscribed podcasts
      for (const podcastId of this.subscriptions) {
        this.scheduleRefresh(podcastId);
      }

      this.initialized = true;
    } catch (error) {
      console.warn('Failed to initialize podcast service:', error);
      this.initialized = true;
    }
  }

  private async persistPodcasts() {
    try {
      const obj = Object.fromEntries(this.podcasts);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      console.warn('Failed to persist podcasts:', error);
    }
  }

  private async persistEpisodes() {
    try {
      const obj = Object.fromEntries(this.episodes);
      await AsyncStorage.setItem(EPISODES_KEY, JSON.stringify(obj));
    } catch (error) {
      console.warn('Failed to persist episodes:', error);
    }
  }

  private async persistSubscriptions() {
    try {
      await AsyncStorage.setItem(SUBSCRIPTIONS_KEY, JSON.stringify(Array.from(this.subscriptions)));
    } catch (error) {
      console.warn('Failed to persist subscriptions:', error);
    }
  }

  private notifyListeners() {
    const podcasts = Array.from(this.podcasts.values());
    this.listeners.forEach(listener => listener(podcasts));
  }

  onPodcastsChange(listener: (podcasts: Podcast[]) => void) {
    this.listeners.add(listener);
    listener(Array.from(this.podcasts.values()));
    return () => { this.listeners.delete(listener); };
  }

  /**
   * Search podcasts via iTunes Search API
   */
  async searchPodcasts(query: string, limit: number = 20): Promise<PodcastSearchResult[]> {
    try {
      const encodedQuery = encodeURIComponent(query);
      const response = await fetch(
        `https://itunes.apple.com/search?term=${encodedQuery}&media=podcast&entity=podcast&limit=${limit}`
      );
      const data = await response.json();

      return (data.results || []).map((result: any) => ({
        id: result.feedUrl || result.trackId?.toString(),
        title: result.trackName || result.collectionName,
        author: result.artistName,
        artwork: result.artworkUrl600 || result.artworkUrl100,
        feedUrl: result.feedUrl,
        description: result.description?.substring(0, 300) || '',
        category: result.primaryGenreName,
        episodeCount: result.trackCount || 0,
      }));
    } catch (error) {
      console.error('Podcast search failed:', error);
      return [];
    }
  }

  /**
   * Parse RSS feed and extract podcast info
   */
  async fetchPodcastFromFeed(feedUrl: string): Promise<Podcast | null> {
    try {
      const response = await fetch(feedUrl);
      const xmlText = await response.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlText, 'text/xml');

      // Check for parsing errors
      const parserError = doc.getElementsByTagName('parsererror');
      if (parserError.length > 0) {
        throw new Error('Invalid RSS feed');
      }

      // Try iTunes namespace first, then standard RSS
      const channel = doc.getElementsByTagName('channel')[0];
      if (!channel) return null;

      const getText = (tagName: string, ns?: string) => {
        const elements = ns
          ? channel.getElementsByTagNameNS(ns, tagName)
          : channel.getElementsByTagName(tagName);
        return elements[0]?.textContent?.trim() || '';
      };

      const getAttribute = (tagName: string, attr: string, ns?: string) => {
        const elements = ns
          ? channel.getElementsByTagNameNS(ns, tagName)
          : channel.getElementsByTagName(tagName);
        return elements[0]?.getAttribute(attr) || '';
      };

      // iTunes namespace
      const ITUNES_NS = 'http://www.itunes.com/dtds/podcast-1.0.dtd';

      const title = getText('title') || getText('title', ITUNES_NS);
      const author = getText('itunes:author', ITUNES_NS) || getText('managingEditor') || getText('author');
      const description = getText('description') || getText('itunes:summary', ITUNES_NS);
      const artwork = getAttribute('itunes:image', 'href', ITUNES_NS) || getAttribute('image', 'url');
      const website = getText('link');
      const language = getText('language');
      const explicit = getText('itunes:explicit', ITUNES_NS) === 'true';

      // Categories
      const categories: string[] = [];
      const itunesCategories = channel.getElementsByTagNameNS(ITUNES_NS, 'category');
      for (let i = 0; i < itunesCategories.length; i++) {
        const cat = itunesCategories[i].getAttribute('text');
        if (cat) categories.push(cat);
      }
      if (categories.length === 0) {
        const standardCategories = channel.getElementsByTagName('category');
        for (let i = 0; i < standardCategories.length; i++) {
          const cat = standardCategories[i].textContent?.trim();
          if (cat) categories.push(cat);
        }
      }

      const id = feedUrl;
      const existingPodcast = this.podcasts.get(id);

      const podcast: Podcast = {
        id,
        title: title || 'Unknown Podcast',
        author: author || 'Unknown Author',
        description: description || '',
        artwork: artwork || getMusicPlaceholder('podcast'),
        feedUrl,
        website,
        language,
        categories,
        explicit,
        lastUpdated: Date.now(),
        episodeCount: 0,
        subscribed: existingPodcast?.subscribed || false,
        subscribedAt: existingPodcast?.subscribedAt,
      };

      // Parse episodes
      await this.parseEpisodes(podcast, doc);

      return podcast;
    } catch (error) {
      console.error('Failed to fetch podcast from feed:', error);
      return null;
    }
  }

  /**
   * Parse episodes from RSS document
   */
  private async parseEpisodes(podcast: Podcast, doc: XMLDocument) {
    const channel = doc.getElementsByTagName('channel')[0];
    if (!channel) return;

    const items = channel.getElementsByTagName('item');
    const episodes: PodcastEpisode[] = [];

    for (let i = 0; i < items.length && i < MAX_EPISODES_PER_PODCAST; i++) {
      const item = items[i];
      const episode = this.parseEpisode(item, podcast.id);
      if (episode) episodes.push(episode);
    }

    // Sort by pubDate descending (newest first)
    episodes.sort((a, b) => b.pubDate - a.pubDate);

    // Update podcast episode count
    podcast.episodeCount = episodes.length;
    podcast.lastUpdated = Date.now();

    this.episodes.set(podcast.id, episodes);
    await this.persistEpisodes();
  }

  /**
   * Parse individual episode from RSS item
   */
  private parseEpisode(item: XMLElement, podcastId: string): PodcastEpisode | null {
    const getText = (tagName: string, ns?: string) => {
      const elements = ns
        ? item.getElementsByTagNameNS(ns, tagName)
        : item.getElementsByTagName(tagName);
      return elements[0]?.textContent?.trim() || '';
    };

    const getAttribute = (tagName: string, attr: string, ns?: string) => {
      const elements = ns
        ? item.getElementsByTagNameNS(ns, tagName)
        : item.getElementsByTagName(tagName);
      return elements[0]?.getAttribute(attr) || '';
    };

    const ITUNES_NS = 'http://www.itunes.com/dtds/podcast-1.0.dtd';

    const title = getText('title') || getText('title', ITUNES_NS);
    if (!title) return null;

    const description = getText('description') || getText('itunes:summary', ITUNES_NS) || '';
    const pubDateStr = getText('pubDate') || getText('pubDate', ITUNES_NS);
    const pubDate = pubDateStr ? new Date(pubDateStr).getTime() : Date.now();

    // Audio enclosure
    const enclosures = item.getElementsByTagName('enclosure');
    let audioUrl = '';
    let duration = 0;
    for (let i = 0; i < enclosures.length; i++) {
      const type = enclosures[i].getAttribute('type') || '';
      if (type.startsWith('audio/')) {
        audioUrl = enclosures[i].getAttribute('url') || '';
        const len = enclosures[i].getAttribute('length');
        if (len) duration = Math.round(parseInt(len) / 128000); // Rough estimate for mp3
        break;
      }
    }

    if (!audioUrl) return null;

    // iTunes duration
    const itunesDuration = getText('itunes:duration', ITUNES_NS);
    if (itunesDuration) {
      const parts = itunesDuration.split(':').map(Number);
      if (parts.length === 3) duration = parts[0] * 3600 + parts[1] * 60 + parts[2];
      else if (parts.length === 2) duration = parts[0] * 60 + parts[1];
      else duration = parts[0];
    }

    const episodeId = getText('guid') || `${podcastId}_${audioUrl}`;

    // Check if we already have this episode to preserve progress
    const existingEpisodes = this.episodes.get(podcastId) || [];
    const existing = existingEpisodes.find(e => e.id === episodeId);

    const episode: PodcastEpisode = {
      id: episodeId,
      podcastId,
      title,
      description,
      pubDate,
      duration,
      audioUrl,
      artwork: getAttribute('itunes:image', 'href', ITUNES_NS),
      episodeNumber: parseInt(getText('itunes:episode', ITUNES_NS), 10) || undefined,
      seasonNumber: parseInt(getText('itunes:season', ITUNES_NS), 10) || undefined,
      episodeType: (getText('itunes:episodeType', ITUNES_NS) as any) || 'full',
      explicit: getText('itunes:explicit', ITUNES_NS) === 'true',
      chapters: this.parseChapters(item),
      transcriptUrl: getAttribute('podcast:transcript', 'url', 'https://podcastindex.org/namespace/1.0'),
      played: existing?.played || false,
      playProgress: existing?.playProgress || 0,
      downloaded: existing?.downloaded || false,
      downloadPath: existing?.downloadPath,
    };

    return episode;
  }

  /**
   * Parse chapters from episode item
   */
  private parseChapters(item: XMLElement): PodcastChapter[] {
    const chapters: PodcastChapter[] = [];
    // Support for Podcast Namespace chapters
    const PS_NS = 'https://podcastindex.org/namespace/1.0';
    const chapterElements = item.getElementsByTagNameNS(PS_NS, 'chapters');

    if (chapterElements.length > 0) {
      const chaptersJson = chapterElements[0].textContent;
      if (chaptersJson) {
        try {
          const parsed = JSON.parse(chaptersJson);
          for (const ch of parsed) {
            chapters.push({
              startTime: ch.startTime || 0,
              endTime: ch.endTime || 0,
              title: ch.title || '',
              artwork: ch.image,
            });
          }
        } catch (e) {
          // Invalid JSON
        }
      }
    }

    // Support for iTunes chapters (less common)
    return chapters;
  }

  /**
   * Subscribe to a podcast
   */
  async subscribe(podcastId: string): Promise<boolean> {
    const podcast = this.podcasts.get(podcastId);
    if (!podcast) return false;

    podcast.subscribed = true;
    podcast.subscribedAt = Date.now();
    this.subscriptions.add(podcastId);
    this.podcasts.set(podcastId, podcast);

    await this.persistPodcasts();
    await this.persistSubscriptions();
    this.scheduleRefresh(podcastId);
    this.notifyListeners();

    return true;
  }

  /**
   * Unsubscribe from a podcast
   */
  async unsubscribe(podcastId: string): Promise<boolean> {
    const podcast = this.podcasts.get(podcastId);
    if (!podcast) return false;

    podcast.subscribed = false;
    podcast.subscribedAt = undefined;
    this.subscriptions.delete(podcastId);
    this.podcasts.set(podcastId, podcast);

    this.cancelRefresh(podcastId);
    await this.persistPodcasts();
    await this.persistSubscriptions();
    this.notifyListeners();

    return true;
  }

  /**
   * Get all podcasts
   */
  getPodcasts(): Podcast[] {
    return Array.from(this.podcasts.values());
  }

  /**
   * Get subscribed podcasts
   */
  getSubscribedPodcasts(): Podcast[] {
    return Array.from(this.podcasts.values()).filter(p => p.subscribed);
  }

  /**
   * Get podcast by ID
   */
  getPodcast(id: string): Podcast | undefined {
    return this.podcasts.get(id);
  }

  /**
   * Get episodes for a podcast
   */
  getEpisodes(podcastId: string): PodcastEpisode[] {
    return this.episodes.get(podcastId) || [];
  }

  /**
   * Get episode by ID
   */
  getEpisode(podcastId: string, episodeId: string): PodcastEpisode | undefined {
    const eps = this.episodes.get(podcastId) || [];
    return eps.find(e => e.id === episodeId);
  }

  /**
   * Update episode play progress
   */
  async updatePlayProgress(podcastId: string, episodeId: string, progress: number, played: boolean = false) {
    const eps = this.episodes.get(podcastId) || [];
    const index = eps.findIndex(e => e.id === episodeId);
    if (index !== -1) {
      eps[index].playProgress = Math.max(0, Math.min(1, progress));
      eps[index].played = played || progress > 0.9;
      await this.persistEpisodes();
    }
  }

  /**
   * Mark episode as downloaded
   */
  async markDownloaded(podcastId: string, episodeId: string, path: string) {
    const eps = this.episodes.get(podcastId) || [];
    const index = eps.findIndex(e => e.id === episodeId);
    if (index !== -1) {
      eps[index].downloaded = true;
      eps[index].downloadPath = path;
      await this.persistEpisodes();
    }
  }

  /**
   * Remove download
   */
  async removeDownload(podcastId: string, episodeId: string) {
    const eps = this.episodes.get(podcastId) || [];
    const index = eps.findIndex(e => e.id === episodeId);
    if (index !== -1) {
      eps[index].downloaded = false;
      eps[index].downloadPath = undefined;
      await this.persistEpisodes();
    }
  }

  /**
   * Refresh a specific podcast
   */
  async refreshPodcast(podcastId: string): Promise<boolean> {
    const podcast = this.podcasts.get(podcastId);
    if (!podcast) return false;

    const updated = await this.fetchPodcastFromFeed(podcast.feedUrl);
    if (updated) {
      // Preserve subscription status and progress
      updated.subscribed = podcast.subscribed;
      updated.subscribedAt = podcast.subscribedAt;
      this.podcasts.set(podcastId, updated);
      await this.persistPodcasts();
      this.notifyListeners();
      return true;
    }
    return false;
  }

  /**
   * Refresh all subscribed podcasts
   */
  async refreshAllSubscribed() {
    for (const podcastId of this.subscriptions) {
      await this.refreshPodcast(podcastId);
    }
  }

  /**
   * Schedule automatic refresh
   */
  private scheduleRefresh(podcastId: string) {
    this.cancelRefresh(podcastId);
    const timer = setTimeout(() => {
      this.refreshPodcast(podcastId);
      this.scheduleRefresh(podcastId); // Reschedule
    }, REFRESH_INTERVAL);
    this.refreshTimers.set(podcastId, timer);
  }

  /**
   * Cancel scheduled refresh
   */
  private cancelRefresh(podcastId: string) {
    const timer = this.refreshTimers.get(podcastId);
    if (timer) {
      clearTimeout(timer);
      this.refreshTimers.delete(podcastId);
    }
  }

  /**
   * Add podcast manually by feed URL
   */
  async addPodcastByUrl(feedUrl: string): Promise<Podcast | null> {
    const podcast = await this.fetchPodcastFromFeed(feedUrl);
    if (podcast) {
      this.podcasts.set(podcast.id, podcast);
      await this.persistPodcasts();
      this.notifyListeners();
    }
    return podcast;
  }

  /**
   * Remove podcast completely
   */
  async removePodcast(podcastId: string) {
    this.podcasts.delete(podcastId);
    this.episodes.delete(podcastId);
    this.subscriptions.delete(podcastId);
    this.cancelRefresh(podcastId);
    await this.persistPodcasts();
    await this.persistEpisodes();
    await this.persistSubscriptions();
    this.notifyListeners();
  }

  /**
   * Get downloaded episodes
   */
  getDownloadedEpisodes(): PodcastEpisode[] {
    const all: PodcastEpisode[] = [];
    for (const eps of this.episodes.values()) {
      all.push(...eps.filter(e => e.downloaded));
    }
    return all;
  }

  /**
   * Get in-progress episodes (played but not finished)
   */
  getInProgressEpisodes(): PodcastEpisode[] {
    const all: PodcastEpisode[] = [];
    for (const eps of this.episodes.values()) {
      all.push(...eps.filter(e => e.playProgress > 0 && e.playProgress < 0.95));
    }
    return all.sort((a, b) => b.pubDate - a.pubDate);
  }

  /**
   * Get latest episodes from subscribed podcasts
   */
  getLatestEpisodes(limit: number = 20): PodcastEpisode[] {
    const all: PodcastEpisode[] = [];
    for (const podcastId of this.subscriptions) {
      const eps = this.episodes.get(podcastId) || [];
      all.push(...eps.slice(0, 5)); // Latest 5 from each
    }
    return all
      .sort((a, b) => b.pubDate - a.pubDate)
      .slice(0, limit);
  }

  /**
   * Search episodes
   */
  searchEpisodes(query: string): PodcastEpisode[] {
    const lower = query.toLowerCase();
    const all: PodcastEpisode[] = [];
    for (const eps of this.episodes.values()) {
      all.push(...eps.filter(e =>
        e.title.toLowerCase().includes(lower) ||
        e.description.toLowerCase().includes(lower)
      ));
    }
    return all.sort((a, b) => b.pubDate - a.pubDate);
  }
}

export const podcastService = new PodcastService();