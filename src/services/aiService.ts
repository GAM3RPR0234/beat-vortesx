import { Track } from '@/store/playerStore';

export interface TrackFeatures {
  id: string;
  genre: string;
  bpm: number;
  key: string;
  energy: number;
  danceability: number;
  valence: number;
  spectralCentroid: number;
}

export interface SimilarityScore {
  trackId: string;
  score: number;
  reasons: string[];
}

export interface SmartQueueConfig {
  mode: 'radio' | 'mix' | 'discovery';
  seedTrackId: string;
  maxLength: number;
  diversityFactor: number;
}

const CAMELOT_WHEEL: Record<string, string[]> = {
  '1A': ['12A', '2A', '1B'],
  '2A': ['1A', '3A', '2B'],
  '3A': ['2A', '4A', '3B'],
  '4A': ['3A', '5A', '4B'],
  '5A': ['4A', '6A', '5B'],
  '6A': ['5A', '7A', '6B'],
  '7A': ['6A', '8A', '7B'],
  '8A': ['7A', '9A', '8B'],
  '9A': ['8A', '10A', '9B'],
  '10A': ['9A', '11A', '10B'],
  '11A': ['10A', '12A', '11B'],
  '12A': ['11A', '1A', '12B'],
  '1B': ['12B', '2B', '1A'],
  '2B': ['1B', '3B', '2A'],
  '3B': ['2B', '4B', '3A'],
  '4B': ['3B', '5B', '4A'],
  '5B': ['4B', '6B', '5A'],
  '6B': ['5B', '7B', '6A'],
  '7B': ['6B', '8B', '7A'],
  '8B': ['7B', '9B', '8A'],
  '9B': ['8B', '10B', '9A'],
  '10B': ['9B', '11B', '10A'],
  '11B': ['10B', '12B', '11A'],
  '12B': ['11B', '1B', '12A'],
};

const GENRE_CLUSTERS: Record<string, string[]> = {
  electronic: ['synthwave', 'dark synth', 'cyberpunk', 'retrowave', 'chillwave', 'edm', 'house', 'techno', 'trance', 'dubstep', 'drum and bass', 'ambient electronic'],
  rock: ['rock', 'alternative', 'indie', 'grunge', 'metal', 'punk', 'post-rock', 'progressive rock'],
  pop: ['pop', 'dance pop', 'electropop', 'synthpop', 'k-pop', 'j-pop'],
  hiphop: ['hip hop', 'rap', 'trap', 'boom bap', 'conscious hip hop'],
  rnb: ['r&b', 'soul', 'funk', 'neo soul', 'contemporary r&b'],
  jazz: ['jazz', 'bebop', 'smooth jazz', 'fusion', 'nu jazz'],
  classical: ['classical', 'orchestral', 'chamber music', 'opera', 'baroque'],
  folk: ['folk', 'acoustic', 'singer-songwriter', 'indie folk', 'folk rock'],
  latin: ['latin', 'reggaeton', 'bachata', 'salsa', 'cumbia', 'latin pop'],
};

function normalizeGenre(genre: string): string {
  return genre.toLowerCase().trim();
}

function getGenreCluster(genre: string): string {
  const normalized = normalizeGenre(genre);
  for (const [cluster, genres] of Object.entries(GENRE_CLUSTERS)) {
    if (genres.some(g => normalized.includes(g) || g.includes(normalized))) {
      return cluster;
    }
  }
  return 'other';
}

function camelotDistance(key1: string, key2: string): number {
  const compatible = CAMELOT_WHEEL[key1] || [];
  if (compatible.includes(key2)) return 1;
  const compatible2 = CAMELOT_WHEEL[key2] || [];
  if (compatible2.includes(key1)) return 1;
  return 0;
}

function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

function trackToFeatureVector(track: Track, features: TrackFeatures): number[] {
  const genreCluster = getGenreCluster(track.genre || '');
  const genreOneHot = Object.keys(GENRE_CLUSTERS).map(cluster => cluster === genreCluster ? 1 : 0);
  const keyCompatible = track.key ? 1 : 0;

  return [
    ...genreOneHot,
    features.bpm / 200,
    features.energy,
    features.danceability,
    features.valence,
    features.spectralCentroid / 8000,
    keyCompatible,
  ];
}

