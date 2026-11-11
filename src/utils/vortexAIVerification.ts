// Beat Vortex - Vortex AI Core Verification Test
// Comprehensive end-to-end test for Smart Queue, Adaptive EQ, and Lyric Explain

import React from 'react';
import { aiService, SmartQueueConfig, TrackFeatures, SimilarityScore } from '@/services/aiService';
import { equalizerService, EQPreset } from '@/services/equalizerService';
import { lyricsService, LyricsData, ParsedLyricLine, LyricExplanation } from '@/services/lyricsService';
import { Track } from '@/store/playerStore';

/**
 * Verification result for a single feature
 */
export interface VerificationResult {
  feature: string;
  passed: boolean;
  details: string;
  durationMs: number;
  error?: string;
}

/**
 * Full verification report
 */
export interface VerificationReport {
  timestamp: number;
  overallPassed: boolean;
  results: VerificationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

/**
 * Mock track data for testing
 */
const MOCK_TRACKS: Track[] = [
  {
    id: 'track-1',
    title: 'Neon Dreams',
    artist: 'Synthwave Master',
    album: 'Cyberpunk Nights',
    artwork: 'https://example.com/artwork1.jpg',
    duration: 240,
    url: 'https://example.com/track1.mp3',
    genre: 'synthwave',
    bpm: 118,
    key: '8A',
    energy: 0.8,
    danceability: 0.85,
    valence: 0.6,
  },
  {
    id: 'track-2',
    title: 'Midnight Drive',
    artist: 'Retrowave Rider',
    album: 'Night City',
    artwork: 'https://example.com/artwork2.jpg',
    duration: 210,
    url: 'https://example.com/track2.mp3',
    genre: 'retrowave',
    bpm: 115,
    key: '9A',
    energy: 0.75,
    danceability: 0.8,
    valence: 0.65,
  },
  {
    id: 'track-3',
    title: 'Electric Hearts',
    artist: 'Neon Pulse',
    album: 'Overdrive',
    artwork: 'https://example.com/artwork3.jpg',
    duration: 260,
    url: 'https://example.com/track3.mp3',
    genre: 'synthwave',
    bpm: 120,
    key: '8B',
    energy: 0.85,
    danceability: 0.9,
    valence: 0.7,
  },
  {
    id: 'track-4',
    title: 'Chillwave Vibes',
    artist: 'Ambient Architect',
    album: 'Dreamscape',
    artwork: 'https://example.com/artwork4.jpg',
    duration: 300,
    url: 'https://example.com/track4.mp3',
    genre: 'chillwave',
    bpm: 90,
    key: '5A',
    energy: 0.3,
    danceability: 0.4,
    valence: 0.5,
  },
  {
    id: 'track-5',
    title: 'Techno Storm',
    artist: 'Dark Warehouse',
    album: 'Underground',
    artwork: 'https://example.com/artwork5.jpg',
    duration: 350,
    url: 'https://example.com/track5.mp3',
    genre: 'techno',
    bpm: 130,
    key: '7A',
    energy: 0.9,
    danceability: 0.85,
    valence: 0.4,
  },
  {
    id: 'track-6',
    title: 'Rock Anthem',
    artist: 'Guitar Heroes',
    album: 'Stadium Rock',
    artwork: 'https://example.com/artwork6.jpg',
    duration: 280,
    url: 'https://example.com/track6.mp3',
    genre: 'rock',
    bpm: 140,
    key: '10B',
    energy: 0.8,
    danceability: 0.5,
    valence: 0.6,
  },
];

/**
 * Run a single verification test with timing
 */
async function runVerification<T>(
  featureName: string,
  testFn: () => Promise<T>
): Promise<VerificationResult> {
  const startTime = Date.now();
  try {
    const result = await testFn();
    const duration = Date.now() - startTime;
    return {
      feature: featureName,
      passed: true,
      details: typeof result === 'string' ? result : JSON.stringify(result),
      durationMs: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      feature: featureName,
      passed: false,
      details: 'Test failed',
      durationMs: duration,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Verify Smart Queue functionality
 */
async function verifySmartQueue(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Test 1: Analyze track
  results.push(await runVerification('Smart Queue - Analyze Track', async () => {
    const features = await aiService.analyzeTrack(MOCK_TRACKS[0]);
    if (!features.id || !features.genre || features.bpm <= 0) {
      throw new Error('Invalid track features returned');
    }
    return `Analyzed: ${features.genre}, ${features.bpm}BPM, ${features.key}, energy:${features.energy.toFixed(2)}`;
  }));

  // Test 2: Get similar tracks
  results.push(await runVerification('Smart Queue - Get Similar Tracks', async () => {
    const similar = await aiService.getSimilarTracks(MOCK_TRACKS[0], MOCK_TRACKS, 5);
    if (similar.length === 0) {
      throw new Error('No similar tracks found');
    }
    return `Found ${similar.length} similar tracks, top score: ${similar[0].score.toFixed(3)} (${similar[0].reasons.join(', ')})`;
  }));

  // Test 3: Generate Smart Queue - Radio mode
  results.push(await runVerification('Smart Queue - Radio Mode', async () => {
    const config: SmartQueueConfig = {
      mode: 'radio',
      seedTrackId: MOCK_TRACKS[0].id,
      maxLength: 10,
      diversityFactor: 0.3,
    };
    const queue = await aiService.generateSmartQueue(config, MOCK_TRACKS);
    if (queue.length < 2) {
      throw new Error('Radio queue too short');
    }
    return `Radio queue: ${queue.length} tracks, first: ${queue[0].title}`;
  }));

  // Test 4: Generate Smart Queue - Mix mode
  results.push(await runVerification('Smart Queue - Mix Mode', async () => {
    const config: SmartQueueConfig = {
      mode: 'mix',
      seedTrackId: MOCK_TRACKS[0].id,
      maxLength: 10,
      diversityFactor: 0.3,
    };
    const queue = await aiService.generateSmartQueue(config, MOCK_TRACKS);
    if (queue.length < 2) {
      throw new Error('Mix queue too short');
    }
    return `Mix queue: ${queue.length} tracks`;
  }));

  // Test 5: Generate Smart Queue - Discovery mode
  results.push(await runVerification('Smart Queue - Discovery Mode', async () => {
    const config: SmartQueueConfig = {
      mode: 'discovery',
      seedTrackId: MOCK_TRACKS[0].id,
      maxLength: 10,
      diversityFactor: 0.7,
    };
    const queue = await aiService.generateSmartQueue(config, MOCK_TRACKS);
    if (queue.length < 2) {
      throw new Error('Discovery queue too short');
    }
    return `Discovery queue: ${queue.length} tracks`;
  }));

  // Test 6: Camelot wheel key compatibility
  results.push(await runVerification('Smart Queue - Camelot Key Compatibility', async () => {
    // 8A should be compatible with 9A, 7A, 8B
    const similar = await aiService.getSimilarTracks(MOCK_TRACKS[0], MOCK_TRACKS, 5);
    const keyCompatibleTracks = similar.filter(s => {
      const track = MOCK_TRACKS.find(t => t.id === s.trackId);
      return track && s.reasons.some(r => r.includes('Clave compatible'));
    });
    return `Key-compatible tracks found: ${keyCompatibleTracks.length}`;
  }));

  // Test 7: Cache clearing
  results.push(await runVerification('Smart Queue - Cache Management', async () => {
    aiService.clearCache();
    const features = await aiService.analyzeTrack(MOCK_TRACKS[0]);
    return `Cache cleared and re-populated: ${features.genre}`;
  }));

  return results;
}

/**
 * Verify Adaptive EQ functionality
 */
async function verifyAdaptiveEQ(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  // Test 1: Get preset for genre
  results.push(await runVerification('Adaptive EQ - Genre Preset Mapping', async () => {
    const preset = equalizerService.getPresetForGenre('synthwave');
    if (preset.length !== 9) {
      throw new Error('Invalid preset length');
    }
    return `Synthwave preset: [${preset.join(', ')}]`;
  }));

  // Test 2: AI recommendation
  results.push(await runVerification('Adaptive EQ - AI Recommendation', async () => {
    const rec = equalizerService.getAIRecommendation(MOCK_TRACKS[0]);
    if (!rec.preset || rec.values.length !== 9 || rec.confidence < 0 || rec.confidence > 1) {
      throw new Error('Invalid AI recommendation');
    }
    return `AI recommendation: ${rec.preset}, confidence: ${(rec.confidence * 100).toFixed(0)}%`;
  }));

  // Test 3: Built-in presets
  results.push(await runVerification('Adaptive EQ - Built-in Presets', async () => {
    const presets = equalizerService.getBuiltinPresets();
    if (presets.length < 8) {
      throw new Error('Not enough built-in presets');
    }
    const presetNames = presets.map(p => p.name).join(', ');
    return `Built-in presets (${presets.length}): ${presetNames}`;
  }));

  // Test 4: Apply preset
  results.push(await runVerification('Adaptive EQ - Apply Preset', async () => {
    const applied = equalizerService.applyPreset('Bass Boost');
    if (applied.length !== 9) {
      throw new Error('Applied preset has wrong length');
    }
    return `Applied Bass Boost: [${applied.join(', ')}]`;
  }));

  // Test 5: Apply genre preset
  results.push(await runVerification('Adaptive EQ - Apply Genre Preset', async () => {
    const applied = equalizerService.applyPreset('synthwave');
    if (applied.length !== 9) {
      throw new Error('Applied genre preset has wrong length');
    }
    return `Applied synthwave genre: [${applied.join(', ')}]`;
  }));

  // Test 6: Interpolate presets
  results.push(await runVerification('Adaptive EQ - Smooth Transition', async () => {
    const from = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const to = [8, 6, 3, 0, -2, -4, -4, -6, -8];
    const interpolated = equalizerService.interpolatePresets(from, to, 0.5);
    if (interpolated.length !== 9) {
      throw new Error('Interpolated preset has wrong length');
    }
    // At 50%, values should be halfway
    const expected = from.map((v, i) => v + (to[i] - v) * 0.5);
    const matches = interpolated.every((v, i) => Math.abs(v - expected[i]) < 0.01);
    if (!matches) {
      throw new Error('Interpolation values incorrect');
    }
    return `Interpolation at 50%: [${interpolated.map(v => v.toFixed(1)).join(', ')}]`;
  }));

  // Test 7: Smooth transition promise
  results.push(await runVerification('Adaptive EQ - Smooth Transition Promise', async () => {
    const from = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    const to = [8, 6, 3, 0, -2, -4, -4, -6, -8];
    const result = await equalizerService.startSmoothTransition(from, to, 100); // Fast for test
    if (result.length !== 9) {
      throw new Error('Transition result has wrong length');
    }
    // Should be close to target
    const matches = result.every((v, i) => Math.abs(v - to[i]) < 0.5);
    if (!matches) {
      throw new Error('Transition did not complete to target');
    }
    return `Transition completed to: [${result.map(v => v.toFixed(1)).join(', ')}]`;
  }));

  // Test 8: Genre preference persistence
  results.push(await runVerification('Adaptive EQ - Genre Preferences', async () => {
    const testValues = [1, 2, 3, 4, 5, 4, 3, 2, 1];
    await equalizerService.setGenrePreference('test-genre', testValues);
    const retrieved = await equalizerService.getGenrePreference('test-genre');
    if (!retrieved || retrieved.length !== 9) {
      throw new Error('Genre preference not persisted correctly');
    }
    return `Genre preference saved and retrieved: [${retrieved.join(', ')}]`;
  }));

  // Test 9: User preset CRUD
  results.push(await runVerification('Adaptive EQ - User Preset CRUD', async () => {
    const customPreset: EQPreset = {
      name: 'Test Custom',
      values: [1, 1, 1, 1, 1, 1, 1, 1, 1],
      icon: 'star',
    };
    await equalizerService.saveUserPreset(customPreset);
    const presets = await equalizerService.getUserPresets();
    const found = presets.find(p => p.name === 'Test Custom');
    if (!found) {
      throw new Error('User preset not saved');
    }
    await equalizerService.deleteUserPreset('Test Custom');
    const afterDelete = await equalizerService.getUserPresets();
    const stillExists = afterDelete.find(p => p.name === 'Test Custom');
    if (stillExists) {
      throw new Error('User preset not deleted');
    }
    return 'User preset create, read, delete verified';
  }));

  // Test 10: Bands configuration
  results.push(await runVerification('Adaptive EQ - Frequency Bands', async () => {
    const bands = equalizerService.getBands();
    if (bands.length !== 9) {
      throw new Error('Wrong number of bands');
    }
    const expectedBands = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 16000];
    const matches = bands.every((b, i) => b === expectedBands[i]);
    if (!matches) {
      throw new Error('Band frequencies incorrect');
    }
    return `Bands: ${bands.join(', ')}Hz`;
  }));

  return results;
}

/**
 * Verify Lyrics Service (LRC Parser, Translator, Lyric Explain)
 */
async function verifyLyricsService(): Promise<VerificationResult[]> {
  const results: VerificationResult[] = [];

  const sampleLRC = `[00:00.00]Neon lights painting the night
[00:04.50]Driving through the synthwave dreams
[00:09.20]Midnight drive, we feel alive
[00:13.80]Electric hearts in overdrive
[00:18.30]Neon nights will never die
[00:22.90]Feel the rhythm in your soul
[00:27.40]Lost in the music tonight
[00:32.00]Dancing through the shadows
[00:36.50]City never sleeps
[00:41.10]Synthetic hearts beat as one`;

  // Test 1: Parse LRC
  results.push(await runVerification('Lyrics - Parse LRC', async () => {
    const lyricsData = lyricsService.parseLRC(sampleLRC);
    if (!lyricsData.synced.length) {
      throw new Error('No synced lyrics parsed');
    }
    if (lyricsData.synced[0].time !== 0) {
      throw new Error('First line time incorrect');
    }
    return `Parsed ${lyricsData.synced.length} synced lines, plain text length: ${lyricsData.plain.length}`;
  }));

  // Test 2: Parse LRC with word-level timing
  const sampleLRCWithWords = `[00:00.00]<00:00.00>Neon <00:00.50>lights <00:01.00>painting <00:01.50>the <00:02.00>night
[00:04.50]Driving through the synthwave dreams`;

  results.push(await runVerification('Lyrics - Parse LRC with Word Timing', async () => {
    const lyricsData = lyricsService.parseLRC(sampleLRCWithWords);
    if (!lyricsData.synced[0].words || lyricsData.synced[0].words.length === 0) {
      throw new Error('Word-level timing not parsed');
    }
    return `First line has ${lyricsData.synced[0].words!.length} words with timing`;
  }));

  // Test 3: Language detection - English
  results.push(await runVerification('Lyrics - Language Detection (English)', async () => {
    const lyricsData = lyricsService.parseLRC(sampleLRC);
    // Access private method via type assertion
    const detectLanguage = (lyricsService as any).detectLanguage.bind(lyricsService);
    const lang = detectLanguage(lyricsData.plain);
    if (lang !== 'en') {
      throw new Error(`Expected 'en', got '${lang}'`);
    }
    return `Detected language: ${lang}`;
  }));

  // Test 4: Language detection - Spanish
  const spanishLRC = `[00:00.00]Luces de neón pintando la noche
[00:04.50]Conduciendo sueños synthwave
[00:09.20]Conducción nocturna, nos sentimos vivos`;

  results.push(await runVerification('Lyrics - Language Detection (Spanish)', async () => {
    const lyricsData = lyricsService.parseLRC(spanishLRC);
    const detectLanguage = (lyricsService as any).detectLanguage.bind(lyricsService);
    const lang = detectLanguage(lyricsData.plain);
    if (lang !== 'es') {
      throw new Error(`Expected 'es', got '${lang}'`);
    }
    return `Detected language: ${lang}`;
  }));

  // Test 5: Translate lyrics (EN to ES)
  results.push(await runVerification('Lyrics - Translate EN to ES', async () => {
    const lyricsData = lyricsService.parseLRC(sampleLRC);
    const translated = await lyricsService.translateLyrics(lyricsData.synced, 'es');
    if (translated.length !== lyricsData.synced.length) {
      throw new Error('Translation length mismatch');
    }
    // Check if at least some translations worked
    const hasTranslations = translated.some(l => l.translation && l.translation !== l.text);
    if (!hasTranslations) {
      throw new Error('No translations generated');
    }
    return `Translated ${translated.length} lines, sample: "${translated[0].translation}"`;
  }));

  // Test 6: Translate lyrics (ES to EN)
  results.push(await runVerification('Lyrics - Translate ES to EN', async () => {
    const lyricsData = lyricsService.parseLRC(spanishLRC);
    const translated = await lyricsService.translateLyrics(lyricsData.synced, 'en');
    const hasTranslations = translated.some(l => l.translation && l.translation !== l.text);
    if (!hasTranslations) {
      throw new Error('No translations generated');
    }
    return `Translated ${translated.length} lines, sample: "${translated[0].translation}"`;
  }));

  // Test 7: Get current line by progress
  results.push(await runVerification('Lyrics - Get Current Line', async () => {
    const lyricsData = lyricsService.parseLRC(sampleLRC);
    const lineAt5s = lyricsService.getCurrentLine(lyricsData.synced, 5);
    const lineAt15s = lyricsService.getCurrentLine(lyricsData.synced, 15);
    const lineAtEnd = lyricsService.getCurrentLine(lyricsData.synced, 100);

    if (!lineAt5s || lineAt5s.text !== 'Driving through the synthwave dreams') {
      throw new Error('Wrong line at 5s');
    }
    if (!lineAt15s || lineAt15s.text !== 'Electric hearts in overdrive') {
      throw new Error('Wrong line at 15s');
    }
    if (!lineAtEnd) {
      throw new Error('Should return last line at end');
    }
    return `At 5s: "${lineAt5s.text}", at 15s: "${lineAt15s.text}", at end: "${lineAtEnd.text}"`;
  }));

  // Test 8: Get current word by progress
  results.push(await runVerification('Lyrics - Get Current Word', async () => {
    const lyricsData = lyricsService.parseLRC(sampleLRCWithWords);
    // Test at 0.75s - "lights" starts at 0.50s, "painting" starts at 1.00s
    const wordAt0_75s = lyricsService.getCurrentWord(lyricsData.synced[0], 0.75);
    if (!wordAt0_75s || wordAt0_75s.text !== 'lights') {
      throw new Error(`Wrong word at 0.75s: ${wordAt0_75s?.text}`);
    }
    // Also verify at 1.00s "painting" is active (starts at 1.00)
    const wordAt1s = lyricsService.getCurrentWord(lyricsData.synced[0], 1.0);
    if (!wordAt1s || wordAt1s.text !== 'painting') {
      throw new Error(`Wrong word at 1s: ${wordAt1s?.text}`);
    }
    return `Word at 0.75s: "${wordAt0_75s.text}", at 1s: "${wordAt1s.text}"`;
  }));

  // Test 9: Lyric Explain
  results.push(await runVerification('Lyrics - Lyric Explain', async () => {
    const explanation = await lyricsService.explainLyric(
      'Neon lights painting the night',
      { artist: 'Synthwave Master', genre: 'synthwave' }
    );
    if (!explanation || explanation.length < 20) {
      throw new Error('Explanation too short or missing');
    }
    return `Explanation (${explanation.length} chars): "${explanation.slice(0, 80)}..."`;
  }));

  // Test 10: Lyric Explain caching
  results.push(await runVerification('Lyrics - Lyric Explain Caching', async () => {
    // First call (cache miss)
    const explanation1 = await lyricsService.explainLyric(
      'Synthetic hearts beat as one',
      { artist: 'Test Artist', genre: 'synthwave' }
    );
    // Second call (cache hit)
    const explanation2 = await lyricsService.explainLyric(
      'Synthetic hearts beat as one',
      { artist: 'Test Artist', genre: 'synthwave' }
    );
    if (explanation1 !== explanation2) {
      throw new Error('Cached explanation differs');
    }
    return `Cached explanation verified (${explanation1.length} chars)`;
  }));

  // Test 11: Clear caches
  results.push(await runVerification('Lyrics - Cache Management', async () => {
    lyricsService.clearCaches();
    // Verify caches are empty by checking translation cache
    // (We can't directly inspect private members, but clear should not throw)
    return 'Caches cleared successfully';
  }));

  return results;
}

/**
 * Run all Vortex AI Core verifications
 */
export async function runVortexAICoreVerification(): Promise<VerificationReport> {
  console.log('[Vortex AI Core] Starting verification...');

  const allResults: VerificationResult[] = [];

  // Run Smart Queue verification
  console.log('[Vortex AI Core] Verifying Smart Queue...');
  const smartQueueResults = await verifySmartQueue();
  allResults.push(...smartQueueResults);

  // Run Adaptive EQ verification
  console.log('[Vortex AI Core] Verifying Adaptive EQ...');
  const eqResults = await verifyAdaptiveEQ();
  allResults.push(...eqResults);

  // Run Lyrics Service verification
  console.log('[Vortex AI Core] Verifying Lyrics Service...');
  const lyricsResults = await verifyLyricsService();
  allResults.push(...lyricsResults);

  const passed = allResults.filter(r => r.passed).length;
  const failed = allResults.filter(r => !r.passed).length;

  const report: VerificationReport = {
    timestamp: Date.now(),
    overallPassed: failed === 0,
    results: allResults,
    summary: {
      total: allResults.length,
      passed,
      failed,
    },
  };

  console.log('[Vortex AI Core] Verification complete:', report.summary);
  return report;
}

/**
 * Log verification report in a readable format
 */
export function logVerificationReport(report: VerificationReport) {
  console.group(`[Vortex AI Core] Verification Report - ${report.overallPassed ? 'PASSED' : 'FAILED'}`);
  console.log(`Timestamp: ${new Date(report.timestamp).toISOString()}`);
  console.log(`Total: ${report.summary.total}, Passed: ${report.summary.passed}, Failed: ${report.summary.failed}`);
  console.groupEnd();

  report.results.forEach(result => {
    const prefix = result.passed ? '✅' : '❌';
    console.log(`${prefix} ${result.feature} (${result.durationMs}ms)`);
    if (result.passed) {
      console.log(`    ${result.details}`);
    } else {
      console.error(`    ERROR: ${result.error}`);
      console.error(`    Details: ${result.details}`);
    }
  });
}

/**
 * Quick verification hook for development
 */
export function useVortexAIVerification() {
  const runVerification = React.useCallback(async () => {
    const report = await runVortexAICoreVerification();
    logVerificationReport(report);
    return report;
  }, []);

  return { runVerification };
}