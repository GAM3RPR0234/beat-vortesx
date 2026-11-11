// Beat Vortex - Search Screen (Redesigned)
// Modern search with persistent bar, tabs, trending, and category exploration

import React from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Keyboard,
  Animated,
  Image,
  Platform,
  FlatList,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColors, useReducedMotion } from '@/hooks/useColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/constants/theme';
import { downloadService } from '@/services/downloadService';
import { Track } from '@/store/playerStore';
import { getMusicPlaceholder } from '@/utils/placeholderImages';

// ============================================
// TYPES
// ============================================

interface SearchResultTrack {
  id: string;
  title: string;
  artist: string;
  album: string;
  artwork: string;
  duration: number;
  url?: string;
  quality?: string;
}

interface SearchResultAlbum {
  id: string;
  title: string;
  artist: string;
  artwork: string;
  year: string;
  trackCount: number;
}

interface SearchResultArtist {
  id: string;
  name: string;
  artwork: string;
  followers: string;
  genres: string[];
}

interface SearchResultPlaylist {
  id: string;
  title: string;
  description: string;
  artwork: string;
  trackCount: number;
}

type SearchResultType = 'tracks' | 'albums' | 'artists' | 'playlists' | 'podcasts';

const RESULT_TABS: { key: SearchResultType; label: string; icon: string }[] = [
  { key: 'tracks', label: 'Canciones', icon: 'musical-notes' },
  { key: 'albums', label: 'Álbumes', icon: 'albums' },
  { key: 'artists', label: 'Artistas', icon: 'people' },
  { key: 'playlists', label: 'Listas', icon: 'list' },
  { key: 'podcasts', label: 'Podcasts', icon: 'podcast' },
];

// ============================================
// MOCK DATA
// ============================================

const mockSearchResults = {
  tracks: [
    { id: '1', title: 'Midnight Drive', artist: 'Synthwave Dreams', album: 'Neon Nights', artwork: getMusicPlaceholder('track'), duration: 222, url: 'https://example.com/st1.mp3', quality: '320kbps' },
    { id: '2', title: 'Neon Nights', artist: 'Cyber Pulse', album: 'Digital Rain', artwork: getMusicPlaceholder('track'), duration: 255, url: 'https://example.com/st2.mp3', quality: '320kbps' },
    { id: '3', title: 'Digital Rain', artist: 'Void Walker', album: 'Void Walker EP', artwork: getMusicPlaceholder('track'), duration: 208, url: 'https://example.com/st3.mp3', quality: '320kbps' },
    { id: '4', title: 'Electric Heart', artist: 'Neon Genesis', album: 'Synthwave Chronicles', artwork: getMusicPlaceholder('track'), duration: 243, url: 'https://example.com/st4.mp3', quality: '320kbps' },
    { id: '5', title: 'Synthetic Dreams', artist: 'Digital Horizon', album: 'Future Sounds', artwork: getMusicPlaceholder('track'), duration: 198, url: 'https://example.com/st5.mp3', quality: '320kbps' },
  ] as SearchResultTrack[],
  albums: [
    { id: '1', title: 'Synthwave Chronicles', artist: 'Various Artists', artwork: getMusicPlaceholder('album'), year: '2024', trackCount: 12 },
    { id: '2', title: 'Cyberpunk 2077 OST', artist: 'Various Artists', artwork: getMusicPlaceholder('album'), year: '2020', trackCount: 34 },
    { id: '3', title: 'Retrowave Essentials', artist: 'Various Artists', artwork: getMusicPlaceholder('album'), year: '2023', trackCount: 18 },
    { id: '4', title: 'Dark Synth Vol. 1', artist: 'Perturbator', artwork: getMusicPlaceholder('album'), year: '2022', trackCount: 10 },
  ] as SearchResultAlbum[],
  artists: [
    { id: '1', name: 'Perturbator', artwork: getMusicPlaceholder('artist'), followers: '1.2M', genres: ['Dark Synth', 'Cyberpunk'] },
    { id: '2', name: 'The Midnight', artwork: getMusicPlaceholder('artist'), followers: '890K', genres: ['Synthwave', 'Retrowave'] },
    { id: '3', name: 'Gunship', artwork: getMusicPlaceholder('artist'), followers: '567K', genres: ['Synthwave', 'Dreamsynth'] },
    { id: '4', name: 'Carpenter Brut', artwork: getMusicPlaceholder('artist'), followers: '756K', genres: ['Dark Synth', 'Synthwave'] },
    { id: '5', name: 'Timecop1983', artwork: getMusicPlaceholder('artist'), followers: '432K', genres: ['Dreamsynth', 'Chillwave'] },
  ] as SearchResultArtist[],
  playlists: [
    { id: '1', title: 'Late Night Coding', description: 'Focus beats for deep work', artwork: getMusicPlaceholder('playlist'), trackCount: 52 },
    { id: '2', title: 'Cyberpunk Vibes', description: 'Neon soaked synthwave', artwork: getMusicPlaceholder('playlist'), trackCount: 38 },
    { id: '3', title: 'Workout Energy', description: 'High BPM electronic', artwork: getMusicPlaceholder('playlist'), trackCount: 45 },
    { id: '4', title: 'Chill Sessions', description: 'Relaxed electronic vibes', artwork: getMusicPlaceholder('playlist'), trackCount: 31 },
  ] as SearchResultPlaylist[],
  podcasts: [
    { id: '1', title: 'Synthwave Weekly', author: 'Retro Radio', artwork: getMusicPlaceholder('podcast'), episodeCount: 156, latestEpisode: 'The Evolution of Dark Synth' },
    { id: '2', title: 'Cyberpunk Culture', author: 'Neon Network', artwork: getMusicPlaceholder('podcast'), episodeCount: 89, latestEpisode: 'Edgerunners Soundtrack Deep Dive' },
    { id: '3', title: 'Producer Spotlight', author: 'Studio Sessions', artwork: getMusicPlaceholder('podcast'), episodeCount: 203, latestEpisode: 'Interview with Perturbator' },
  ] as any[],
};