function estimateKeyFromBPMAndGenre(bpm: number, genre: string): string {
  const majorKeys = ['8B', '9B', '10B', '11B', '12B', '1B', '2B', '3B'];
  const minorKeys = ['5A', '6A', '7A', '8A', '9A', '10A', '11A', '12A'];

  const normalized = normalizeGenre(genre);
  const isElectronic = ['synthwave', 'dark synth', 'cyberpunk', 'retrowave', 'chillwave', 'edm', 'techno', 'trance'].some(g => normalized.includes(g));
  const isHighEnergy = bpm > 130;

  if (isElectronic && isHighEnergy) {
    return minorKeys[Math.floor(Math.random() * minorKeys.length)];
  }
  return majorKeys[Math.floor(Math.random() * majorKeys.length)];
}

export class AIService {
  private featureCache = new Map<string, TrackFeatures>();

  async analyzeTrack(track: Track): Promise<TrackFeatures> {
    const cacheKey = track.id;
    if (this.featureCache.has(cacheKey)) {
      return this.featureCache.get(cacheKey)!;
    }

    const bpm = track.bpm || this.estimateBPMFromGenre(track.genre || '');
    const key = track.key || estimateKeyFromBPMAndGenre(bpm, track.genre || '');
    const genreCluster = getGenreCluster(track.genre || '');

    const baseEnergy = this.getBaseEnergyForGenre(genreCluster);
    const baseDanceability = this.getBaseDanceabilityForGenre(genreCluster);
    const baseValence = this.getBaseValenceForGenre(genreCluster);

    const features: TrackFeatures = {
      id: track.id,
      genre: track.genre || 'unknown',
      bpm,
      key,
      energy: baseEnergy + (Math.random() - 0.5) * 0.2,
      danceability: baseDanceability + (Math.random() - 0.5) * 0.2,
      valence: baseValence + (Math.random() - 0.5) * 0.2,
      spectralCentroid: this.estimateSpectralCentroid(genreCluster, bpm),
    };

    features.energy = Math.max(0, Math.min(1, features.energy));
    features.danceability = Math.max(0, Math.min(1, features.danceability));
    features.valence = Math.max(0, Math.min(1, features.valence));

    this.featureCache.set(cacheKey, features);
    return features;
  }

  private estimateBPMFromGenre(genre: string): number {
    const normalized = normalizeGenre(genre);
    if (['synthwave', 'dark synth', 'cyberpunk', 'retrowave'].some(g => normalized.includes(g))) return 110 + Math.random() * 30;
    if (['chillwave', 'ambient'].some(g => normalized.includes(g))) return 80 + Math.random() * 20;
    if (['techno', 'house'].some(g => normalized.includes(g))) return 120 + Math.random() * 15;
    if (['dubstep', 'drum and bass'].some(g => normalized.includes(g))) return 140 + Math.random() * 30;
    if (['hip hop', 'rap', 'trap'].some(g => normalized.includes(g))) return 85 + Math.random() * 15;
    return 100 + Math.random() * 40;
  }

  private getBaseEnergyForGenre(cluster: string): number {
    const energies: Record<string, number> = {
      electronic: 0.8,
      rock: 0.75,
      pop: 0.65,
      hiphop: 0.7,
      rnb: 0.55,
      jazz: 0.45,
      classical: 0.4,
      folk: 0.35,
      latin: 0.7,
      other: 0.5,
    };
    return energies[cluster] || 0.5;
  }

  private getBaseDanceabilityForGenre(cluster: string): number {
    const danceability: Record<string, number> = {
      electronic: 0.85,
      rock: 0.5,
      pop: 0.75,
      hiphop: 0.7,
      rnb: 0.65,
      jazz: 0.4,
      classical: 0.2,
      folk: 0.3,
      latin: 0.8,
      other: 0.5,
    };
    return danceability[cluster] || 0.5;
  }

  private getBaseValenceForGenre(cluster: string): number {
    const valence: Record<string, number> = {
      electronic: 0.6,
      rock: 0.55,
      pop: 0.7,
      hiphop: 0.5,
      rnb: 0.6,
      jazz: 0.55,
      classical: 0.5,
      folk: 0.5,
      latin: 0.65,
      other: 0.5,
    };
    return valence[cluster] || 0.5;
  }

