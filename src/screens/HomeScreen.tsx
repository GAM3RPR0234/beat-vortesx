// Beat Vortex - Home Screen (Redesigned)
// Modern, premium interface inspired by MetroList UX patterns

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Image,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
  Share,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColors, useReducedMotion } from '@/hooks/useColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/constants/theme';
import { useIsDark } from '@/store/themeStore';
import { downloadService } from '@/services/downloadService';
import { Track } from '@/store/playerStore';
import { getMusicPlaceholder } from '@/utils/placeholderImages';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// REUSABLE UI COMPONENTS
// ============================================

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onPressSeeAll?: () => void;
  actionIcon?: string;
}

function SectionHeader({ title, subtitle, onPressSeeAll, actionIcon }: SectionHeaderProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const pressAnim = React.useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (onPressSeeAll) {
      if (!reducedMotion) {
        pressAnim.setValue(1);
        Animated.timing(pressAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: true,
        }).start();
      }
      onPressSeeAll();
    }
  };

  const pressScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.95],
  });

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleContainer}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        {subtitle && <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>{subtitle}</Text>}
      </View>
      {onPressSeeAll && (
        <Animated.View style={{ transform: [{ scale: pressScale }] }}>
          <TouchableOpacity
            onPress={handlePress}
            style={styles.seeAllButton}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Ver todo ${title}`}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>Ver todo</Text>
            <Ionicons name={(actionIcon || 'chevron-forward-outline') as any} size={18} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

interface TrackCardProps {
  track: Track & { isPlaying?: boolean; isDownloaded?: boolean; isDownloading?: boolean; downloadProgress?: number };
  onPress: () => void;
  onDownload?: () => void;
  index?: number;
  variant?: 'default' | 'compact';
}

function TrackCard({ track, onPress, onDownload, index = 0, variant = 'default' }: TrackCardProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const imageAnim = React.useRef(new Animated.Value(0)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(imageAnim, {
        toValue: 1,
        duration: ANIMATION.duration.normal + index * 50,
        delay: index * 50,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      imageAnim.setValue(1);
    }
  }, [index, reducedMotion]);

  React.useEffect(() => {
    if (track.isDownloading && track.downloadProgress !== undefined) {
      Animated.timing(progressAnim, {
        toValue: track.downloadProgress,
        duration: 300,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: false,
      }).start();
    }
  }, [track.isDownloading, track.downloadProgress]);

  const handleDownload = (e: any) => {
    e.stopPropagation();
    if (onDownload) onDownload();
  };

  const cardWidth = variant === 'compact' ? 140 : 160;
  const artworkSize = variant === 'compact' ? 140 : 160;

  return (
    <Animated.View
      style={[
        styles.trackCard,
        { width: cardWidth },
        { opacity: imageAnim, transform: [{ translateY: imageAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.trackCardInner}
        accessibilityRole="button"
        accessibilityLabel={`${track.title} por ${track.artist}`}
      >
        <View style={{ width: artworkSize, height: artworkSize, ...styles.artworkContainer }}>
          <Image source={{ uri: track.artwork }} style={{ width: artworkSize, height: artworkSize, ...styles.artwork }} resizeMode="cover" />
          {track.isPlaying && (
            <View style={styles.playingIndicator}>
              <View style={styles.equalizerBar} />
              <View style={styles.equalizerBar} />
              <View style={styles.equalizerBar} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.artworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          {(track.isDownloading || track.isDownloaded) && (
            <View style={styles.downloadOverlay}>
              {track.isDownloading && (
                <View style={styles.downloadProgressContainer}>
                  <Animated.View
                    style={[
                      styles.downloadProgressBar,
                      { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                    ]}
                  />
                </View>
              )}
              {track.isDownloaded && (
                <View style={styles.downloadedBadge}>
                  <Ionicons name="checkmark" size={16} color={colors.success} />
                </View>
              )}
            </View>
          )}
        </View>
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, { color: colors.textPrimary }]} numberOfLines={1}>{track.title}</Text>
          <Text style={[styles.trackArtist, { color: colors.textMuted }]} numberOfLines={1}>{track.artist}</Text>
        </View>
        {track.duration && <Text style={[styles.trackDuration, { color: colors.textMuted }]}>{typeof track.duration === 'number' ? formatDuration(track.duration) : track.duration}</Text>}
        {track.url && (
          <TouchableOpacity onPress={handleDownload} style={styles.downloadButton} activeOpacity={0.7} accessibilityLabel={track.isDownloaded ? 'Eliminar descarga' : track.isDownloading ? 'Pausar descarga' : 'Descargar'}>
            {track.isDownloading ? (
              <Ionicons name="pause" size={20} color={colors.primary} />
            ) : track.isDownloaded ? (
              <Ionicons name="checkmark" size={20} color={colors.success} />
            ) : (
              <Ionicons name="cloud-download" size={20} color={colors.primary} />
            )}
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

interface AlbumCardProps {
  title: string;
  artist: string;
  artwork: string;
  year?: string;
  onPress: () => void;
  index?: number;
}

function AlbumCard({ title, artist, artwork, year, onPress, index = 0 }: AlbumCardProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const imageAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(imageAnim, {
        toValue: 1,
        duration: ANIMATION.duration.normal + index * 50,
        delay: index * 50,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      imageAnim.setValue(1);
    }
  }, [index, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.albumCard,
        { opacity: imageAnim, transform: [{ translateY: imageAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Álbum ${title} de ${artist}`}>
        <View style={styles.albumArtworkContainer}>
          <Image source={{ uri: artwork }} style={styles.albumArtwork} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.albumArtworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.albumPlayButton}>
            <Ionicons name="play" size={28} color={colors.textOnPrimary} />
          </View>
        </View>
        <View style={styles.albumInfo}>
          <Text style={[styles.albumTitle, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.albumArtist, { color: colors.textMuted }]} numberOfLines={1}>{artist}</Text>
          {year && <Text style={[styles.albumYear, { color: colors.textDisabled }]}>{year}</Text>}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface PlaylistCardProps {
  title: string;
  description: string;
  artwork: string;
  trackCount: number;
  onPress: () => void;
  index?: number;
}