const recentSearches = [
  'synthwave',
  'cyberpunk music',
  'dark synth',
  'retrowave playlist',
  'the midnight',
  'perturbator',
  'gunship',
];

const trendingSearches = [
  'Synthwave 2024',
  'Cyberpunk Edgerunners OST',
  'Dark Synth Essentials',
  'Chillwave Vibes',
  'Vaporwave Aesthetic',
  'Dreamsynth Mix',
  'Outrun Radio',
  'Ambient Electronic',
];

const categoryGenres = [
  { name: 'Synthwave', icon: 'radio', color: '#00d4ff' },
  { name: 'Cyberpunk', icon: 'flash', color: '#b84dff' },
  { name: 'Dark Synth', icon: 'moon-outline', color: '#ff2d75' },
  { name: 'Retrowave', icon: 'sunny-outline', color: '#ffaa00' },
  { name: 'Chillwave', icon: 'wine', color: '#00ff88' },
  { name: 'Vaporwave', icon: 'cloud', color: '#66e8ff' },
  { name: 'Dreamsynth', icon: 'sparkles', color: '#cc66ff' },
  { name: 'Outrun', icon: 'car-sport', color: '#ff6b9d' },
];

// ============================================
// REUSABLE COMPONENTS
// ============================================

function SectionHeader({ title, count, onPressSeeAll }: { title: string; count: number; onPressSeeAll?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{count} resultados</Text>
      </View>
      {onPressSeeAll && (
        <TouchableOpacity onPress={onPressSeeAll} style={styles.seeAllButton}>
          <Text style={[styles.seeAllText, { color: colors.primary }]}>Ver todo</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function ResultSkeleton({ type }: { type: 'track' | 'album' | 'artist' | 'playlist' }) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: ANIMATION.easing.easeInOut }),
          Animated.timing(anim, { toValue: 0, duration: 1000, useNativeDriver: true, easing: ANIMATION.easing.easeInOut }),
        ])
      ).start();
    }
  }, [reducedMotion]);

  const shimmerOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View style={[
      styles.resultItem,
      { opacity: shimmerOpacity },
    ]}>
      <View style={styles.skeletonRow}>
        <View style={[
          styles.skeletonArtwork,
          { backgroundColor: colors.surfaceOverlay },
          type === 'artist' && { borderRadius: BORDER_RADIUS.round },
        ]} />
        <View style={styles.skeletonTextContainer}>
          <View style={[styles.skeletonLine, { width: '70%', height: 16, backgroundColor: colors.surfaceOverlay }]} />
          <View style={[styles.skeletonLine, { width: '45%', height: 12, backgroundColor: colors.surfaceOverlay, marginTop: SPACING.xs }]} />
        </View>
      </View>
    </Animated.View>
  );
}

