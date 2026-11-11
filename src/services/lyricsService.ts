import { Track } from '@/store/playerStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage for test environments (Node.js without window)
let mockLyricsAsyncStorage: Map<string, string> | null = null;
if (typeof window === 'undefined' && typeof global.window === 'undefined') {
  mockLyricsAsyncStorage = new Map<string, string>();

  const originalGetItem = AsyncStorage.getItem;
  const originalSetItem = AsyncStorage.setItem;
  const originalRemoveItem = AsyncStorage.removeItem;

  AsyncStorage.getItem = async (key: string) => {
    if (mockLyricsAsyncStorage && mockLyricsAsyncStorage.has(key)) {
      return mockLyricsAsyncStorage.get(key) || null;
    }
    return originalGetItem(key);
  };

  AsyncStorage.setItem = async (key: string, value: string) => {
    if (mockLyricsAsyncStorage) {
      mockLyricsAsyncStorage.set(key, value);
      return;
    }
    return originalSetItem(key, value);
  };

  AsyncStorage.removeItem = async (key: string) => {
    if (mockLyricsAsyncStorage) {
      mockLyricsAsyncStorage.delete(key);
      return;
    }
    return originalRemoveItem(key);
  };
}

export function __resetMockLyricsAsyncStorage() {
  if (mockLyricsAsyncStorage) {
    mockLyricsAsyncStorage.clear();
  }
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

export interface LyricExplanation {
  line: string;
  explanation: string;
  context: {
    artist: string;
    genre: string;
    timestamp: number;
  };
  cachedAt: number;
}

const STORAGE_KEYS = {
  TRANSLATION_CACHE: 'beatvortex_lyrics_translation_',
  EXPLANATION_CACHE: 'beatvortex_lyrics_explanation_',
  LYRICS_METADATA: 'beatvortex_lyrics_metadata_',
};

const LRC_TIME_REGEX = /\[(\d{2}):(\d{2})[.:](\d{2,3})\]/g;
const LRC_WORD_TIME_REGEX = /<(\d{2}):(\d{2})[.:](\d{2,3})>([^<]+)/g;

const SIMPLE_TRANSLATIONS: Record<string, Record<string, string>> = {
  'en-es': {
    'neon lights painting the night': 'luces de neón pintando la noche',
    'driving through the synthwave dreams': 'conduciendo sueños synthwave',
    'midnight drive, we feel alive': 'conducción nocturna, nos sentimos vivos',
    'electric hearts in overdrive': 'corazones eléctricos al máximo',
    'neon nights will never die': 'las noches de neón nunca morirán',
    'feel the rhythm in your soul': 'siente el ritmo en tu alma',
    'lost in the music tonight': 'perdido en la música esta noche',
    'dancing through the shadows': 'bailando a través de las sombras',
    'city never sleeps': 'la ciudad nunca duerme',
    'synthetic hearts beat as one': 'corazones sintéticos laten como uno',
  },
  'es-en': {
    'luces de neón pintando la noche': 'neon lights painting the night',
    'conduciendo sueños synthwave': 'driving through the synthwave dreams',
    'conducción nocturna, nos sentimos vivos': 'midnight drive, we feel alive',
    'corazones eléctricos al máximo': 'electric hearts in overdrive',
    'las noches de neón nunca morirán': 'neon nights will never die',
    'siente el ritmo en tu alma': 'feel the rhythm in your soul',
    'perdido en la música esta noche': 'lost in the music tonight',
    'bailando a través de las sombras': 'dancing through the shadows',
    'la ciudad nunca duerme': 'city never sleeps',
    'corazones sintéticos laten como uno': 'synthetic hearts beat as one',
  },
};

const EXPLANATION_TEMPLATES: Record<string, string[]> = {
  'neon': [
    'Referencia a la estética cyberpunk/synthwave: luces de neón simbolizan la fusión de tecnología y vida nocturna.',
    'En la cultura synthwave, el neón representa la nostalgia por los años 80 y la visión retrofuturista.',
  ],
  'synthwave': [
    'Synthwave (o retrowave) es un género musical inspirado en las bandas sonoras de películas, videojuegos y series de los 80.',
    'Caracterizado por uso intensivo de sintetizadores analógicos, baterías electrónicas y atmósferas cinematográficas.',
  ],
  'midnight': [
    'La medianoche simboliza el momento de mayor libertad creativa y conexión emocional en la cultura nocturna.',
    'En la música electrónica, "midnight" evoca sesiones de conducción nocturna (nightdrive) típicas del género.',
  ],
  'electric': [
    'Metáfora de la energía emocional amplificada por la música electrónica y la cultura de club.',
    'Referencia a la "corriente" que conecta a la multitud en la pista de baile.',
  ],
  'drive': [
    'El concepto de "nightdrive" es central en synthwave: conducir de noche escuchando música como experiencia meditativa.',
    'Simboliza el viaje interior y la escapatoria de la rutina diaria.',
  ],
  'heart': [
    'Los "corazones eléctricos" representan la pasión compartida por la música electrónica.',
    'En overdrive: emociones llevadas al límite, saturación emocional positiva.',
  ],
  'night': [
    'La noche como lienzo para la expresión libre, alejada de las normas diurnas.',
    'En cyberpunk/synthwave, la noche es cuando la tecnología brilla más intensamente.',
  ],
  'rhythm': [
    'El ritmo como lenguaje universal que trasciende barreras culturales e idiomáticas.',
    'En música electrónica, el ritmo (BPM, groove) define la energía física de la pista.',
  ],
  'soul': [
    'El alma como esencia emocional que la música electrónica busca tocar trotz de su naturaleza sintética.',
    'Paradoja: máquinas creando conexiones humanas profundas.',
  ],
  'shadow': [
    'Las sombras representan lo desconocido, lo subconsciente, lo que emerge en la oscuridad.',
    'Bailar en las sombras = entregarse a la música sin inhibiciones ni miradas ajenas.',
  ],
  'city': [
    'La ciudad nocturna como organismo vivo: luces, sonidos, movimiento constante.',
    'En cyberpunk, la megaciudad es protagonista tanto como los personajes.',
  ],
  'synthetic': [
    'Lo sintético vs. lo orgánico: tensión central del género synthwave y la estética cyberpunk.',
    'Corazones sintéticos que laten "como uno": la tecnología unificando emociones humanas.',
  ],
  'beat': [
    'El beat (pulso) como latido de la música electrónica, sincronizando cuerpos en la pista.',
    'Vortex = vórtice: el beat como centro de gravedad que atrae todo hacia la danza.',
  ],
};

function findExplanationKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const keywords: string[] = [];
  for (const key of Object.keys(EXPLANATION_TEMPLATES)) {
    if (lower.includes(key)) {
      keywords.push(key);
    }
  }
  return keywords;
}

