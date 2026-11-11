// Beat Vortex - Library Screen (Redesigned)
// Modern library with 7 tabs, rich TrackRow with swipe actions, grid items, playlist management, history

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
  Animated,
  Platform,
  Alert,
  Share,
  SafeAreaView,
  TextInput,
  FlatList,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RootStackParamList = {
  Podcasts: undefined;
  PlaylistManager: undefined;
  // Other screens would be defined here
};
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColors, useReducedMotion } from '@/hooks/useColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/constants/theme';
import { useDownloadStore } from '@/store/downloadStore';
import { usePlayerStore } from '@/store/playerStore';
import { downloadService } from '@/services/downloadService';
import { historyService, HistoryEntry } from '@/services/historyService';
import { Track } from '@/store/playerStore';
import { musicCatalogService } from '@/services/musicCatalogService';
import { getMusicPlaceholder } from '@/utils/placeholderImages';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type LibraryTab = 'tracks' | 'albums' | 'artists' | 'playlists' | 'podcasts' | 'offline' | 'history';

// ============================================
// REUSABLE COMPONENTS
// ============================================

function TabButton({ label, isActive, onPress, count, icon }: {
  label: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
  icon?: string;
}) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const pressAnim = React.useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    if (!reducedMotion) {
      pressAnim.setValue(1);
      Animated.timing(pressAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
    onPress();
  };

  const pressScale = pressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.95],
  });

  return (
    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
      <TouchableOpacity
        style={[
          styles.tabButton,
          isActive && styles.tabButtonActive,
          { backgroundColor: isActive ? colors.primary + '20' : colors.surfaceOverlay, borderColor: isActive ? colors.primary : colors.border },
        ]}
        onPress={handlePress}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={label}
      >
        {icon && (
          <Ionicons name={icon as any} size={18} color={isActive ? colors.primary : colors.textMuted} style={{ marginRight: SPACING.xs }} />
        )}
        <Text style={[
          styles.tabButtonText,
          isActive ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
          { color: isActive ? colors.primary : colors.textSecondary },
        ]}>
          {label}
        </Text>
        {count !== undefined && count > 0 && (
          <View style={[
            styles.tabBadge,
            isActive && styles.tabBadgeActive,
            { backgroundColor: isActive ? colors.primary : colors.glassMedium },
          ]}>
            <Text style={[
              styles.tabBadgeText,
              isActive ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive,
              { color: isActive ? colors.textOnPrimary : colors.textMuted },
            ]}>
              {count > 999 ? '999+' : count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function SectionHeader({ title, subtitle, onPressSeeAll, actionIcon, count }: {
  title: string;
  subtitle?: string;
  onPressSeeAll?: () => void;
  actionIcon?: string;
  count?: number;
}) {
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
        {count !== undefined && <Text style={[styles.sectionCount, { color: colors.textDisabled }]}>{count} elementos</Text>}
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

function ResultSkeleton({ type }: { type: 'track' | 'album' | 'artist' | 'playlist' | 'podcast' }) {
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

  const isGrid = type === 'album' || type === 'artist' || type === 'playlist' || type === 'podcast';

  if (isGrid) {
    return (
      <Animated.View style={[
        styles.gridSkeleton,
        { opacity: shimmerOpacity },
      ]}>
        <View style={[
          styles.skeletonArtwork,
          { backgroundColor: colors.surfaceOverlay },
          type === 'artist' && { borderRadius: BORDER_RADIUS.round },
        ]} />
        <View style={styles.skeletonTextContainer}>
          <View style={[styles.skeletonLine, { width: '80%', height: 16, backgroundColor: colors.surfaceOverlay }]} />
          <View style={[styles.skeletonLine, { width: '50%', height: 12, backgroundColor: colors.surfaceOverlay, marginTop: SPACING.xs }]} />
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[
      styles.listSkeleton,
      { opacity: shimmerOpacity },
    ]}>
      <View style={styles.skeletonRow}>
        <View style={[
          styles.skeletonArtwork,
          { width: 48, height: 48, backgroundColor: colors.surfaceOverlay },
        ]} />
        <View style={styles.skeletonTextContainer}>
          <View style={[styles.skeletonLine, { width: '70%', height: 16, backgroundColor: colors.surfaceOverlay }]} />
          <View style={[styles.skeletonLine, { width: '45%', height: 12, backgroundColor: colors.surfaceOverlay, marginTop: SPACING.xs }]} />
        </View>
      </View>
    </Animated.View>
  );
}

interface TrackRowProps {
  track: Track & { isOffline?: boolean; isPlaying?: boolean };
  index: number;
  onPress: () => void;
  onMore: () => void;
  onDownload?: () => void;
  onAddToPlaylist?: () => void;
  onShare?: () => void;
  onDelete?: () => void;
  showNumber?: boolean;
  variant?: 'default' | 'compact';
}

function TrackRow({
  track,
  index,
  onPress,
  onMore,
  onDownload,
  onAddToPlaylist,
  onShare,
  onDelete,
  showNumber = true,
  variant = 'default',
}: TrackRowProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;
  const progressAnim = React.useRef(new Animated.Value(0)).current;
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [isDownloaded, setIsDownloaded] = React.useState(false);
  const [downloadProgress, setDownloadProgress] = React.useState(0);
  const [swipeAnim] = React.useState(new Animated.Value(0));

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION.duration.normal,
        delay: index * 30,
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
    if (track.url && onDownload) {
      if (isDownloaded) return;
      setIsDownloading(true);
      setDownloadProgress(0);
      try {
        await onDownload();
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

  const handleMore = (e: any) => {
    e.stopPropagation();
    onMore();
  };

  const swipeThreshold = 80;
  const swipeTranslateX = swipeAnim.interpolate({
    inputRange: [0, swipeThreshold],
    outputRange: [0, -swipeThreshold],
    extrapolate: 'clamp',
  });

  const actionButtons = [
    { icon: 'musical-notes', color: colors.primary, label: 'Cola', action: onPress },
    { icon: 'list', color: colors.secondary, label: 'Playlist', action: onAddToPlaylist },
    { icon: 'share', color: colors.success, label: 'Compartir', action: onShare },
    { icon: 'trash', color: colors.error, label: 'Eliminar', action: onDelete, destructive: true },
  ].filter(btn => btn.action);

  return (
    <Animated.View
      style={[
        styles.trackRow,
        { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <Animated.View
        style={[
          styles.trackRowMain,
          { transform: [{ translateX: swipeTranslateX }] },
        ]}
      >
        <TouchableOpacity onPress={handleMore} style={styles.moreButton} activeOpacity={0.7} accessibilityLabel="Más opciones">
          <Ionicons name="ellipsis-vertical" size={24} color={colors.textMuted} />
        </TouchableOpacity>

        {showNumber && (
          <View style={[
            styles.trackNumberContainer,
            track.isPlaying && styles.trackNumberPlaying,
          ]}>
            <Text style={[
              styles.trackNumber,
              track.isPlaying && styles.trackNumberPlayingText,
            ]}>
              {track.isPlaying ? (
                <Ionicons name="musical-note" size={14} color={colors.primary} />
              ) : (
                index + 1
              )}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={onPress}
          activeOpacity={0.7}
          style={styles.trackRowContent}
          accessibilityRole="button"
          accessibilityLabel={`${track.title} por ${track.artist}`}
        >
          <View style={styles.rowArtworkContainer}>
            <Image source={{ uri: track.artwork }} style={styles.rowArtwork} resizeMode="cover" />
            {track.isPlaying && (
              <View style={styles.playingIndicator}>
                <View style={styles.equalizerBar} />
                <View style={styles.equalizerBar} />
                <View style={styles.equalizerBar} />
              </View>
            )}
          </View>
          <View style={styles.trackRowInfo}>
            <Text style={[styles.trackRowTitle, { color: colors.textPrimary }]} numberOfLines={1}>{track.title}</Text>
            <Text style={[styles.trackRowSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
              {track.artist} · {track.album || 'Desconocido'}
            </Text>
          </View>
          {track.isOffline && (
            <View style={styles.offlineIndicator}>
              <Ionicons name="download" size={16} color={colors.success} />
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.itemMeta}>
          <Text style={[styles.trackRowDuration, { color: colors.textMuted }]}>{track.duration ? formatDuration(track.duration) : '--:--'}</Text>
          {track.quality && <Text style={[styles.itemQuality, { color: colors.textDisabled }]}>{track.quality}</Text>}
        </View>

        {track.url && (
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
      </Animated.View>

      {/* Swipe Actions */}
      <View style={styles.swipeActions} pointerEvents="box-none">
        {actionButtons.map((action, i) => (
          <TouchableOpacity
            key={action.icon}
            style={[
              styles.swipeAction,
              { backgroundColor: action.color },
              i === actionButtons.length - 1 && styles.swipeActionLast,
            ]}
            onPress={() => {
              swipeAnim.setValue(0);
              action.action?.();
            }}
            activeOpacity={0.8}
            accessibilityLabel={action.label}
          >
            <Ionicons name={action.icon as any} size={24} color={action.destructive ? colors.textOnPrimary : '#000'} />
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}

interface AlbumGridItemProps {
  album: { id: string; title: string; artist: string; artwork: string; year: string; trackCount: number; isOffline?: boolean };
  index: number;
  onPress: () => void;
  onMore?: () => void;
}

function AlbumGridItem({ album, index, onPress, onMore }: AlbumGridItemProps) {
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

  const pressScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.95, 1],
  });

  return (
    <Animated.View
      style={[
        styles.albumGridItem,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }, { scale: pressScale }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Álbum ${album.title} de ${album.artist}`}>
        <View style={styles.albumGridArtworkContainer}>
          <Image source={{ uri: album.artwork }} style={styles.albumGridArtwork} resizeMode="cover" />
          {album.isOffline && (
            <View style={styles.offlineBadge}>
              <Ionicons name="download" size={14} color={colors.textOnPrimary} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.albumGridGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.albumPlayOverlay}>
            <Ionicons name="play" size={32} color={colors.textOnPrimary} />
          </View>
          {onMore && (
            <TouchableOpacity onPress={onMore} style={styles.moreOverlay} activeOpacity={0.7} accessibilityLabel="Más opciones">
              <Ionicons name="ellipsis-vertical" size={24} color={colors.textOnPrimary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.albumGridInfo}>
          <Text style={[styles.albumGridTitle, { color: colors.textPrimary }]} numberOfLines={1}>{album.title}</Text>
          <Text style={[styles.albumGridArtist, { color: colors.textMuted }]} numberOfLines={1}>{album.artist}</Text>
          <Text style={[styles.albumGridMeta, { color: colors.textDisabled }]}>{album.trackCount} canciones · {album.year}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface ArtistGridItemProps {
  artist: { id: string; name: string; artwork: string; trackCount: number; albumCount: number; genres?: string[] };
  index: number;
  onPress: () => void;
  onMore?: () => void;
}

function ArtistGridItem({ artist, index, onPress, onMore }: ArtistGridItemProps) {
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
        styles.artistGridItem,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Artista ${artist.name}`}>
        <View style={styles.artistGridArtworkContainer}>
          <Image source={{ uri: artist.artwork }} style={styles.artistGridArtwork} resizeMode="cover" />
          {onMore && (
            <TouchableOpacity onPress={onMore} style={styles.moreOverlay} activeOpacity={0.7} accessibilityLabel="Más opciones">
              <Ionicons name="ellipsis-vertical" size={24} color={colors.textOnPrimary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.artistGridInfo}>
          <Text style={[styles.artistGridName, { color: colors.textPrimary }]} numberOfLines={1}>{artist.name}</Text>
          <Text style={[styles.artistGridMeta, { color: colors.textMuted }]}>{artist.trackCount} canciones · {artist.albumCount} álbumes</Text>
          {artist.genres && artist.genres.length > 0 && (
            <View style={styles.artistGenres}>
              {artist.genres.slice(0, 2).map((genre, i) => (
                <Text key={genre} style={[styles.artistGenreTag, { color: colors.primary }]}>{genre}</Text>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface PlaylistGridItemProps {
  playlist: { id: string; title: string; description: string; artwork: string; trackCount: number; isOffline?: boolean };
  index: number;
  onPress: () => void;
  onMore?: () => void;
}

function PlaylistGridItem({ playlist, index, onPress, onMore }: PlaylistGridItemProps) {
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
        styles.playlistGridItem,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Lista ${playlist.title}, ${playlist.trackCount} canciones`}>
        <View style={styles.playlistGridArtworkContainer}>
          <Image source={{ uri: playlist.artwork }} style={styles.playlistGridArtwork} resizeMode="cover" />
          {playlist.isOffline && (
            <View style={styles.offlineBadge}>
              <Ionicons name="download" size={14} color={colors.textOnPrimary} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.playlistGridGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.playlistPlayOverlay}>
            <Ionicons name="play" size={36} color={colors.textOnPrimary} />
          </View>
          {onMore && (
            <TouchableOpacity onPress={onMore} style={styles.moreOverlay} activeOpacity={0.7} accessibilityLabel="Más opciones">
              <Ionicons name="ellipsis-vertical" size={24} color={colors.textOnPrimary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.playlistGridInfo}>
          <Text style={[styles.playlistGridTitle, { color: colors.textPrimary }]} numberOfLines={1}>{playlist.title}</Text>
          <Text style={[styles.playlistGridMeta, { color: colors.textMuted }]}>{playlist.trackCount} canciones</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface PodcastGridItemProps {
  podcast: { id: string; title: string; author: string; artwork: string; episodeCount: number; latestEpisode: string; isSubscribed?: boolean };
  index: number;
  onPress: () => void;
  onMore?: () => void;
}

function PodcastGridItem({ podcast, index, onPress, onMore }: PodcastGridItemProps) {
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
        styles.podcastGridItem,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={`Podcast ${podcast.title} por ${podcast.author}`}>
        <View style={styles.podcastGridArtworkContainer}>
          <Image source={{ uri: podcast.artwork }} style={styles.podcastGridArtwork} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.podcastGridGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.podcastPlayOverlay}>
            <Ionicons name="play" size={36} color={colors.textOnPrimary} />
          </View>
          {onMore && (
            <TouchableOpacity onPress={onMore} style={styles.moreOverlay} activeOpacity={0.7} accessibilityLabel="Más opciones">
              <Ionicons name="ellipsis-vertical" size={24} color={colors.textOnPrimary} />
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.podcastGridInfo}>
          <Text style={[styles.podcastGridTitle, { color: colors.textPrimary }]} numberOfLines={1}>{podcast.title}</Text>
          <Text style={[styles.podcastGridAuthor, { color: colors.textMuted }]} numberOfLines={1}>{podcast.author}</Text>
          <Text style={[styles.podcastGridMeta, { color: colors.textDisabled }]}>{podcast.episodeCount} episodios</Text>
          <Text style={[styles.podcastLatest, { color: colors.textDisabled }]} numberOfLines={1}>Nuevo: {podcast.latestEpisode}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface OfflineItemProps {
  track: Track;
  index: number;
  onPress: () => void;
  onDelete: () => void;
  onShare: () => void;
  onMore?: () => void;
}

function OfflineItem({ track, index, onPress, onDelete, onShare, onMore }: OfflineItemProps) {
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

  const downloadTask = downloadService.getAllTasks().find(t => t.track.id === track.id && t.status === 'completed');

  return (
    <Animated.View
      style={[
        styles.offlineItem,
        { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.offlineItemMain} accessibilityRole="button" accessibilityLabel={`${track.title} por ${track.artist}`}>
        <Image source={{ uri: track.artwork }} style={styles.itemArtwork} resizeMode="cover" />
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: colors.textPrimary }]} numberOfLines={1}>{track.title}</Text>
          <Text style={[styles.itemSubtitle, { color: colors.textMuted }]} numberOfLines={1}>{track.artist} · {track.album}</Text>
          <View style={styles.offlineItemMeta}>
            <Text style={[styles.metaItem, { color: colors.textDisabled }]}>
              <Ionicons name="musical-note" size={12} color={colors.textDisabled} style={{ marginRight: SPACING.xs }} />
              {track.quality || '320kbps'}
            </Text>
            {downloadTask && (
              <Text style={[styles.metaItem, { color: colors.textDisabled }]}>
                <Ionicons name="document" size={12} color={colors.textDisabled} style={{ marginRight: SPACING.xs }} />
                {downloadService.formatBytes(downloadTask.totalBytes)}
              </Text>
            )}
            <Text style={[styles.metaItem, { color: colors.success }]}>
              <Ionicons name="download" size={12} color={colors.success} style={{ marginRight: SPACING.xs }} />
              Disponible offline
            </Text>
          </View>
        </View>
        <View style={styles.itemActions}>
          {onMore && (
            <TouchableOpacity onPress={onMore} style={styles.actionButton} activeOpacity={0.7} accessibilityLabel="Más opciones">
              <Ionicons name="ellipsis-vertical" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onShare} style={styles.actionButton} activeOpacity={0.7} accessibilityLabel="Compartir">
            <Ionicons name="share" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onDelete} style={styles.deleteButton} activeOpacity={0.7} accessibilityLabel="Eliminar descarga">
            <Ionicons name="trash" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

interface HistoryItemProps {
  item: {
    id: string;
    title: string;
    artist: string;
    album: string;
    artwork: string;
    playedAt: Date;
    progress: number;
    source: string;
    duration: number;
  };
  index: number;
  onPress: () => void;
  onMore?: () => void;
}

function HistoryItem({ item, index, onPress, onMore }: HistoryItemProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION.duration.normal,
        delay: index * 30,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(1);
    }
  }, [anim, index, reducedMotion]);

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora mismo';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} h`;
    if (diffDays < 7) return `Hace ${diffDays} d`;
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
  };

  return (
    <Animated.View
      style={[
        styles.historyItem,
        { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-15, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.historyItemMain} accessibilityRole="button" accessibilityLabel={`${item.title} por ${item.artist}, reproducido ${formatTimeAgo(item.playedAt)}`}>
        <View style={styles.rowArtworkContainer}>
          <Image source={{ uri: item.artwork }} style={styles.rowArtwork} resizeMode="cover" />
          {item.progress > 0 && item.progress < 1 && (
            <View style={styles.progressOverlay}>
              <Animated.View
                style={[
                  styles.progressBar,
                  { width: `${item.progress * 100}%` },
                ]}
              />
            </View>
          )}
        </View>
        <View style={styles.historyInfo}>
          <Text style={[styles.historyTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
          <Text style={[styles.historySubtitle, { color: colors.textMuted }]} numberOfLines={1}>{item.artist} · {item.album}</Text>
          <View style={styles.historyMeta}>
            <Text style={[styles.metaItem, { color: colors.textDisabled }]}>
              <Ionicons name="time" size={12} color={colors.textDisabled} style={{ marginRight: SPACING.xs }} />
              {formatTimeAgo(item.playedAt)}
            </Text>
            <Text style={[styles.metaItem, { color: colors.textDisabled }]}>
              <Ionicons name="musical-notes" size={12} color={colors.textDisabled} style={{ marginRight: SPACING.xs }} />
              {item.source}
            </Text>
            {item.progress > 0 && item.progress < 1 && (
              <Text style={[styles.metaItem, { color: colors.primary }]}>
                <Ionicons name="pause" size={12} color={colors.primary} style={{ marginRight: SPACING.xs }} />
                {Math.round(item.progress * 100)}%
              </Text>
            )}
          </View>
        </View>
        {onMore && (
          <TouchableOpacity onPress={onMore} style={styles.moreButton} activeOpacity={0.7} accessibilityLabel="Más opciones">
            <Ionicons name="ellipsis-vertical" size={22} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function EmptyState({ icon, title, subtitle, actionLabel, onAction, illustration }: {
  icon: string;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onAction?: () => void;
  illustration?: React.ReactNode;
}) {
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
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] },
      ]}
    >
      {illustration || (
        <View style={[styles.emptyIcon, { backgroundColor: colors.glassLight, borderColor: colors.border }]}>
          <Ionicons name={icon as any} size={56} color={colors.primary} />
        </View>
      )}
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

function QuickActionCard({ label, icon, color, onPress }: { label: string; icon: string; color: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <TouchableOpacity style={[styles.quickActionCard, { borderColor: `${color}40` }]} onPress={onPress} activeOpacity={0.8} accessibilityLabel={label}>
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={28} color={color} />
      </View>
      <Text style={[styles.quickActionLabel, { color: colors.textPrimary }]}>{label}</Text>
    </TouchableOpacity>
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

// Mock data
const mockAlbums = [
  { id: '1', title: 'Synthwave Chronicles', artist: 'Various Artists', artwork: getMusicPlaceholder('album'), year: '2024', trackCount: 12, isOffline: false, genres: ['Synthwave', 'Retrowave'] },
  { id: '2', title: 'Cyberpunk 2077 OST', artist: 'Various Artists', artwork: getMusicPlaceholder('album'), year: '2020', trackCount: 34, isOffline: false, genres: ['Dark Synth', 'Cyberpunk'] },
  { id: '3', title: 'Retrowave Essentials', artist: 'Various Artists', artwork: getMusicPlaceholder('album'), year: '2023', trackCount: 18, isOffline: true, genres: ['Retrowave', 'Outrun'] },
  { id: '4', title: 'Dark Synth Vol. 1', artist: 'Perturbator', artwork: getMusicPlaceholder('album'), year: '2022', trackCount: 10, isOffline: false, genres: ['Dark Synth'] },
  { id: '5', title: 'Outrun', artist: 'Kavinsky', artwork: getMusicPlaceholder('album'), year: '2013', trackCount: 14, isOffline: false, genres: ['Outrun', 'Synthwave'] },
  { id: '6', title: 'Dangerous Days', artist: 'Perturbator', artwork: getMusicPlaceholder('album'), year: '2014', trackCount: 17, isOffline: false, genres: ['Dark Synth', 'Cyberpunk'] },
];

const mockArtists = [
  { id: '1', name: 'Perturbator', artwork: getMusicPlaceholder('artist'), trackCount: 45, albumCount: 8, genres: ['Dark Synth', 'Cyberpunk'] },
  { id: '2', name: 'The Midnight', artwork: getMusicPlaceholder('artist'), trackCount: 38, albumCount: 6, genres: ['Synthwave', 'Retrowave', 'Dreamsynth'] },
  { id: '3', name: 'Gunship', artwork: getMusicPlaceholder('artist'), trackCount: 29, albumCount: 5, genres: ['Synthwave', 'Dreamsynth'] },
  { id: '4', name: 'Carpenter Brut', artwork: getMusicPlaceholder('artist'), trackCount: 33, albumCount: 7, genres: ['Dark Synth', 'Synthwave', 'Metal'] },
  { id: '5', name: 'Timecop1983', artwork: getMusicPlaceholder('artist'), trackCount: 24, albumCount: 4, genres: ['Dreamsynth', 'Chillwave'] },
  { id: '6', name: 'FM-84', artwork: getMusicPlaceholder('artist'), trackCount: 19, albumCount: 3, genres: ['Retrowave', 'Synthwave'] },
];

const mockPlaylists = [
  { id: '1', title: 'Late Night Coding', description: 'Focus beats for deep work', artwork: getMusicPlaceholder('playlist'), trackCount: 52, isOffline: false },
  { id: '2', title: 'Cyberpunk Vibes', description: 'Neon soaked synthwave', artwork: getMusicPlaceholder('playlist'), trackCount: 38, isOffline: true },
  { id: '3', title: 'Workout Energy', description: 'High BPM electronic', artwork: getMusicPlaceholder('playlist'), trackCount: 45, isOffline: false },
  { id: '4', title: 'Chill Sessions', description: 'Relaxed electronic vibes', artwork: getMusicPlaceholder('playlist'), trackCount: 31, isOffline: false },
  { id: '5', title: 'Dark Synth Essentials', description: 'Heavy electronic for late nights', artwork: getMusicPlaceholder('playlist'), trackCount: 27, isOffline: true },
  { id: '6', title: 'Retrowave Sunset', description: '80s nostalgia driving music', artwork: getMusicPlaceholder('playlist'), trackCount: 34, isOffline: false },
];

const mockPodcasts = [
  { id: '1', title: 'Synthwave Weekly', author: 'Retro Radio', artwork: getMusicPlaceholder('podcast'), episodeCount: 156, latestEpisode: 'The Evolution of Dark Synth', isSubscribed: true },
  { id: '2', title: 'Cyberpunk Culture', author: 'Neon Network', artwork: getMusicPlaceholder('podcast'), episodeCount: 89, latestEpisode: 'Edgerunners Soundtrack Deep Dive', isSubscribed: true },
  { id: '3', title: 'Producer Spotlight', author: 'Studio Sessions', artwork: getMusicPlaceholder('podcast'), episodeCount: 203, latestEpisode: 'Interview with Perturbator', isSubscribed: false },
  { id: '4', title: 'Synth History', author: 'Analog Archives', artwork: getMusicPlaceholder('podcast'), episodeCount: 67, latestEpisode: 'The Yamaha DX7 Story', isSubscribed: false },
];

const mockHistory = [
  { id: 'h1', title: 'Midnight Drive', artist: 'Synthwave Dreams', album: 'Neon Nights', artwork: getMusicPlaceholder('track'), playedAt: new Date(Date.now() - 1000 * 60 * 5), progress: 1, source: 'Biblioteca', duration: 222 },
  { id: 'h2', title: 'Neon Nights', artist: 'Cyber Pulse', album: 'Digital Rain', artwork: getMusicPlaceholder('track'), playedAt: new Date(Date.now() - 1000 * 60 * 30), progress: 1, source: 'Mix Inteligente', duration: 255 },
  { id: 'h3', title: 'Digital Rain', artist: 'Void Walker', album: 'Void Walker EP', artwork: getMusicPlaceholder('track'), playedAt: new Date(Date.now() - 1000 * 60 * 60 * 2), progress: 0.65, source: 'Radio IA', duration: 208 },
  { id: 'h4', title: 'Electric Heart', artist: 'Neon Genesis', album: 'Synthwave Chronicles', artwork: getMusicPlaceholder('track'), playedAt: new Date(Date.now() - 1000 * 60 * 60 * 5), progress: 1, source: 'Biblioteca', duration: 243 },
  { id: 'h5', title: 'Synthetic Dreams', artist: 'Digital Horizon', album: 'Future Sounds', artwork: getMusicPlaceholder('track'), playedAt: new Date(Date.now() - 1000 * 60 * 60 * 24), progress: 1, source: 'Playlist: Cyberpunk Vibes', duration: 198 },
  { id: 'h6', title: 'Neon Horizon', artist: 'Timecop1983', album: 'Neon Horizon EP', artwork: getMusicPlaceholder('track'), playedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), progress: 1, source: 'Explorar', duration: 267 },
  { id: 'h7', title: 'Digital Dawn', artist: 'The Midnight', album: 'Heroes', artwork: getMusicPlaceholder('track'), playedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), progress: 1, source: 'Novedades', duration: 312 },
  { id: 'h8', title: 'Synthetic Love', artist: 'Gunship', album: 'Unicorn', artwork: getMusicPlaceholder('track'), playedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), progress: 0.4, source: 'Radio IA', duration: 289 },
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
// LIBRARY SCREEN
// ============================================

export function LibraryScreen() {
  const colors = useColors();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeTab, setActiveTab] = React.useState<LibraryTab>('tracks');
  const [refreshing, setRefreshing] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [isSearching, setIsSearching] = React.useState(false);
  const [showSearch, setShowSearch] = React.useState(false);
  const [historyEntries, setHistoryEntries] = React.useState<HistoryEntry[]>([]);

  const { completedDownloads, isDownloaded } = useDownloadStore();
  const { setQueue, setCurrentTrack, play, currentTrack, queue } = usePlayerStore();

  const offlineTracks = completedDownloads;
  const offlineCount = offlineTracks.length;

  // Subscribe to history changes
  React.useEffect(() => {
    historyService.initialize();
    const unsubscribe = historyService.subscribe(setHistoryEntries);
    // Initial load
    setHistoryEntries(historyService.getHistory());
    return unsubscribe;
  }, []);

  const tabs: { key: LibraryTab; label: string; count: number; icon?: string }[] = [
    { key: 'tracks', label: 'Canciones', count: offlineCount + 20, icon: 'musical-notes' },
    { key: 'albums', label: 'Álbumes', count: mockAlbums.length, icon: 'albums' },
    { key: 'artists', label: 'Artistas', count: mockArtists.length, icon: 'person' },
    { key: 'playlists', label: 'Playlists', count: mockPlaylists.length, icon: 'list' },
    { key: 'podcasts', label: 'Podcasts', count: mockPodcasts.length, icon: 'podcast' },
    { key: 'offline', label: 'Offline', count: offlineCount, icon: 'download' },
    { key: 'history', label: 'Historial', count: historyEntries.length, icon: 'time' },
  ];

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleTabPress = (tabKey: LibraryTab) => {
    if (tabKey === 'podcasts') {
      navigation.navigate('Podcasts');
    } else if (tabKey === 'playlists') {
      navigation.navigate('PlaylistManager');
    } else {
      setActiveTab(tabKey);
    }
  };

  const handlePlayTrack = (track: Track, index: number, trackList: Track[]) => {
    setQueue(trackList, index);
    setCurrentTrack(track);
    play();
  };

  const handleDeleteOffline = (trackId: string) => {
    Alert.alert(
      'Eliminar descarga',
      '¿Quieres eliminar esta pista del almacenamiento local?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => {
            const task = downloadService.getAllTasks().find(t => t.track.id === trackId && t.status === 'completed');
            if (task) {
              downloadService.deleteDownload(task.id);
            }
          }
        },
      ]
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'tracks': {
        const allTracks: (Track & { isOffline?: boolean; isPlaying?: boolean })[] = [
          ...offlineTracks.map(t => ({ ...t, isOffline: true, isPlaying: currentTrack?.id === t.id })),
          { id: 't1', title: 'Midnight Drive', artist: 'Synthwave Dreams', album: 'Neon Nights', artwork: getMusicPlaceholder('track'), duration: 222, quality: '320kbps', isOffline: false, isPlaying: currentTrack?.id === 't1', url: 'https://example.com/t1.mp3' },
          { id: 't2', title: 'Neon Nights', artist: 'Cyber Pulse', album: 'Digital Rain', artwork: getMusicPlaceholder('track'), duration: 255, quality: '320kbps', isOffline: false, isPlaying: currentTrack?.id === 't2', url: 'https://example.com/t2.mp3' },
          { id: 't3', title: 'Digital Rain', artist: 'Void Walker', album: 'Void Walker EP', artwork: getMusicPlaceholder('track'), duration: 208, quality: '320kbps', isOffline: false, isPlaying: currentTrack?.id === 't3', url: 'https://example.com/t3.mp3' },
          { id: 't4', title: 'Electric Heart', artist: 'Neon Genesis', album: 'Synthwave Chronicles', artwork: getMusicPlaceholder('track'), duration: 243, quality: '320kbps', isOffline: false, isPlaying: currentTrack?.id === 't4', url: 'https://example.com/t4.mp3' },
          { id: 't5', title: 'Synthetic Dreams', artist: 'Digital Horizon', album: 'Future Sounds', artwork: getMusicPlaceholder('track'), duration: 198, quality: '320kbps', isOffline: false, isPlaying: currentTrack?.id === 't5', url: 'https://example.com/t5.mp3' },
        ];
        return (
          <View style={styles.tracksList}>
            {allTracks.map((track, index) => (
              <TrackRow
                key={track.id}
                track={track}
                index={index}
                onPress={() => handlePlayTrack(track, index, allTracks)}
                onMore={() => {}}
                onDownload={() => downloadService.startDownload({
                  id: track.id,
                  title: track.title,
                  artist: track.artist,
                  album: track.album,
                  artwork: track.artwork,
                  url: track.url!,
                  duration: track.duration,
                  quality: track.quality,
                })}
                onAddToPlaylist={() => {}}
                onShare={() => Share.share({ title: track.title, message: track.artist })}
                onDelete={track.isOffline ? () => handleDeleteOffline(track.id) : undefined}
              />
            ))}
          </View>
        );
      }
      case 'albums':
        return (
          <View style={styles.gridContainer}>
            {mockAlbums.map((album, index) => (
              <AlbumGridItem
                key={album.id}
                album={album}
                index={index}
                onPress={() => {}}
                onMore={() => {}}
              />
            ))}
          </View>
        );
      case 'artists':
        return (
          <View style={styles.gridContainer}>
            {mockArtists.map((artist, index) => (
              <ArtistGridItem key={artist.id} artist={artist} index={index} onPress={() => {}} onMore={() => {}} />
            ))}
          </View>
        );
      case 'playlists':
        // Playlists tab now navigates to PlaylistManager screen
        // This case is handled in handleTabPress, but keep fallback
        return (
          <View style={styles.gridContainer}>
            {mockPlaylists.map((playlist, index) => (
              <PlaylistGridItem key={playlist.id} playlist={playlist} index={index} onPress={() => {}} onMore={() => {}} />
            ))}
          </View>
        );
      case 'podcasts':
        return (
          <View style={styles.gridContainer}>
            {mockPodcasts.map((podcast, index) => (
              <PodcastGridItem key={podcast.id} podcast={podcast} index={index} onPress={() => {}} onMore={() => {}} />
            ))}
          </View>
        );
      case 'offline':
        return (
          offlineTracks.length === 0 ? (
            <EmptyState
              icon="download"
              title="Sin música offline"
              subtitle="Descarga tus pistas favoritas para escucharlas sin conexión"
              actionLabel="Ir a Descargas"
              onAction={() => {}}
            />
          ) : (
            <View style={styles.offlineList}>
              {offlineTracks.map((track, index) => (
                <OfflineItem
                  key={track.id}
                  track={track}
                  index={index}
                  onPress={() => handlePlayTrack(track, index, offlineTracks)}
                  onDelete={() => handleDeleteOffline(track.id)}
                  onShare={() => Share.share({ title: track.title, message: track.artist })}
                  onMore={() => {}}
                />
              ))}
            </View>
          )
        );
      case 'history':
        return (
          historyEntries.length === 0 ? (
            <EmptyState
              icon="time"
              title="Historial vacío"
              subtitle="Tu historial de reproducción aparecerá aquí"
            />
          ) : (
            <View style={styles.historyList}>
              {historyEntries.map((entry, index) => (
                <HistoryItem
                  key={entry.id}
                  item={{
                    id: entry.id,
                    title: entry.track.title,
                    artist: entry.track.artist,
                    album: entry.track.album,
                    artwork: entry.track.artwork,
                    playedAt: new Date(entry.playedAt),
                    progress: entry.progress,
                    source: entry.source,
                    duration: entry.duration,
                  }}
                  index={index}
                  onPress={() => {}}
                  onMore={() => {}}
                />
              ))}
            </View>
          )
        );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER WITH BLUR */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <BlurView intensity={80} style={styles.headerBlur} />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Biblioteca</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Tu colección musical</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerAction} onPress={() => {}} activeOpacity={0.7} accessibilityLabel="Ordenar">
              <Ionicons name="funnel-outline" size={26} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerAction} onPress={() => setShowSearch(!showSearch)} activeOpacity={0.7} accessibilityLabel="Buscar">
              <Ionicons name="search" size={26} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerAction} onPress={() => {}} activeOpacity={0.7} accessibilityLabel="Más opciones">
              <Ionicons name="ellipsis-vertical" size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* SEARCH BAR - Expandable */}
        {showSearch && (
          <Animated.View style={styles.searchContainer}>
            <View style={[styles.searchBar, { backgroundColor: colors.surfaceOverlay, borderColor: colors.border }]}>
              <Ionicons name="search" size={22} color={colors.textMuted} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder="Buscar en tu biblioteca..."
                value={searchQuery}
                onChangeText={(text) => {
                  setSearchQuery(text);
                }}
                placeholderTextColor={colors.textDisabled}
                autoCapitalize="none"
                autoFocus
              />
              {searchQuery && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton} activeOpacity={0.7}>
                  <Ionicons name="close" size={22} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>
        )}
      </View>

      {/* TAB BAR - Scrollable with indicator */}
      <ScrollView
        horizontal
        style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabBarContent}
      >
        {tabs.map((tab) => (
          <TabButton
            key={tab.key}
            label={tab.label}
            icon={tab.icon}
            isActive={activeTab === tab.key}
            onPress={() => {
              setActiveTab(tab.key);
              setShowSearch(false);
              setSearchQuery('');
            }}
            count={tab.count}
          />
        ))}
      </ScrollView>

      {/* MAIN CONTENT */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            progressBackgroundColor={colors.surface}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderTabContent()}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
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
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
  },
  headerBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    position: 'relative',
    zIndex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerAction: {
    padding: SPACING.xs,
  },
  searchContainer: {
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchIcon: {
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    paddingVertical: SPACING.xs,
  },
  clearButton: {
    padding: SPACING.xs,
  },
  tabBar: {
    position: 'relative',
    zIndex: 99,
    borderBottomWidth: 1,
  },
  tabBarContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    minWidth: 90,
    justifyContent: 'center',
  },
  tabButtonActive: {},
  tabButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  tabButtonTextActive: {},
  tabButtonTextInactive: {},
  tabBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  tabBadgeActive: {},
  tabBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  tabBadgeTextActive: {},
  tabBadgeTextInactive: {},
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  tracksList: {
    gap: SPACING.xs,
  },
  trackRow: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  trackRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trackNumberContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
  },
  trackNumberPlaying: {
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
  },
  trackNumber: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: '#78788c',
  },
  trackNumberPlayingText: {
    color: '#00d4ff',
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  rowArtworkContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
    marginLeft: SPACING.sm,
  },
  rowArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  playingIndicator: {
    position: 'absolute',
    bottom: SPACING.xs,
    left: SPACING.xs,
    flexDirection: 'row',
    gap: 2,
    alignItems: 'flex-end',
    height: 12,
  },
  equalizerBar: {
    width: 2,
    backgroundColor: '#00d4ff',
    borderRadius: 1,
  },
  trackRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingRight: SPACING.md,
    minWidth: 0,
  },
  trackRowInfo: {
    flex: 1,
    minWidth: 0,
  },
  trackRowTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  trackRowSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  offlineIndicator: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(0, 255, 136, 0.15)',
    borderRadius: BORDER_RADIUS.round,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingRight: SPACING.md,
    minWidth: 80,
    justifyContent: 'flex-end',
  },
  trackRowDuration: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    width: 50,
    textAlign: 'right',
  },
  itemQuality: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: BORDER_RADIUS.round,
  },
  moreButton: {
    padding: SPACING.md,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginRight: SPACING.xs,
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
  swipeActions: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
  },
  swipeAction: {
    width: 60,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderTopLeftRadius: BORDER_RADIUS.md,
    borderBottomLeftRadius: BORDER_RADIUS.md,
  },
  swipeActionLast: {
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: BORDER_RADIUS.md,
    borderBottomRightRadius: BORDER_RADIUS.md,
  },

  // Grid
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    justifyContent: 'space-between',
  },
  albumGridItem: {
    width: '48%',
  },
  albumGridArtworkContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  albumGridArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  albumGridGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  offlineBadge: {
    position: 'absolute',
    top: SPACING.sm,
    right: SPACING.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: '#00ff88',
    borderRadius: BORDER_RADIUS.round,
  },
  albumPlayOverlay: {
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
  moreOverlay: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumGridInfo: {
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  albumGridTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  albumGridArtist: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  albumGridMeta: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },

  artistGridItem: {
    width: '48%',
  },
  artistGridArtworkContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.round,
    overflow: 'hidden',
    marginBottom: SPACING.sm,
  },
  artistGridArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  artistGridInfo: {
    alignItems: 'center',
    paddingHorizontal: SPACING.xs,
  },
  artistGridName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textAlign: 'center',
  },
  artistGridMeta: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  artistGenres: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  artistGenreTag: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(0, 212, 255, 0.15)',
    borderRadius: BORDER_RADIUS.round,
  },

  playlistGridItem: {
    width: '48%',
  },
  playlistGridArtworkContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  playlistGridArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  playlistGridGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  playlistPlayOverlay: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    width: 48,
    height: 48,
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
  playlistGridInfo: {
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  playlistGridTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  playlistGridMeta: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },

  podcastGridItem: {
    width: '48%',
  },
  podcastGridArtworkContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  podcastGridArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  podcastGridGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  podcastPlayOverlay: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    width: 48,
    height: 48,
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
  podcastGridInfo: {
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  podcastGridTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  podcastGridAuthor: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  podcastGridMeta: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  podcastLatest: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },

  // Offline
  offlineList: {
    gap: SPACING.md,
  },
  offlineItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  offlineItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  itemArtwork: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
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
  offlineItemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  itemActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  deleteButton: {
    padding: SPACING.xs,
  },

  // History
  historyList: {
    gap: SPACING.xs,
  },
  historyItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  historyItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  historyInfo: {
    flex: 1,
    minWidth: 0,
  },
  historyTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  historySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  historyMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  progressOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#00d4ff',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.md,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md,
    maxWidth: '85%',
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
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },

  // Section Header
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
  sectionCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
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

  // Skeletons
  listSkeleton: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingVertical: SPACING.sm,
  },
  gridSkeleton: {
    width: '48%',
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  skeletonArtwork: {
    borderRadius: BORDER_RADIUS.sm,
  },
  skeletonTextContainer: {
    flex: 1,
    gap: SPACING.xs,
  },
  skeletonLine: {
    borderRadius: BORDER_RADIUS.xs,
  },

  // Category Chips
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

  bottomSpacer: {
    height: 120,
  },
});