// Beat Vortex - Playlist Import Service
// M3U playlist parser and importer

import { Track } from '@/store/playerStore';
import { musicCatalogService, SearchResult } from './musicCatalogService';
import { getMusicPlaceholder } from '@/utils/placeholderImages';

export interface M3UEntry {
  title: string;
  artist: string;
  album?: string;
  duration?: number;
  url: string;
  artwork?: string;
  trackNumber?: number;
  genre?: string;
  year?: number;
}

export interface M3UParseResult {
  entries: M3UEntry[];
  errors: string[];
  warnings: string[];
}

export interface ImportReport {
  totalEntries: number;
  matched: number;
  unmatched: number;
  duplicates: number;
  playlistName: string;
  tracks: Track[];
  errors: string[];
}

/**
 * Parse M3U/M3U8 playlist content
 */
export function parseM3U(content: string): M3UParseResult {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const entries: M3UEntry[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let currentEntry: Partial<M3UEntry> = {};
  let lineNumber = 0;

  for (const line of lines) {
    lineNumber++;

    if (line.startsWith('#EXTM3U')) {
      // Header - ignore
      continue;
    }

    if (line.startsWith('#EXTINF:')) {
      // Extended info line
      // Format: #EXTINF:<duration>,<title> - <artist>
      // Or: #EXTINF:<duration>,<artist> - <title>
      const extinfMatch = line.match(/^#EXTINF:(-?\d+),(.+)$/);
      if (extinfMatch) {
        const duration = parseInt(extinfMatch[1], 10);
        const metadata = extinfMatch[2].trim();

        // Try to parse "Artist - Title" or "Title - Artist"
        let title = metadata;
        let artist = 'Unknown Artist';

        // Common patterns
        const dashParts = metadata.split(' - ');
        if (dashParts.length >= 2) {
          // Heuristic: if first part looks like artist (no parentheses, shorter), use it
          const first = dashParts[0].trim();
          const rest = dashParts.slice(1).join(' - ').trim();

          // If first part contains typical artist indicators or is shorter
          if (first.length < rest.length || /^(feat\.|ft\.|featuring)/i.test(rest)) {
            artist = first;
            title = rest;
          } else {
            title = first;
            artist = rest;
          }
        }

        currentEntry = {
          duration: duration > 0 ? duration : undefined,
          title,
          artist,
        };
      }
      continue;
    }

    if (line.startsWith('#EXTGRP:')) {
      // Group/genre
      currentEntry.genre = line.substring(8).trim();
      continue;
    }

    if (line.startsWith('#EXTALB:')) {
      // Album
      currentEntry.album = line.substring(8).trim();
      continue;
    }

    if (line.startsWith('#EXTART:')) {
      // Artist override
      currentEntry.artist = line.substring(8).trim();
      continue;
    }

    if (line.startsWith('#EXTIMG:')) {
      // Artwork URL
      currentEntry.artwork = line.substring(8).trim();
      continue;
    }

    if (line.startsWith('#')) {
      // Other extended tags - ignore for now
      continue;
    }

    // This is a URL/path line
    if (line && !line.startsWith('#')) {
      const url = line.trim();
      if (url) {
        const entry: M3UEntry = {
          title: currentEntry.title || extractTitleFromUrl(url),
          artist: currentEntry.artist || 'Unknown Artist',
          album: currentEntry.album,
          duration: currentEntry.duration,
          url,
          artwork: currentEntry.artwork,
          genre: currentEntry.genre,
        };
        entries.push(entry);
      }
      currentEntry = {};
    }
  }

  return { entries, errors, warnings };
}

/**
 * Extract title from URL/path
 */
function extractTitleFromUrl(url: string): string {
  const filename = url.split('/').pop() || url;
  const name = filename.replace(/\.[^.]+$/, ''); // Remove extension
  // Clean up common patterns
  return name
    .replace(/^\d+\s*[-_]\s*/, '') // Remove track numbers
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match M3U entry to local catalog
 */
export async function matchEntryToCatalog(entry: M3UEntry): Promise<Track | null> {
  try {
    // Search catalog for matching track
    const results = await musicCatalogService.searchTracks(`${entry.artist} ${entry.title}`, 5);

    if (results.length > 0) {
      // Find best match
      for (const track of results) {
        const titleMatch = similarity(entry.title.toLowerCase(), track.title.toLowerCase());
        const artistMatch = similarity(entry.artist.toLowerCase(), track.artist.toLowerCase());

        if (titleMatch > 0.7 && artistMatch > 0.7) {
          return searchResultToTrack(track);
        }
      }

      // Return first result if reasonably close
      const first = results[0];
      const titleMatch = similarity(entry.title.toLowerCase(), first.title.toLowerCase());
      const artistMatch = similarity(entry.artist.toLowerCase(), first.artist.toLowerCase());

      if (titleMatch > 0.5 && artistMatch > 0.5) {
        return searchResultToTrack(first);
      }
    }
  } catch (error) {
    console.warn('Catalog match failed:', error);
  }
  return null;
}

/**
 * Convert SearchResult to Track
 */
function searchResultToTrack(result: SearchResult): Track {
  return {
    id: result.id,
    title: result.title,
    artist: result.artist,
    album: result.album,
    artwork: result.artwork,
    duration: result.duration,
    url: result.url,
    quality: result.quality,
    genre: result.genre,
    bpm: result.bpm,
    year: result.year ? parseInt(result.year, 10) : undefined,
  };
}

/**
 * Simple string similarity (Levenshtein-based)
 */
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;

  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  const distance = matrix[b.length][a.length];
  return 1 - distance / Math.max(a.length, b.length);
}

/**
 * Create Track object from M3U entry (fallback when no catalog match)
 */
function createTrackFromEntry(entry: M3UEntry, index: number): Track {
  return {
    id: `imported_${Date.now()}_${index}`,
    title: entry.title,
    artist: entry.artist,
    album: entry.album || 'Unknown Album',
    artwork: entry.artwork || getMusicPlaceholder('track'),
    duration: entry.duration || 0,
    url: entry.url,
    genre: entry.genre,
    year: entry.year,
    trackNumber: entry.trackNumber,
  };
}

/**
 * Import M3U playlist
 */
export async function importM3UPlaylist(
  content: string,
  playlistName: string
): Promise<ImportReport> {
  const { entries, errors: parseErrors } = parseM3U(content);

  const tracks: Track[] = [];
  const matchedTitles = new Set<string>();
  let matched = 0;
  let unmatched = 0;
  let duplicates = 0;
  const errors: string[] = [...parseErrors];

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const key = `${entry.artist.toLowerCase()}|${entry.title.toLowerCase()}`;

    if (matchedTitles.has(key)) {
      duplicates++;
      continue;
    }
    matchedTitles.add(key);

    const catalogTrack = await matchEntryToCatalog(entry);

    if (catalogTrack) {
      tracks.push(catalogTrack);
      matched++;
    } else {
      tracks.push(createTrackFromEntry(entry, i));
      unmatched++;
    }
  }

  return {
    totalEntries: entries.length,
    matched,
    unmatched,
    duplicates,
    playlistName,
    tracks,
    errors,
  };
}

/**
 * Export playlist to M3U format
 */
export function exportToM3U(tracks: Track[], playlistName: string): string {
  let m3u = '#EXTM3U\n';
  m3u += `#PLAYLIST:${playlistName}\n\n`;

  for (const track of tracks) {
    const duration = Math.round(track.duration) || -1;
    m3u += `#EXTINF:${duration},${track.artist} - ${track.title}\n`;
    if (track.album) m3u += `#EXTALB:${track.album}\n`;
    if (track.genre) m3u += `#EXTGRP:${track.genre}\n`;
    if (track.artwork) m3u += `#EXTIMG:${track.artwork}\n`;
    m3u += `${track.url}\n\n`;
  }

  return m3u;
}

export const playlistImportService = {
  parseM3U,
  importM3UPlaylist,
  exportToM3U,
  matchEntryToCatalog,
};