  private estimateSpectralCentroid(cluster: string, bpm: number): number {
    const baseCentroids: Record<string, number> = {
      electronic: 4000,
      rock: 3500,
      pop: 3000,
      hiphop: 2500,
      rnb: 2800,
      jazz: 3200,
      classical: 2000,
      folk: 2200,
      latin: 3000,
      other: 2800,
    };
    const base = baseCentroids[cluster] || 2800;
    return base + (bpm - 120) * 10;
  }

  async estimateBPM(audioBuffer: ArrayBuffer): Promise<number> {
    return 120;
  }

  async detectKey(audioBuffer: ArrayBuffer): Promise<string> {
    return '8A';
  }

  async getSimilarTracks(seedTrack: Track, library: Track[], count: number): Promise<SimilarityScore[]> {
    const seedFeatures = await this.analyzeTrack(seedTrack);
    const seedVector = trackToFeatureVector(seedTrack, seedFeatures);

    const scores: SimilarityScore[] = [];

    for (const track of library) {
      if (track.id === seedTrack.id) continue;

      const trackFeatures = await this.analyzeTrack(track);
      const trackVector = trackToFeatureVector(track, trackFeatures);

      const similarity = cosineSimilarity(seedVector, trackVector);

      const reasons: string[] = [];
      if (track.genre && seedTrack.genre) {
        const genreSim = getGenreCluster(track.genre) === getGenreCluster(seedTrack.genre);
        if (genreSim) reasons.push(`Mismo género: ${track.genre}`);
      }
      if (track.bpm && seedTrack.bpm) {
        const bpmDiff = Math.abs(track.bpm - seedTrack.bpm) / seedTrack.bpm;
        if (bpmDiff < 0.05) reasons.push(`BPM similar (${track.bpm} vs ${seedTrack.bpm})`);
      }
      if (track.key && seedTrack.key) {
        if (camelotDistance(track.key, seedTrack.key)) reasons.push(`Clave compatible (${track.key} ↔ ${seedTrack.key})`);
      }

      scores.push({
        trackId: track.id,
        score: similarity,
        reasons: reasons.length > 0 ? reasons : ['Similitud acústica'],
      });
    }

    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, count);
  }

  async generateSmartQueue(config: SmartQueueConfig, library: Track[]): Promise<Track[]> {
    const seedTrack = library.find(t => t.id === config.seedTrackId);
    if (!seedTrack) return [];

    const similarTracks = await this.getSimilarTracks(seedTrack, library, config.maxLength * 2);

    let selected: SimilarityScore[] = [];

    if (config.mode === 'radio') {
      selected = similarTracks.slice(0, config.maxLength);
    } else if (config.mode === 'mix') {
      const highSimilarity = similarTracks.filter(s => s.score > 0.7);
      const mediumSimilarity = similarTracks.filter(s => s.score > 0.4 && s.score <= 0.7);
      const lowSimilarity = similarTracks.filter(s => s.score <= 0.4);

      const highCount = Math.floor(config.maxLength * 0.6);
      const medCount = Math.floor(config.maxLength * 0.3);
      const lowCount = config.maxLength - highCount - medCount;

      selected = [
        ...highSimilarity.slice(0, highCount),
        ...mediumSimilarity.slice(0, medCount),
        ...lowSimilarity.slice(0, lowCount),
      ];
    } else if (config.mode === 'discovery') {
      // Discovery mode: prefer less similar tracks for variety
      // Use a more permissive threshold and also include some medium similarity
      const threshold = 0.4 + config.diversityFactor * 0.3; // 0.4 to 0.7 range
      const diverseTracks = similarTracks
        .filter(s => s.score < threshold)
        .slice(0, config.maxLength);

      // If not enough diverse tracks, fill with medium similarity tracks
      if (diverseTracks.length < config.maxLength) {
        const mediumTracks = similarTracks
          .filter(s => s.score >= threshold && s.score < 0.8)
          .slice(0, config.maxLength - diverseTracks.length);
        selected = [...diverseTracks, ...mediumTracks];
      } else {
        selected = diverseTracks;
      }
    }

    const queueTracks = selected
      .map(s => library.find(t => t.id === s.trackId))
      .filter((t): t is Track => t !== undefined);

    return [seedTrack, ...queueTracks].slice(0, config.maxLength);
  }

  clearCache() {
    this.featureCache.clear();
  }
}

export const aiService = new AIService();