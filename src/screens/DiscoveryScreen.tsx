import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useThemeStore } from '@/store/themeStore';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { usePlayerStore } from '@/store/playerStore';
import { useHistoryStore } from '@/store/historyStore';
import { aiService } from '@/services/aiService';
import { musicCatalogService, SearchResult } from '@/services/musicCatalogService';
import { historyService } from '@/services/historyService';
import { Track } from '@/store/playerStore';
import { useHaptics } from '@/hooks/useHaptics';
import { formatDate } from '@/utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY } from '@/constants/theme';

interface DiscoveryScreenProps {
  initialTab?: 'radio' | 'mixes' | 'moods' | 'new-releases';
}

function convertSearchResultToTrack(result: SearchResult): Track {
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
    year: result.year ? parseInt(result.year) : undefined,
  };
}

export function DiscoveryScreen({ initialTab = 'radio' }: DiscoveryScreenProps) {
  const colors = useColors();
  const { themeMode } = useThemeStore();
  const reducedMotion = useReducedMotion();
  const { addToQueue, setQueue, smartQueueMode, generateSmartQueue, setSmartQueueMode } = usePlayerStore();
  const { history } = useHistoryStore();
  const { lightImpact, mediumImpact } = useHaptics();

  const [activeTab, setActiveTab] = useState<'radio' | 'mixes' | 'moods' | 'new-releases'>(initialTab);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Radio state
  const [radioTracks, setRadioTracks] = useState<Track[]>([]);
  const [radioLoading, setRadioLoading] = useState(false);
  const [radioSeed, setRadioSeed] = useState<'genre' | 'artist' | 'album' | 'track'>('genre');
  const [radioSeedValue, setRadioSeedValue] = useState<string>('');

  // Weekly mix state
  const [weeklyMix, setWeeklyMix] = useState<Track[]>([]);
  const [weeklyMixLoading, setWeeklyMixLoading] = useState(false);
  const [weeklyMixGeneratedAt, setWeeklyMixGeneratedAt] = useState<number | null>(null);

  // New releases state
  const [newReleases, setNewReleases] = useState<Track[]>([]);
  const [newReleasesLoading, setNewReleasesLoading] = useState(false);

  // Mood playlists state
  const [moodPlaylists, setMoodPlaylists] = useState<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    color: string;
    tracks: Track[];
  }>>([]);
  const [moodLoading, setMoodLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load weekly mix if stale (older than 7 days)
  useEffect(() => {
    checkWeeklyMixFreshness();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    await Promise.all([
      loadMoodPlaylists(),
      loadNewReleases(),
    ]);
    setLoading(false);
  };

  const checkWeeklyMixFreshness = async () => {
    const stored = await AsyncStorage.getItem('@beat_vortex_weekly_mix');
    if (stored) {
      const { tracks, generatedAt } = JSON.parse(stored);
      const weekMs = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - generatedAt < weekMs) {
        setWeeklyMix(tracks);
        setWeeklyMixGeneratedAt(generatedAt);
        return;
      }
    }
    // Generate new weekly mix
    await generateWeeklyMix();
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await mediumImpact();

    await Promise.all([
      loadMoodPlaylists(),
      loadNewReleases(),
      activeTab === 'radio' && radioSeedValue ? loadRadio(radioSeed, radioSeedValue) : Promise.resolve(),
      activeTab === 'mixes' ? generateWeeklyMix() : Promise.resolve(),
    ]);

    setRefreshing(false);
  }, [activeTab, radioSeed, radioSeedValue]);

  // Mood/Activity Playlists
  const loadMoodPlaylists = async () => {
    setMoodLoading(true);

    // Try to load from cache first
    const cached = await AsyncStorage.getItem('@beat_vortex_mood_playlists');
    if (cached) {
      try {
        const data = JSON.parse(cached);
        setMoodPlaylists(data);
        setMoodLoading(false);
        return;
      } catch {
        // Ignore cache errors
      }
    }

    // Generate mood playlists from catalog
    try {
      const moods = [
        { id: 'focus', name: 'Focus', description: 'Deep work & study', icon: 'book', color: '#00d4ff' },
        { id: 'workout', name: 'Workout', description: 'High energy training', icon: 'body', color: '#ff2d75' },
        { id: 'chill', name: 'Chill', description: 'Relax & unwind', icon: 'leaf', color: '#4cd964' },
        { id: 'party', name: 'Party', description: 'Turn up the vibe', icon: 'wine', color: '#b84dff' },
        { id: 'sleep', name: 'Sleep', description: 'Drift off peacefully', icon: 'moon', color: '#5e5ce6' },
        { id: 'commute', name: 'Commute', description: 'Perfect for the road', icon: 'car', color: '#ff9500' },
      ];

      const playlists = await Promise.all(
        moods.map(async (mood) => {
          const searchResults = await musicCatalogService.searchTracks({
            query: mood.id,
            limit: 20,
            genre: getGenreForMood(mood.id),
          } as any);

          // Convert to Track for AI service
          const trackResults = searchResults.map(convertSearchResultToTrack);

          // Use AI to refine selection if available
          let refinedTracks = trackResults;
          if (trackResults.length > 0) {
            try {
              const config = {
                mode: 'mix' as const,
                seedTrackId: trackResults[0].id,
                maxLength: 20,
                diversityFactor: 0.4,
              };
              refinedTracks = await aiService.generateSmartQueue(config, trackResults);
            } catch {
              refinedTracks = trackResults;
            }
          }

          return {
            ...mood,
            tracks: refinedTracks.slice(0, 15),
          };
        })
      );

      setMoodPlaylists(playlists);

      // Cache for 24 hours
      await AsyncStorage.setItem(
        '@beat_vortex_mood_playlists',
        JSON.stringify({ playlists, cachedAt: Date.now() })
      );
    } catch (error) {
      console.error('Failed to load mood playlists:', error);
      // Fallback to empty playlists
      setMoodPlaylists([]);
    } finally {
      setMoodLoading(false);
    }
  };

  // Radio - Generate radio based on seed
  const loadRadio = async (seedType: typeof radioSeed, seedValue: string) => {
    if (!seedValue) return;

    setRadioLoading(true);
    setRadioSeed(seedType);
    setRadioSeedValue(seedValue);

    try {
      let seedTracks: SearchResult[] = [];

      // Search for seed tracks based on type
      const searchResults = await musicCatalogService.searchTracks({
        query: seedValue,
        limit: 10,
      } as any);

      seedTracks = searchResults;

      if (seedTracks.length === 0) {
        setRadioTracks([]);
        return;
      }

      // Use Smart Queue AI to generate radio
      const config = {
        mode: 'radio' as const,
        seedTrackId: seedTracks[0].id,
        maxLength: 50,
        diversityFactor: 0.5,
      };

      const allCatalogTracks = await musicCatalogService.searchTracks({
        query: '',
        limit: 200,
      } as any);

      const catalogTracks = allCatalogTracks.map(convertSearchResultToTrack);

      const radio = await aiService.generateSmartQueue(config, catalogTracks);

      setRadioTracks(radio);
    } catch (error) {
      console.error('Radio generation failed:', error);
      setRadioTracks([]);
    } finally {
      setRadioLoading(false);
    }
  };

  // Weekly Mix - Personalized from history + AI
  const generateWeeklyMix = async () => {
    setWeeklyMixLoading(true);

    try {
      // Get user's top tracks/artists from history
      const stats = historyService.getStats();
      const topTrackIds = stats.topTracks.slice(0, 5).map(t => t.track.id);

      // Get seed tracks from history
      const recentTracks = historyService.getRecentTracks(20);
      const seedTracks = recentTracks.filter(t => topTrackIds.includes(t.id)).slice(0, 3);

      if (seedTracks.length === 0 && recentTracks.length > 0) {
        seedTracks.push(...recentTracks.slice(0, 3));
      }

      // Get catalog tracks for diversity
      const catalogResults = await musicCatalogService.searchTracks({
        query: '',
        limit: 300,
      } as any);

      const catalogTracks = catalogResults.map(convertSearchResultToTrack);

      // Generate mix using AI
      const config = {
        mode: 'mix' as const,
        seedTrackId: seedTracks[0]?.id || catalogTracks[0]?.id,
        maxLength: 30,
        diversityFactor: 0.6,
      };

      const mix = await aiService.generateSmartQueue(config, catalogTracks);

      setWeeklyMix(mix);
      setWeeklyMixGeneratedAt(Date.now());

      // Cache for a week
      await AsyncStorage.setItem(
        '@beat_vortex_weekly_mix',
        JSON.stringify({ tracks: mix, generatedAt: Date.now() })
      );
    } catch (error) {
      console.error('Weekly mix generation failed:', error);
    } finally {
      setWeeklyMixLoading(false);
    }
  };

  // New Releases
  const loadNewReleases = async () => {
    setNewReleasesLoading(true);

    try {
      // Use trending as new releases fallback
      const releases = await musicCatalogService.getTrending(20);
      setNewReleases(releases.map(convertSearchResultToTrack));
    } catch (error) {
      console.error('New releases load failed:', error);
    } finally {
      setNewReleasesLoading(false);
    }
  };

  // Play a collection of tracks
  const playTracks = useCallback(async (tracks: Track[], startIndex = 0) => {
    if (tracks.length === 0) return;
    await mediumImpact();
    setQueue(tracks, startIndex);
  }, [setQueue]);

  const addTracksToQueue = useCallback((tracks: Track[]) => {
    tracks.forEach(t => addToQueue(t));
    lightImpact();
  }, [addToQueue]);

  // Render track list
  const renderTrackItem = ({ item, index }: { item: Track; index: number }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => playTracks([item])}
      onLongPress={() => addTracksToQueue([item])}
      activeOpacity={0.8}
    >
      <Image source={{ uri: item.artwork }} style={styles.trackArtwork} resizeMode="cover" />
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.trackArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
      <TouchableOpacity
        style={styles.playButton}
        onPress={(e) => {
          e.stopPropagation();
          playTracks([item]);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="play" size={24} color={colors.primary} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // Render section header
  const renderSectionHeader = (title: string, subtitle?: string, action?: React.ReactNode) => (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
      </View>
      {action}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Discovering music...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab Bar */}
        <View style={styles.tabBar}>
          {['radio', 'mixes', 'moods', 'new-releases'].map((tab, index) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabButton,
                activeTab === tab && styles.tabButtonActive,
              ]}
              onPress={() => {
                lightImpact();
                setActiveTab(tab as any);
              }}
            >
              <Ionicons
                name={
                  tab === 'radio' ? 'radio' :
                  tab === 'mixes' ? 'musical-notes' :
                  tab === 'moods' ? 'heart' : 'sparkles'
                }
                size={20}
                color={activeTab === tab ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabButtonText,
                  activeTab === tab && { color: colors.primary },
                ]}
              >
                {tab === 'radio' ? 'Radio' :
                 tab === 'mixes' ? 'Mixes' :
                 tab === 'moods' ? 'Moods' : 'New'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Radio Tab */}
        {activeTab === 'radio' && (
          <>
            <View style={styles.radioSeedSelector}>
              <Text style={[styles.seedLabel, { color: colors.textSecondary }]}>Create radio from:</Text>
              <View style={styles.seedButtons}>
                {(['genre', 'artist', 'album', 'track'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.seedButton,
                      radioSeed === type && styles.seedButtonActive,
                    ]}
                    onPress={() => setRadioSeed(type)}
                  >
                    <Text
                      style={[
                        styles.seedButtonText,
                        radioSeed === type ? { color: colors.background } : { color: colors.textPrimary },
                      ]}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.seedInputContainer}>
                <TextInput
                  style={[styles.seedInput, { color: colors.textPrimary, backgroundColor: colors.surface }]}
                  placeholder={`Enter ${radioSeed} name...`}
                  value={radioSeedValue}
                  onChangeText={setRadioSeedValue}
                  onSubmitEditing={() => loadRadio(radioSeed, radioSeedValue)}
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  style={[styles.generateButton, { backgroundColor: colors.primary }]}
                  onPress={() => loadRadio(radioSeed, radioSeedValue)}
                  disabled={!radioSeedValue.trim() || radioLoading}
                >
                  {radioLoading ? (
                    <ActivityIndicator size="small" color={colors.background} />
                  ) : (
                    <Ionicons name="radio" size={20} color={colors.background} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {radioTracks.length > 0 && (
              <>
                {renderSectionHeader(
                  `${radioSeed.charAt(0).toUpperCase() + radioSeed.slice(1)} Radio`,
                  `Based on "${radioSeedValue}" • ${radioTracks.length} tracks`
                )}
                <View style={styles.trackList}>
                  {radioTracks.map((track, index) => renderTrackItem({ item: track, index }))}
                </View>
                <TouchableOpacity
                  style={[styles.playAllButton, { backgroundColor: colors.primary }]}
                  onPress={() => playTracks(radioTracks)}
                >
                  <Ionicons name="play" size={20} color={colors.background} />
                  <Text style={styles.playAllButtonText}>Play Radio</Text>
                </TouchableOpacity>
              </>
            )}

            {radioTracks.length === 0 && !radioLoading && (
              <View style={styles.emptyState}>
                <Ionicons name="radio" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Create Your Radio</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Select a genre, artist, album, or track to generate an endless radio station
                </Text>
              </View>
            )}
          </>
        )}

        {/* Mixes Tab */}
        {activeTab === 'mixes' && (
          <>
            {weeklyMix.length > 0 && (
              <>
                {renderSectionHeader(
                  'Weekly Mix',
                  `Generated ${weeklyMixGeneratedAt ? formatDate(weeklyMixGeneratedAt) : 'recently'} • ${weeklyMix.length} tracks`,
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={generateWeeklyMix}
                    disabled={weeklyMixLoading}
                  >
                    {weeklyMixLoading ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="refresh" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )}
                <View style={styles.trackList}>
                  {weeklyMix.map((track, index) => renderTrackItem({ item: track, index }))}
                </View>
                <TouchableOpacity
                  style={[styles.playAllButton, { backgroundColor: colors.primary }]}
                  onPress={() => playTracks(weeklyMix)}
                >
                  <Ionicons name="play" size={20} color={colors.background} />
                  <Text style={styles.playAllButtonText}>Play Weekly Mix</Text>
                </TouchableOpacity>
              </>
            )}

            {weeklyMix.length === 0 && !weeklyMixLoading && (
              <View style={styles.emptyState}>
                <Ionicons name="musical-notes" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Your Weekly Mix</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  A personalized mix based on your listening history. Updates every Monday.
                </Text>
                <TouchableOpacity
                  style={[styles.generateButton, { backgroundColor: colors.primary }]}
                  onPress={generateWeeklyMix}
                >
                  <Text style={styles.generateButtonText}>Generate Now</Text>
                </TouchableOpacity>
              </View>
            )}

            {weeklyMixLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Crafting your mix...</Text>
              </View>
            )}
          </>
        )}

        {/* Moods Tab */}
        {activeTab === 'moods' && (
          <>
            {moodPlaylists.length > 0 && (
              <View style={styles.moodGrid}>
                {moodPlaylists.map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id}
                    style={styles.moodCard}
                    onPress={() => playTracks(playlist.tracks)}
                    activeOpacity={0.9}
                  >
                    <View
                      style={[
                        styles.moodCardGradient,
                        { backgroundColor: playlist.color },
                      ]}
                    >
                      <Ionicons
                        name={playlist.icon as any}
                        size={40}
                        color="#fff"
                        style={styles.moodCardIcon}
                      />
                    </View>
                    <View style={styles.moodCardInfo}>
                      <Text style={[styles.moodCardName, { color: colors.textPrimary }]}>{playlist.name}</Text>
                      <Text style={[styles.moodCardDesc, { color: colors.textSecondary }]}>{playlist.description}</Text>
                      <Text style={[styles.moodCardCount, { color: colors.textSecondary }]}>
                        {playlist.tracks.length} tracks
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.moodCardPlay, { backgroundColor: playlist.color }]}
                      onPress={(e) => {
                        e.stopPropagation();
                        playTracks(playlist.tracks);
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="play" size={20} color="#fff" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {moodLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading moods...</Text>
              </View>
            )}
          </>
        )}

        {/* New Releases Tab */}
        {activeTab === 'new-releases' && (
          <>
            {renderSectionHeader('New Releases', 'Fresh tracks from your followed artists')}
            {newReleases.length > 0 ? (
              <View style={styles.trackList}>
                {newReleases.map((track, index) => renderTrackItem({ item: track, index }))}
              </View>
            ) : newReleasesLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading releases...</Text>
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="sparkles" size={64} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No New Releases</Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Follow artists to see their latest releases here
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getGenreForMood = (mood: string): string => {
  const genreMap: Record<string, string> = {
    focus: 'ambient',
    workout: 'electronic',
    chill: 'chill',
    party: 'dance',
    sleep: 'ambient',
    commute: 'pop',
  };
  return genreMap[mood] || 'pop';
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  tabButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#888',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 2,
  },
  refreshButton: {
    padding: SPACING.xs,
  },
  radioSeedSelector: {
    padding: SPACING.md,
  },
  seedLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: SPACING.sm,
  },
  seedButtons: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  seedButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: '#1a1a2e',
    alignItems: 'center',
  },
  seedButtonActive: {
    backgroundColor: '#00d4ff',
  },
  seedButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  seedInputContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
    alignItems: 'center',
  },
  seedInput: {
    flex: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    borderWidth: 1,
    borderColor: '#2a2a3e',
  },
  generateButton: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateButtonText: {
    color: '#fff',
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  trackList: {
    paddingHorizontal: SPACING.md,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a2e',
  },
  trackArtwork: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.sm,
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
  },
  trackTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: '#fff',
  },
  trackArtist: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: '#888',
    marginTop: 2,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    margin: SPACING.md,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  playAllButtonText: {
    color: '#0a0a0f',
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xxxl,
    gap: SPACING.md,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md,
  },
  moodGrid: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  moodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  moodCardGradient: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moodCardIcon: {
    // icon styles
  },
  moodCardInfo: {
    flex: 1,
    padding: SPACING.md,
  },
  moodCardName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  moodCardDesc: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 2,
  },
  moodCardCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 6,
  },
  moodCardPlay: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
  },
});

export default DiscoveryScreen;