function PlaylistCard({ title, description, artwork, trackCount, onPress, index = 0 }: PlaylistCardProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const imageAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(imageAnim, {
        toValue: 1,
        duration: ANIMATION.duration.normal + index * 50,
        delay: index * 50,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      imageAnim.setValue(1);
    }
  }, [index, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.playlistCard,
        { opacity: imageAnim, transform: [{ translateY: imageAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Lista ${title}, ${trackCount} canciones`}>
        <View style={styles.playlistArtworkContainer}>
          <Image source={{ uri: artwork }} style={styles.playlistArtwork} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.playlistArtworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.playlistPlayButton}>
            <Ionicons name="play" size={32} color={colors.textOnPrimary} />
          </View>
        </View>
        <View style={styles.playlistInfo}>
          <Text style={[styles.playlistTitle, { color: colors.textPrimary }]} numberOfLines={1}>{title}</Text>
          <Text style={[styles.playlistDescription, { color: colors.textMuted }]} numberOfLines={1}>{description}</Text>
          <Text style={[styles.playlistTrackCount, { color: colors.primary }]}>{trackCount} canciones</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface GenreChipProps {
  name: string;
  icon: string;
  color: string;
  onPress: () => void;
}

function GenreChip({ name, icon, color, onPress }: GenreChipProps) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.genreChip, { backgroundColor: `${color}15`, borderColor: `${color}40` }]} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Género ${name}`}>
      <View style={[styles.genreChipIcon, { backgroundColor: `${color}30` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.genreChipText, { color: colors.textPrimary }]}>{name}</Text>
    </TouchableOpacity>
  );
}

interface HeroActionProps {
  icon: string;
  label: string;
  primary?: boolean;
  onPress: () => void;
}

function HeroAction({ icon, label, primary = false, onPress }: HeroActionProps) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.heroAction, primary ? styles.heroActionPrimary : styles.heroActionSecondary]} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={label}>
      {primary && <LinearGradient colors={[colors.primary, colors.secondary]} style={styles.heroActionGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />}
      <View style={styles.heroActionContent}>
        <Ionicons name={icon as any} size={22} color={primary ? colors.textOnPrimary : colors.primary} />
        <Text style={[styles.heroActionText, { color: primary ? colors.textOnPrimary : colors.primary }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// HOME SCREEN
// ============================================

export function HomeScreen() {
  const colors = useColors();
  const isDark = useIsDark();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  // Mock data - in production this would come from services
  const recentTracks = [
    { id: '1', title: 'Midnight Drive', artist: 'Synthwave Dreams', album: 'Neon Nights', artwork: getMusicPlaceholder('track'), duration: 222, url: 'https://example.com/track1.mp3', quality: '320kbps' },
    { id: '2', title: 'Neon Nights', artist: 'Cyber Pulse', album: 'Digital Rain', artwork: getMusicPlaceholder('track'), duration: 255, url: 'https://example.com/track2.mp3', quality: '320kbps' },
    { id: '3', title: 'Digital Rain', artist: 'Void Walker', album: 'Void Walker EP', artwork: getMusicPlaceholder('track'), duration: 208, url: 'https://example.com/track3.mp3', quality: '320kbps' },
    { id: '4', title: 'Electric Heart', artist: 'Neon Genesis', album: 'Synthwave Chronicles', artwork: getMusicPlaceholder('track'), duration: 243, url: 'https://example.com/track4.mp3', quality: '320kbps' },
    { id: '5', title: 'Synthetic Dreams', artist: 'Digital Horizon', album: 'Future Sounds', artwork: getMusicPlaceholder('track'), duration: 198, url: 'https://example.com/track5.mp3', quality: '320kbps' },
  ];

  const recommendedAlbums = [
    { id: '1', title: 'Synthwave Chronicles', artist: 'Various Artists', artwork: getMusicPlaceholder('album'), year: '2024' },
    { id: '2', title: 'Cyberpunk 2077 OST', artist: 'Various Artists', artwork: getMusicPlaceholder('album'), year: '2020' },
    { id: '3', title: 'Retrowave Essentials', artist: 'Various Artists', artwork: getMusicPlaceholder('album'), year: '2023' },
    { id: '4', title: 'Dark Synth Vol. 1', artist: 'Perturbator', artwork: getMusicPlaceholder('album'), year: '2022' },
    { id: '5', title: 'Outrun', artist: 'Kavinsky', artwork: getMusicPlaceholder('album'), year: '2013' },
  ];

  const userPlaylists = [
    { id: '1', title: 'Late Night Coding', description: 'Focus beats for deep work', artwork: getMusicPlaceholder('playlist'), trackCount: 52 },
    { id: '2', title: 'Cyberpunk Vibes', description: 'Neon soaked synthwave', artwork: getMusicPlaceholder('playlist'), trackCount: 38 },
    { id: '3', title: 'Workout Energy', description: 'High BPM electronic', artwork: getMusicPlaceholder('playlist'), trackCount: 45 },
    { id: '4', title: 'Chill Sessions', description: 'Relaxed electronic vibes', artwork: getMusicPlaceholder('playlist'), trackCount: 31 },
  ];

  const genres = [
    { name: 'Synthwave', icon: 'radio', color: '#00d4ff' },
    { name: 'Cyberpunk', icon: 'flash', color: '#b84dff' },
    { name: 'Dark Synth', icon: 'moon-outline', color: '#ff2d75' },
    { name: 'Retrowave', icon: 'sunny-outline', color: '#ffaa00' },
    { name: 'Chillwave', icon: 'wine', color: '#00ff88' },
    { name: 'Vaporwave', icon: 'cloud', color: '#66e8ff' },
    { name: 'Darksynth', icon: 'skull', color: '#cc0052' },
    { name: 'Outrun', icon: 'car-sport', color: '#ff6b9d' },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[colors.primary]}
          progressBackgroundColor={colors.surface}
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* HERO SECTION */}
      <View style={[styles.heroSection, { backgroundColor: colors.surface }]}>
        <LinearGradient
          colors={colors.gradientNeon}
          style={styles.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <BlurView intensity={80} style={styles.heroBlur} />
        <View style={styles.heroContent}>
          <View style={styles.heroBadge}>
            <Ionicons name="sparkles" size={14} color={colors.primary} />
            <Text style={[styles.heroBadgeText, { color: colors.primary }]}>Vortex AI · Smart Mix</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Tu vortex musical</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Descubre, reproduce y descarga música con IA.
            Gratis, offline, sin límites.
          </Text>
          <View style={styles.heroActions}>
            <HeroAction icon="play-outline" label="Mix Inteligente" primary onPress={() => {}} />
            <HeroAction icon="shuffle-outline" label="Aleatorio" onPress={() => {}} />
            <HeroAction icon="radio-outline" label="Radio IA" onPress={() => {}} />
          </View>
        </View>
        <View style={styles.heroVisualizer}>
          <View style={styles.visualizerBars}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((_, i) => (
              <Animated.View key={i} style={[styles.visualizerBar, { backgroundColor: colors.primary }]} />
            ))}
          </View>
        </View>
      </View>

      {/* QUICK ACCESS - Genre Chips */}
      <View style={styles.quickAccessSection}>
        <SectionHeader title="Explorar por género" subtitle="Tus estilos favoritos" onPressSeeAll={() => {}} actionIcon="grid-outline" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
          {genres.map((genre, index) => (
            <GenreChip
              key={genre.name}
              name={genre.name}
              icon={genre.icon}
              color={genre.color}
              onPress={() => {}}
            />
          ))}
        </ScrollView>
      </View>

      {/* RECENTLY PLAYED */}
      <View style={styles.section}>
        <SectionHeader title="Reproduciendo recientemente" subtitle="Continúa donde lo dejaste" onPressSeeAll={() => {}} actionIcon="time-outline" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {recentTracks.map((track, index) => (
            <TrackCard
              key={track.id}
              track={{ ...track, isPlaying: index === 0 }}
              onPress={() => {}}
              index={index}
              onDownload={() => downloadService.startDownload({
                id: track.id,
                title: track.title,
                artist: track.artist,
                album: track.album,
                artwork: track.artwork,
                url: track.url,
                duration: track.duration,
                quality: track.quality,
              })}
            />
          ))}
        </ScrollView>
      </View>

      {/* MADE FOR YOU - Algorithmic recommendations */}
      <View style={styles.section}>
        <SectionHeader title="Hecho para ti" subtitle="Basado en tu historial de escucha" onPressSeeAll={() => {}} actionIcon="sparkles-outline" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {recommendedAlbums.map((album, index) => (
            <AlbumCard
              key={album.id}
              title={album.title}
              artist={album.artist}
              artwork={album.artwork}
              year={album.year}
              onPress={() => {}}
              index={index}
            />
          ))}
        </ScrollView>
      </View>

      {/* NEW RELEASES */}
      <View style={styles.section}>
        <SectionHeader title="Nuevos lanzamientos" subtitle="Lo último en tu biblioteca" onPressSeeAll={() => {}} actionIcon="newspaper-outline" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {recommendedAlbums.slice(0, 4).map((album, index) => (
            <AlbumCard
              key={album.id}
              title={album.title}
              artist={album.artist}
              artwork={album.artwork}
              year={album.year}
              onPress={() => {}}
              index={index}
            />
          ))}
        </ScrollView>
      </View>

      {/* USER PLAYLISTS */}
      <View style={styles.section}>
        <SectionHeader title="Tus listas de reproducción" subtitle="Creadas y guardadas" onPressSeeAll={() => {}} actionIcon="list-outline" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {userPlaylists.map((playlist, index) => (
            <PlaylistCard
              key={playlist.id}
              title={playlist.title}
              description={playlist.description}
              artwork={playlist.artwork}
              trackCount={playlist.trackCount}
              onPress={() => {}}
              index={index}
            />
          ))}
        </ScrollView>
      </View>

      {/* SMART MIXES - AI Generated */}
      <View style={styles.section}>
        <SectionHeader title="Mixes inteligentes" subtitle="Generados por Vortex AI" onPressSeeAll={() => {}} actionIcon="shuffle-outline" />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalList}>
          {[
            { title: 'Focus Flow', subtitle: 'Deep work session', color: '#00d4ff', icon: 'cube' },
            { title: 'Neon Nights', subtitle: 'Late night drive', color: '#b84dff', icon: 'moon' },
            { title: 'Energy Boost', subtitle: 'High intensity', color: '#ff2d75', icon: 'flash' },
            { title: 'Chill Vibes', subtitle: 'Relax & unwind', color: '#00ff88', icon: 'leaf' },
          ].map((mix, index) => (
            <TouchableOpacity key={mix.title} style={[styles.mixCard, { borderColor: `${mix.color}40` }]} onPress={() => {}} activeOpacity={0.8}>
              <View style={[styles.mixCardIcon, { backgroundColor: `${mix.color}20` }]}>
                <Ionicons name={mix.icon as any} size={28} color={mix.color} />
              </View>
              <View style={styles.mixCardInfo}>
                <Text style={[styles.mixCardTitle, { color: colors.textPrimary }]}>{mix.title}</Text>
                <Text style={[styles.mixCardSubtitle, { color: colors.textMuted }]}>{mix.subtitle}</Text>
              </View>
              <View style={[styles.mixCardPlay, { backgroundColor: mix.color }]}>
                <Ionicons name="play" size={20} color="#000" />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  sectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.xs,
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  horizontalList: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.md,
  },

  // Hero Section
  heroSection: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    marginBottom: SPACING.xl,
    height: 300,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.12,
  },
  heroBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    position: 'relative',
    zIndex: 1,
    padding: SPACING.xl,
    justifyContent: 'center',
    height: '100%',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.3)',
    alignSelf: 'flex-start',
    marginBottom: SPACING.md,
  },
  heroBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.fontSize.hero,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    lineHeight: TYPOGRAPHY.lineHeight.tight * TYPOGRAPHY.fontSize.hero,
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.lg,
    marginBottom: SPACING.lg,
    maxWidth: '85%',
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    overflow: 'hidden',
  },
  heroActionPrimary: {
    position: 'relative',
  },
  heroActionSecondary: {
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  heroActionGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroActionContent: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  heroActionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  heroVisualizer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.md,
    justifyContent: 'flex-end',
  },
  visualizerBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    justifyContent: 'center',
  },
  visualizerBar: {
    width: 4,
    height: 20,
    borderRadius: 2,
    opacity: 0.6,
  },

  // Quick Access / Genre Chips
  quickAccessSection: {
    marginBottom: SPACING.lg,
  },
  chipsContainer: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  genreChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  genreChipIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },

  // Track Card
  trackCard: {},
  trackCardInner: {
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  artworkContainer: {
    position: 'relative',
  },
  artwork: {
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
  },
  artworkGradient: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
  },
  playingIndicator: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    flexDirection: 'row',
    gap: 2,
    alignItems: 'flex-end',
    height: 16,
  },
  equalizerBar: {
    width: 3,
    backgroundColor: '#00d4ff',
    borderRadius: 1.5,
  },
  trackInfo: {
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  trackTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.xs,
  },
  trackArtist: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  trackDuration: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  downloadButton: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    padding: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: BORDER_RADIUS.round,
    zIndex: 10,
  },
  downloadOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  downloadProgressContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  downloadProgressBar: {
    height: '100%',
    backgroundColor: '#00d4ff',
  },
  downloadedBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    width: 24,
    height: 24,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: '#00ff88',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Album Card
  albumCard: {
    width: 170,
  },
  albumArtworkContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  albumArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  albumArtworkGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  albumPlayButton: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  albumInfo: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  albumTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.xs,
  },
  albumArtist: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  albumYear: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },

  // Playlist Card
  playlistCard: {
    width: 200,
  },
  playlistArtworkContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  playlistArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  playlistArtworkGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  playlistPlayButton: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  playlistInfo: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  playlistTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.xs,
  },
  playlistDescription: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginBottom: SPACING.xs,
  },
  playlistTrackCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },

  // Mix Card (AI Generated)
  mixCard: {
    width: 180,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    overflow: 'hidden',
    flexDirection: 'column',
  },
  mixCardIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    margin: SPACING.md,
    marginBottom: 0,
    alignSelf: 'flex-start',
  },
  mixCardInfo: {
    padding: SPACING.md,
    paddingBottom: SPACING.sm,
    flex: 1,
  },
  mixCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.xs,
  },
  mixCardSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  mixCardPlay: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  bottomSpacer: {
    height: 120,
  },
});