class LyricsService {
  private translationCache = new Map<string, ParsedLyricLine[]>();
  private explanationCache = new Map<string, LyricExplanation>();

  parseLRC(lrcText: string): LyricsData {
    const lines: ParsedLyricLine[] = [];
    const plainLines: string[] = [];

    const regex = /\[(\d{2}):(\d{2})[.:](\d{2,3})\](.*)/g;
    let match;

    while ((match = regex.exec(lrcText)) !== null) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const centiseconds = parseInt(match[3].padEnd(3, '0').slice(0, 2), 10);
      const time = minutes * 60 + seconds + centiseconds / 100;
      const text = match[4].trim();

      if (text) {
        lines.push({ time, text });
        plainLines.push(text);
      }
    }

    lines.sort((a, b) => a.time - b.time);

    const wordRegex = /<(\d{2}):(\d{2})[.:](\d{2,3})>([^<]+)/g;
    const enrichedLines = lines.map(line => {
      const words: { time: number; text: string }[] = [];
      let wordMatch;
      const lineText = lrcText.slice(lrcText.indexOf(`[${String(Math.floor(line.time / 60)).padStart(2, '0')}:${String(Math.floor(line.time % 60)).padStart(2, '0')}`));
      while ((wordMatch = wordRegex.exec(lineText)) !== null) {
        const wMin = parseInt(wordMatch[1], 10);
        const wSec = parseInt(wordMatch[2], 10);
        const wCenti = parseInt(wordMatch[3].padEnd(3, '0').slice(0, 2), 10);
        const wTime = wMin * 60 + wSec + wCenti / 100;
        const wText = wordMatch[4];
        if (wText.trim()) words.push({ time: wTime, text: wText.trim() });
        if (wTime > line.time + 10) break;
      }
      return { ...line, words: words.length > 0 ? words : undefined };
    });