interface TrackResultItemProps {
  item: SearchResultTrack;
  index: number;
  onPress?: () => void;
  onDownload?: () => void;
}

function TrackResultItem({ item, index, onPress, onDownload }: TrackResultItemProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isDownloaded, setIsDownloaded] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION.duration.normal,
        delay: index * 40,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(1);
    }
  }, [anim, index, reducedMotion]);

  React.useEffect(() => {
    if (isDownloading) {
      Animated.timing(progressAnim, {
        toValue: downloadProgress,
        duration: 300,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: false,
      }).start();
    }
  }, [downloadProgress, isDownloading]);

  const handleDownload = async (e: any) => {
    e.stopPropagation();
    if (item.url) {
      if (isDownloaded) return;
      setIsDownloading(true);
      setDownloadProgress(0);
      try {
        await downloadService.startDownload({
          id: item.id,
          title: item.title,
          artist: item.artist,
          album: item.album,
          artwork: item.artwork,
          url: item.url,
          duration: item.duration,
          quality: item.quality,
        });
        const interval = setInterval(() => {
          setDownloadProgress(p => {
            if (p >= 0.9) {
              clearInterval(interval);
              setIsDownloading(false);
              setIsDownloaded(true);
              return 1;
            }
            return p + 0.1;
          });
        }, 300);
      } catch (error) {
        setIsDownloading(false);
        console.error('Download failed:', error);
      }
    }
  };

  const pressScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.98, 1],
  });

  return (
    <Animated.View
      style={[
        styles.resultItem,
        { transform: [{ scale: pressScale }] },
      ]}
    >
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={styles.trackItem}
        accessibilityRole="button"
        accessibilityLabel={`${item.title} por ${item.artist}`}
      >
        <View style={styles.itemArtworkContainer}>
          <Image source={{ uri: item.artwork }} style={styles.itemArtwork} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={styles.itemArtworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.itemSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{item.artist} · {item.album}</Text>
        </View>
        <View style={styles.itemMeta}>
          <Text style={[styles.itemDuration, { color: colors.textMuted }]}>{formatDuration(item.duration)}</Text>
          {item.quality && <Text style={[styles.itemQuality, { color: colors.textDisabled }]}>{item.quality}</Text>}
        </View>
        {item.url && (
          <TouchableOpacity onPress={handleDownload} style={styles.downloadButton} activeOpacity={0.7} accessibilityLabel={isDownloaded ? 'Eliminar descarga' : isDownloading ? 'Pausar descarga' : 'Descargar'}>
            {isDownloading ? (
              <View style={styles.downloadProgressContainer}>
                <Animated.View
                  style={[
                    styles.downloadProgressBar,
                    { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                  ]}
                />
                <Ionicons name="pause" size={20} color={colors.primary} />
              </View>
            ) : isDownloaded ? (
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

interface AlbumResultItemProps {
  item: SearchResultAlbum;
  index: number;
  onPress?: () => void;
}

function AlbumResultItem({ item, index, onPress }: AlbumResultItemProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION.duration.normal,
        delay: index * 40,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(1);
    }
  }, [anim, index, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.resultItem,
        { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.albumItem} accessibilityRole="button" accessibilityLabel={`Álbum ${item.title} de ${item.artist}`}>
        <View style={styles.albumArtworkContainer}>
          <Image source={{ uri: item.artwork }} style={styles.albumArtwork} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.albumArtworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.albumPlayOverlay}>
            <Ionicons name="play" size={32} color={colors.textOnPrimary} />
          </View>
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.itemSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{item.artist} · {item.trackCount} canciones · {item.year}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface ArtistResultItemProps {
  item: SearchResultArtist;
  index: number;
  onPress?: () => void;
}

function ArtistResultItem({ item, index, onPress }: ArtistResultItemProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION.duration.normal,
        delay: index * 40,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(1);
    }
  }, [anim, index, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.resultItem,
        { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.artistItem} accessibilityRole="button" accessibilityLabel={`Artista ${item.name}`}>
        <View style={styles.artistArtworkContainer}>
          <Image source={{ uri: item.artwork }} style={styles.artistArtwork} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={styles.artistArtworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.itemSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{item.genres.join(', ')} · {item.followers} oyentes</Text>
        </View>
        <TouchableOpacity style={styles.itemAction}>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface PlaylistResultItemProps {
  item: SearchResultPlaylist;
  index: number;
  onPress?: () => void;
}

function PlaylistResultItem({ item, index, onPress }: PlaylistResultItemProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION.duration.normal,
        delay: index * 40,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(1);
    }
  }, [anim, index, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.resultItem,
        { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.playlistItem} accessibilityRole="button" accessibilityLabel={`Lista ${item.title}, ${item.trackCount} canciones`}>
        <View style={styles.playlistArtworkContainer}>
          <Image source={{ uri: item.artwork }} style={styles.playlistArtwork} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.playlistArtworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.playlistPlayOverlay}>
            <Ionicons name="play" size={32} color={colors.textOnPrimary} />
          </View>
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.itemSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{item.trackCount} canciones</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface PodcastResultItemProps {
  item: any;
  index: number;
  onPress?: () => void;
}

function PodcastResultItem({ item, index, onPress }: PodcastResultItemProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION.duration.normal,
        delay: index * 40,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(1);
    }
  }, [anim, index, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.resultItem,
        { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.podcastItem} accessibilityRole="button" accessibilityLabel={`Podcast ${item.title} por ${item.author}`}>
        <View style={styles.podcastArtworkContainer}>
          <Image source={{ uri: item.artwork }} style={styles.podcastArtwork} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            style={styles.podcastArtworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.podcastPlayOverlay}>
            <Ionicons name="play" size={32} color={colors.textOnPrimary} />
          </View>
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.itemSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{item.author} · {item.episodeCount} episodios</Text>
          <Text style={[styles.podcastLatest, { color: colors.textDisabled }]} numberOfLines={1}>Nuevo: {item.latestEpisode}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SearchSuggestions({ query, onSelect }: { query: string; onSelect: (suggestion: string) => void }) {
  const colors = useColors();
  if (!query || query.length < 2) return null;

  const suggestions = trendingSearches.filter(s =>
    s.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 5);

  if (suggestions.length === 0) return null;

  return (
    <View style={[styles.suggestionsContainer, { backgroundColor: colors.glassLight, borderColor: colors.border }]}>
      <Text style={[styles.suggestionsTitle, { color: colors.textMuted }]}>Sugerencias</Text>
      {suggestions.map((suggestion, index) => (
        <TouchableOpacity
          key={suggestion}
          style={styles.suggestionItem}
          onPress={() => onSelect(suggestion)}
        >
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <Text style={[styles.suggestionText, { color: colors.textSecondary }]}>{suggestion}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function CategoryChip({ name, icon, color, onPress }: { name: string; icon: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.categoryChip, { backgroundColor: `${color}15`, borderColor: `${color}40` }]} onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Categoría ${name}`}>
      <View style={[styles.categoryChipIcon, { backgroundColor: `${color}30` }]}>
        <Ionicons name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.categoryChipText, { color: colors.textPrimary }]}>{name}</Text>
    </TouchableOpacity>
  );
}

function RecentSearchItem({ query, onPress, onDelete }: { query: string; onPress: () => void; onDelete: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity
      style={[styles.recentItem, { backgroundColor: colors.surfaceOverlay, borderColor: colors.border }]}
      onPress={onPress}
    >
      <Ionicons name="time" size={20} color={colors.textMuted} />
      <Text style={[styles.recentText, { color: colors.textPrimary }]}>{query}</Text>
      <TouchableOpacity onPress={onDelete} style={styles.recentDeleteButton} activeOpacity={0.7} accessibilityLabel={`Eliminar ${query} del historial`}>
        <Ionicons name="close" size={18} color={colors.textDisabled} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function TrendingCard({ trend, index, onPress }: { trend: string; index: number; onPress: () => void }) {
  const colors = useColors();
  const hue = (index * 45) % 360;
  return (
    <TouchableOpacity
      style={[styles.trendingCard, { backgroundColor: colors.surfaceOverlay, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.trendingIcon, { backgroundColor: `hsl(${hue}, 70%, 50%, 0.2)` }]}>
        <Ionicons name="trending-up" size={22} color={colors.primary} />
      </View>
      <Text style={[styles.trendingText, { color: colors.textPrimary }]}>{trend}</Text>
    </TouchableOpacity>
  );
}

function EmptyState({ icon, title, subtitle, actionLabel, onAction }: { icon: string; title: string; subtitle: string; actionLabel?: string; onAction?: () => void }) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION.duration.slower,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(1);
    }
  }, [reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.emptyState,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}
    >
      <View style={[styles.emptyIcon, { backgroundColor: colors.glassLight, borderColor: colors.border }]}>
        <Ionicons name={icon as any} size={48} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.emptyAction, { backgroundColor: colors.primary }]} onPress={onAction} activeOpacity={0.8}>
          <Text style={[styles.emptyActionText, { color: colors.textOnPrimary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ============================================
// UTILITY
// ============================================

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ============================================
// SEARCH SCREEN
// ============================================

export function SearchScreen() {
  const colors = useColors();
  const [query, setQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [showResults, setShowResults] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<SearchResultType>('tracks');
  const [recentSearchesList, setRecentSearchesList] = React.useState([...recentSearches]);
  const searchInputRef = React.useRef<TextInput>(null);
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const handleSearch = () => {
    if (query.trim()) {
      Keyboard.dismiss();
      setIsSearching(true);
      setShowResults(true);
      // Add to recent searches
      setRecentSearchesList(prev => {
        const filtered = prev.filter(s => s.toLowerCase() !== query.toLowerCase());
        return [query.trim(), ...filtered].slice(0, 10);
      });
      setTimeout(() => setIsSearching(false), 800);
    }
  };

  const handleSuggestionPress = (suggestion: string) => {
    setQuery(suggestion);
    handleSearch();
  };

  const handleClear = () => {
    setQuery('');
    setShowResults(false);
    setActiveTab('tracks');
    searchInputRef.current?.focus();
  };

  const handleClearRecent = () => {
    setRecentSearchesList([]);
  };

  const handleDeleteRecent = (searchToDelete: string) => {
    setRecentSearchesList(prev => prev.filter(s => s !== searchToDelete));
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setRefreshing(false);
  }, []);

  const getCurrentResults = () => {
    switch (activeTab) {
      case 'tracks': return mockSearchResults.tracks;
      case 'albums': return mockSearchResults.albums;
      case 'artists': return mockSearchResults.artists;
      case 'playlists': return mockSearchResults.playlists;
      case 'podcasts': return mockSearchResults.podcasts;
    }
  };

  const renderResultItem = ({ item, index }: { item: any; index: number }) => {
    switch (activeTab) {
      case 'tracks':
        return <TrackResultItem item={item} index={index} />;
      case 'albums':
        return <AlbumResultItem item={item} index={index} />;
      case 'artists':
        return <ArtistResultItem item={item} index={index} />;
      case 'playlists':
        return <PlaylistResultItem item={item} index={index} />;
      case 'podcasts':
        return <PodcastResultItem item={item} index={index} />;
    }
  };

  const renderSkeleton = () => {
    switch (activeTab) {
      case 'tracks':
        return <ResultSkeleton type="track" />;
      case 'albums':
        return <ResultSkeleton type="album" />;
      case 'artists':
        return <ResultSkeleton type="artist" />;
      case 'playlists':
        return <ResultSkeleton type="playlist" />;
      case 'podcasts':
        return <ResultSkeleton type="playlist" />;
    }
  };

  const currentResults = getCurrentResults();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* PERSISTENT SEARCH BAR - Always visible at top */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <BlurView intensity={80} style={styles.headerBlur} />
        <View style={styles.headerContent}>
          <View style={[styles.searchContainer, { backgroundColor: colors.surfaceOverlay, borderColor: focused ? colors.primary : colors.border, borderWidth: focused ? 2 : 1 }]}>
            <Ionicons name="search" size={24} color={focused ? colors.primary : colors.textMuted} style={styles.searchIcon} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.textPrimary }]}
              placeholder="Buscar canciones, álbumes, artistas, podcasts..."
              value={query}
              onChangeText={setQuery}
              onFocus={() => { setFocused(true); setShowResults(false); }}
              onBlur={() => setFocused(false)}
              onSubmitEditing={handleSearch}
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {query && (
              <TouchableOpacity onPress={handleClear} style={styles.clearButton} activeOpacity={0.7} accessibilityLabel="Limpiar búsqueda">
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {!query && !focused && (
              <TouchableOpacity onPress={() => {}} style={styles.filterButton} activeOpacity={0.7} accessibilityLabel="Filtros">
                <Ionicons name="funnel-outline" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* RESULT TABS - Only show when searching */}
        {showResults && query && (
          <View style={styles.tabsContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabsContent}
            >
              {RESULT_TABS.map((tab) => (
                <TouchableOpacity
                  key={tab.key}
                  style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                  onPress={() => setActiveTab(tab.key)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityState={{ selected: activeTab === tab.key }}
                  accessibilityLabel={tab.label}
                >
                  <Ionicons name={tab.icon as any} size={20} color={activeTab === tab.key ? colors.primary : colors.textMuted} />
                  <Text style={[styles.tabLabel, activeTab === tab.key ? styles.tabLabelActive : styles.tabLabelInactive]}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      {/* MAIN CONTENT */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        {/* EXPLORE VIEW - When not searching */}
        {!showResults && !query && (
          <>
            {/* RECENT SEARCHES */}
            {recentSearchesList.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Búsquedas recientes</Text>
                  {recentSearchesList.length > 0 && (
                    <TouchableOpacity onPress={handleClearRecent} style={styles.clearAllButton}>
                      <Text style={[styles.clearAllText, { color: colors.primary }]}>Borrar todo</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.recentList}>
                  {recentSearchesList.map((search, index) => (
                    <RecentSearchItem
                      key={search}
                      query={search}
                      onPress={() => handleSuggestionPress(search)}
                      onDelete={() => handleDeleteRecent(search)}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* TRENDING SEARCHES */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tendencias ahora</Text>
              <View style={styles.trendingGrid}>
                {trendingSearches.map((trend, index) => (
                  <TrendingCard
                    key={trend}
                    trend={trend}
                    index={index}
                    onPress={() => handleSuggestionPress(trend)}
                  />
                ))}
              </View>
            </View>

            {/* EXPLORE CATEGORIES */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Explorar por género</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsContainer}>
                {categoryGenres.map((genre) => (
                  <CategoryChip
                    key={genre.name}
                    name={genre.name}
                    icon={genre.icon}
                    color={genre.color}
                    onPress={() => handleSuggestionPress(genre.name)}
                  />
                ))}
              </ScrollView>
            </View>

            {/* QUICK ACTIONS */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Acciones rápidas</Text>
              <View style={styles.quickActionsGrid}>
                {[
                  { label: 'Mix Aleatorio', icon: 'shuffle', color: colors.primary, action: () => {} },
                  { label: 'Radio IA', icon: 'radio', color: colors.secondary, action: () => {} },
                  { label: 'Nuevos Lanzamientos', icon: 'newspaper', color: colors.accent, action: () => {} },
                  { label: 'Descubrir Artistas', icon: 'people', color: colors.success, action: () => {} },
                ].map((action, index) => (
                  <TouchableOpacity key={action.label} style={[styles.quickActionCard, { borderColor: `${action.color}40` }]} onPress={action.action} activeOpacity={0.8}>
                    <View style={[styles.quickActionIcon, { backgroundColor: `${action.color}20` }]}>
                      <Ionicons name={action.icon as any} size={28} color={action.color} />
                    </View>
                    <Text style={[styles.quickActionLabel, { color: colors.textPrimary }]}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </>
        )}

        {/* RESULTS VIEW - When searching */}
        {showResults && query && (
          <>
            <SearchSuggestions query={query} onSelect={handleSuggestionPress} />

            {isSearching ? (
              <View style={[styles.loadingContainer, { backgroundColor: colors.surface }]}>
                <Ionicons name="refresh" size={32} color={colors.primary} style={styles.loadingSpinner} />
                <Text style={[styles.loadingText, { color: colors.textMuted }]}>Buscando...</Text>
                {/* Skeleton loaders while searching */}
                <View style={styles.skeletonList}>
                  {[0, 1, 2, 3, 4].map((_, i) => (
                    <React.Fragment key={i}>{renderSkeleton()}</React.Fragment>
                  ))}
                </View>
              </View>
            ) : currentResults.length === 0 ? (
              <EmptyState
                icon="search-outline"
                title="Sin resultados"
                subtitle={`No encontramos nada para "${query}". Intenta con otros términos.`}
                actionLabel="Limpiar búsqueda"
                onAction={handleClear}
              />
            ) : (
              <View style={styles.resultsList}>
                {currentResults.map((item, index) => (
                  <React.Fragment key={item.id}>{renderResultItem({ item, index })}</React.Fragment>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: 'relative',
    top: 0,
    zIndex: 100,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
  },
  headerBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    position: 'relative',
    zIndex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.round,
    paddingHorizontal: SPACING.md,
    height: 52,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    height: '100%',
  },
  clearButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  filterButton: {
    padding: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  tabsContainer: {
    marginTop: SPACING.md,
  },
  tabsContent: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderColor: 'rgba(0, 212, 255, 0.3)',
  },
  tabLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  tabLabelActive: {
    color: '#00d4ff',
  },
  tabLabelInactive: {
    color: '#78788c',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
    alignItems: 'center',
    marginBottom: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  sectionCount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  clearAllButton: {
    paddingVertical: SPACING.xs,
  },
  clearAllText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
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

  // Recent Searches
  recentList: {
    gap: SPACING.xs,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  recentText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    marginHorizontal: SPACING.md,
  },
  recentDeleteButton: {
    padding: SPACING.xs,
  },

  // Trending
  trendingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  trendingCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  trendingIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },

  // Category Chips
  chipsContainer: {
    gap: SPACING.sm,
    paddingHorizontal: SPACING.xs,
    paddingBottom: SPACING.xs,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  categoryChipIcon: {
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },

  // Quick Actions
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
  },
  quickActionCard: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  quickActionLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textAlign: 'center',
  },

  // Suggestions
  suggestionsContainer: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  suggestionsTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.sm,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  suggestionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },

  // Loading
  loadingContainer: {
    alignItems: 'center',
    padding: SPACING.xxxl,
    gap: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  loadingSpinner: {},
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  skeletonList: {
    width: '100%',
    marginTop: SPACING.lg,
  },

  // Results
  resultsList: {
    gap: SPACING.xs,
  },
  resultItem: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },

  // Track Item
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  itemArtworkContainer: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  itemArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  itemArtworkGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  itemSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginLeft: SPACING.md,
  },
  itemDuration: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  itemQuality: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.round,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  downloadProgressContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadProgressBar: {
    height: '100%',
    backgroundColor: '#00d4ff',
  },

  // Album Item
  albumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  albumArtworkContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  albumArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  albumArtworkGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  albumPlayOverlay: {
    position: 'absolute',
    bottom: SPACING.xs,
    right: SPACING.xs,
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },

  // Artist Item
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  artistArtworkContainer: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    overflow: 'hidden',
  },
  artistArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  artistArtworkGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  itemAction: {
    padding: SPACING.xs,
  },

  // Playlist Item
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  playlistArtworkContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  playlistArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  playlistArtworkGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  playlistPlayOverlay: {
    position: 'absolute',
    bottom: SPACING.xs,
    right: SPACING.xs,
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },

  // Podcast Item
  podcastItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  podcastArtworkContainer: {
    position: 'relative',
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  podcastArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  podcastArtworkGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  podcastPlayOverlay: {
    position: 'absolute',
    bottom: SPACING.xs,
    right: SPACING.xs,
    width: 32,
    height: 32,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: '#00d4ff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#00d4ff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  podcastLatest: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: SPACING.xxxl,
    gap: SPACING.md,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md,
    maxWidth: '80%',
  },
  emptyAction: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
  },
  emptyActionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },

  // Skeletons
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  skeletonArtwork: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.sm,
  },
  skeletonTextContainer: {
    flex: 1,
    gap: SPACING.xs,
  },
  skeletonLine: {
    borderRadius: BORDER_RADIUS.xs,
  },
});