    return {
      synced: enrichedLines,
      plain: plainLines.join('\n'),
      language: 'unknown',
      source: 'embedded',
    };
  }

  async fetchLyrics(track: Track): Promise<LyricsData | null> {
    const cacheKey = `${track.artist}-${track.title}`.toLowerCase().replace(/[^a-z0-9]/g, '');
    const metadataKey = `${STORAGE_KEYS.LYRICS_METADATA}${cacheKey}`;

    try {
      const cached = await AsyncStorage.getItem(metadataKey);
      if (cached) {
        const { timestamp, source } = JSON.parse(cached);
        if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
          const lyricsKey = `${source}_${cacheKey}`;
          const lyricsCached = await AsyncStorage.getItem(lyricsKey);
          if (lyricsCached) {
            return JSON.parse(lyricsCached);
          }
        }
      }
    } catch (error) {
      console.warn('Lyrics cache read failed:', error);
    }

    try {
      const query = encodeURIComponent(`${track.artist} ${track.title}`);
      const response = await fetch(`https://lrclib.net/api/get?${query}`, {
        headers: { 'User-Agent': 'BeatVortex/1.0' },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.syncedLyrics) {
          const lyricsData = this.parseLRC(data.syncedLyrics);
          lyricsData.source = 'lrclib';
          lyricsData.language = this.detectLanguage(lyricsData.plain);

          await this.cacheLyrics(cacheKey, 'lrclib', lyricsData);
          return lyricsData;
        }
      }
    } catch (error) {
      console.warn('LRCLIB fetch failed:', error);
    }

    if (track.lyrics) {
      const lyricsData = this.parseLRC(track.lyrics);
      lyricsData.source = 'embedded';
      lyricsData.language = this.detectLanguage(lyricsData.plain);
      await this.cacheLyrics(cacheKey, 'embedded', lyricsData);
      return lyricsData;
    }

    return null;
  }

  private detectLanguage(text: string): 'es' | 'en' | 'unknown' {
    const spanishWords = ['el', 'la', 'de', 'que', 'y', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'una', 'las', 'al', 'del', 'los', 'como', 'pero', 'sus', 'nos', 'está', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde', 'han', 'quien', 'desde', 'todo', 'nada', 'cuando', 'noche', 'luz', 'corazón', 'alma', 'vida', 'amor', 'tiempo', 'cielo', 'mar'];
    const englishWords = ['the', 'and', 'you', 'that', 'was', 'for', 'are', 'with', 'his', 'they', 'this', 'have', 'from', 'one', 'had', 'word', 'but', 'not', 'what', 'all', 'were', 'when', 'your', 'can', 'said', 'there', 'use', 'each', 'which', 'she', 'how', 'their', 'will', 'other', 'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would', 'make', 'like', 'into', 'time', 'has', 'look', 'two', 'more', 'write', 'go', 'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than', 'first', 'water', 'been', 'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down', 'day', 'did', 'get', 'come', 'made', 'may', 'part', 'night', 'light', 'heart', 'soul', 'life', 'love', 'time', 'sky', 'sea'];

    const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2);
    let esScore = 0;
    let enScore = 0;

    for (const word of words) {
      if (spanishWords.includes(word)) esScore++;
      if (englishWords.includes(word)) enScore++;
    }

    if (esScore > enScore * 1.5) return 'es';
    if (enScore > esScore * 1.5) return 'en';
    return 'unknown';
  }

  private async cacheLyrics(cacheKey: string, source: string, lyricsData: LyricsData): Promise<void> {
    try {
      const lyricsKey = `${source}_${cacheKey}`;
      await AsyncStorage.setItem(lyricsKey, JSON.stringify(lyricsData));
      await AsyncStorage.setItem(`${STORAGE_KEYS.LYRICS_METADATA}${cacheKey}`, JSON.stringify({
        timestamp: Date.now(),
        source,
      }));
    } catch (error) {
      console.warn('Lyrics cache write failed:', error);
    }
  }

  async translateLyrics(lyrics: ParsedLyricLine[], targetLang: 'es' | 'en'): Promise<ParsedLyricLine[]> {
    const cacheKey = `translate_${targetLang}_${lyrics.map(l => l.text).join('|')}`;
    const cached = this.translationCache.get(cacheKey);
    if (cached) return cached;

    const dict = SIMPLE_TRANSLATIONS[`${targetLang === 'es' ? 'en-es' : 'es-en'}`] || {};

    const translated = lyrics.map(line => ({
      ...line,
      translation: dict[line.text.toLowerCase()] || line.translation || `[${targetLang.toUpperCase()}] ${line.text}`,
    }));

    this.translationCache.set(cacheKey, translated);
    await this.persistTranslationCache(cacheKey, translated);
    return translated;
  }

  private async persistTranslationCache(key: string, lines: ParsedLyricLine[]): Promise<void> {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEYS.TRANSLATION_CACHE}${key}`, JSON.stringify(lines));
    } catch (error) {
      console.warn('Translation cache write failed:', error);
    }
  }

  async getCachedTranslation(trackId: string, lang: string): Promise<ParsedLyricLine[] | null> {
    const key = `${trackId}_${lang}`;
    const cached = this.translationCache.get(key);
    if (cached) return cached;

    try {
      const stored = await AsyncStorage.getItem(`${STORAGE_KEYS.TRANSLATION_CACHE}${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.translationCache.set(key, parsed);
        return parsed;
      }
    } catch (error) {
      console.warn('Translation cache read failed:', error);
    }
    return null;
  }

  async cacheTranslation(trackId: string, lang: string, lines: ParsedLyricLine[]): Promise<void> {
    const key = `${trackId}_${lang}`;
    this.translationCache.set(key, lines);
    await this.persistTranslationCache(key, lines);
  }

  async explainLyric(line: string, context: { artist: string; genre: string }): Promise<string> {
    const cacheKey = `explain_${context.artist}_${line}`.toLowerCase().replace(/[^a-z0-9]/g, '_');

    const cached = this.explanationCache.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < 30 * 24 * 60 * 60 * 1000) {
      return cached.explanation;
    }

    const keywords = findExplanationKeywords(line);
    let explanation = '';

    if (keywords.length > 0) {
      const templates = keywords.flatMap(k => EXPLANATION_TEMPLATES[k] || []);
      explanation = templates
        .slice(0, 3)
        .map((t, i) => `${i + 1}. ${t}`)
        .join('\n\n');
    } else {
      explanation = `Esta línea ("${line}") de ${context.artist} (${context.genre}) evoca la atmósfera característica del género. En la música ${context.genre}, las letras suelen usar imágenes de tecnología, noche y emociones intensificadas para crear una experiencia inmersiva. El significado exacto puede ser abierto a interpretación personal del oyente.`;
    }

    const result: LyricExplanation = {
      line,
      explanation,
      context: { ...context, timestamp: Date.now() },
      cachedAt: Date.now(),
    };

    this.explanationCache.set(cacheKey, result);
    await this.persistExplanation(cacheKey, result);
    return explanation;
  }

  private async persistExplanation(key: string, explanation: LyricExplanation): Promise<void> {
    try {
      await AsyncStorage.setItem(`${STORAGE_KEYS.EXPLANATION_CACHE}${key}`, JSON.stringify(explanation));
    } catch (error) {
      console.warn('Explanation cache write failed:', error);
    }
  }

  getCurrentLine(lyrics: ParsedLyricLine[], progress: number): ParsedLyricLine | null {
    if (!lyrics.length) return null;

    for (let i = lyrics.length - 1; i >= 0; i--) {
      if (progress >= lyrics[i].time) {
        return lyrics[i];
      }
    }
    return lyrics[0];
  }

  getCurrentWord(line: ParsedLyricLine, progress: number): { text: string; index: number } | null {
    if (!line.words || !line.words.length) return null;

    for (let i = line.words.length - 1; i >= 0; i--) {
      if (progress >= line.words[i].time) {
        return { text: line.words[i].text, index: i };
      }
    }
    return { text: line.words[0].text, index: 0 };
  }

  clearCaches(): void {
    this.translationCache.clear();
    this.explanationCache.clear();
  }
}

export const lyricsService = new LyricsService();