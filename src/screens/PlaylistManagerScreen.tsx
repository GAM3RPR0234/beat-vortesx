// Beat Vortex - Playlist Manager Screen
// Create, edit, and manage playlists with drag-reorder, smart playlists, and M3U import

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Image,
  Keyboard,
  SafeAreaView,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolateColor,
  useDerivedValue,
} from 'react-native-reanimated';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { useColors, useReducedMotion } from '@/hooks/useColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION, COLORS } from '@/constants/theme';
import { useHaptics } from '@/hooks/useHaptics';
import { usePlaylistStore } from '@/store/playlistStore';
import { usePlayerStore } from '@/store/playerStore';
import { useDownloadStore } from '@/store/downloadStore';
import { Track } from '@/store/playerStore';
import { playlistImportService, ImportReport, M3UEntry } from '@/services/playlistImportService';
import { musicCatalogService } from '@/services/musicCatalogService';
// DocumentPicker - using expo-document-picker instead
import * as DocumentPicker from 'expo-document-picker';
import { getMusicPlaceholder } from '@/utils/placeholderImages';

const C = COLORS;

type ScreenMode = 'list' | 'create' | 'edit' | 'import' | 'import-preview';

interface PlaylistManagerScreenProps {
  initialMode?: ScreenMode;
  playlistId?: string;
}

function SectionHeader({ title, action, count }: { title: string; action?: React.ReactNode; count?: number }) {
  const colors = useColors();

  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderLeft}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {count !== undefined && (
          <Text style={styles.sectionCount}>{count}</Text>
        )}
      </View>
      {action}
    </View>
  );
}

function PlaylistCard({
  playlist,
  onPress,
  onMore,
  onPlay,
  index,
}: {
  playlist: any;
  onPress: () => void;
  onMore: () => void;
  onPlay: () => void;
  index: number;
}) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const { lightImpact } = useHaptics();
  const anim = useSharedValue(0);

  React.useEffect(() => {
    if (!reducedMotion) {
      anim.value = withSpring(1, { damping: 20, stiffness: 200 });
    } else {
      anim.value = 1;
    }
  }, [index, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: interpolateColor(anim.value, [0, 1], [20, 0]) }],
  }), [anim]);

  const handlePress = useCallback(() => {
    lightImpact();
    onPress();
  }, [lightImpact, onPress]);

  const handlePlayPress = useCallback(() => {
    lightImpact();
    onPlay();
  }, [lightImpact, onPlay]);

  const handleMorePress = useCallback(() => {
    lightImpact();
    onMore();
  }, [lightImpact, onMore]);

  const trackCount = playlist.tracks?.length || 0;

  return (
    <Animated.View style={[styles.playlistCard, animatedStyle]}>
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8} style={styles.playlistCardMain}>
        <View style={styles.playlistArtworkContainer}>
          {playlist.artwork ? (
            <Image source={{ uri: playlist.artwork }} style={styles.playlistArtwork} resizeMode="cover" />
          ) : (
            <View style={[styles.playlistArtworkPlaceholder, { backgroundColor: colors.primaryGlow }]}>
              <Ionicons name="musical-notes" size={32} color={colors.primary} />
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.playlistArtworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <TouchableOpacity onPress={handlePlayPress} style={styles.playOverlay} activeOpacity={0.7}>
            <Ionicons name="play" size={36} color={colors.textOnPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleMorePress} style={styles.moreOverlay} activeOpacity={0.7}>
            <Ionicons name="ellipsis-vertical" size={24} color={colors.textOnPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistTitle} numberOfLines={1}>{playlist.title}</Text>
          <Text style={styles.playlistMeta} numberOfLines={1}>
            {playlist.description || 'Sin descripción'} · {trackCount} {trackCount === 1 ? 'canción' : 'canciones'}
          </Text>
          <Text style={styles.playlistDate}>{formatDate(playlist.updatedAt || playlist.createdAt)}</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function TrackRowItem({
  track,
  index,
  isPlaying,
  onPress,
  onReorder,
  onRemove,
  dragAnim,
}: {
  track: Track;
  index: number;
  isPlaying: boolean;
  onPress: () => void;
  onReorder: (from: number, to: number) => void;
  onRemove: () => void;
  dragAnim: Animated.SharedValue<number>;
}) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const { lightImpact } = useHaptics();
  const anim = useSharedValue(0);
  const pressAnim = useSharedValue(0);

  React.useEffect(() => {
    if (!reducedMotion) {
      anim.value = withSpring(1, { damping: 20, stiffness: 200 });
    } else {
      anim.value = 1;
    }
  }, [index, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateX: interpolateColor(anim.value, [0, 1], [-20, 0]) }],
  }), [anim]);

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolateColor(pressAnim.value, [0, 1], [1, 0.98]) }],
  }), [pressAnim]);

  return (
    <Animated.View style={[styles.trackRow, animatedStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { if (!reducedMotion) pressAnim.value = withSpring(1, { damping: 15, stiffness: 150 }); lightImpact(); }}
        onPressOut={() => { if (!reducedMotion) pressAnim.value = withSpring(0, { damping: 15, stiffness: 150 }); }}
        activeOpacity={0.8}
        style={[styles.trackRowMain, pressStyle]}
      >
        <View style={styles.trackNumberContainer}>
          <Text style={styles.trackNumber}>{index + 1}</Text>
        </View>
        <View style={styles.trackArtworkContainer}>
          <Image source={{ uri: track.artwork }} style={styles.trackArtwork} resizeMode="cover" />
        </View>
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, isPlaying && styles.trackTitlePlaying, { color: isPlaying ? colors.primary : colors.textPrimary }]} numberOfLines={1}>
            {track.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>{track.artist}</Text>
        </View>
        <View style={styles.trackDuration}><Text>{track.duration ? formatDuration(track.duration) : '--:--'}</Text></View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onRemove} style={styles.removeButton} activeOpacity={0.7} accessibilityLabel="Eliminar de la playlist">
        <Ionicons name="trash" size={22} color={colors.error} />
      </TouchableOpacity>
    </Animated.View>
  );
}

function SmartRuleRow({
  rule,
  index,
  onChange,
  onRemove,
}: {
  rule: any;
  index: number;
  onChange: (field: string, value: any) => void;
  onRemove: () => void;
}) {
  const colors = useColors();
  const ruleTypes = [
    { value: 'genre', label: 'Género' },
    { value: 'artist', label: 'Artista' },
    { value: 'album', label: 'Álbum' },
    { value: 'year', label: 'Año' },
    { value: 'bpm', label: 'BPM' },
    { value: 'rating', label: 'Valoración' },
    { value: 'playCount', label: 'Veces reproducida' },
    { value: 'dateAdded', label: 'Fecha de añadido' },
  ];
  const operators = [
    { value: 'equals', label: 'es' },
    { value: 'contains', label: 'contiene' },
    { value: 'startsWith', label: 'empieza con' },
    { value: 'endsWith', label: 'termina con' },
    { value: 'gt', label: '>' },
    { value: 'lt', label: '<' },
    { value: 'gte', label: '>=' },
    { value: 'lte', label: '<=' },
    { value: 'between', label: 'entre' },
  ];

  return (
    <View style={styles.smartRuleRow}>
      <View style={styles.smartRuleSelect}>
        <TextInput
          style={styles.smartRuleInput}
          value={ruleTypes.find(r => r.value === rule.field)?.label || rule.field}
          editable={false}
          onFocus={() => {
            // Show picker for field
          }}
        />
      </View>
      <View style={styles.smartRuleSelect}>
        <TextInput
          style={styles.smartRuleInput}
          value={operators.find(o => o.value === rule.operator)?.label || rule.operator}
          editable={false}
        />
      </View>
      <TextInput
        style={styles.smartRuleInputValue}
        placeholder="Valor"
        value={rule.value}
        onChangeText={(v) => onChange('value', v)}
      />
      <TouchableOpacity onPress={onRemove} style={styles.smartRuleRemove} activeOpacity={0.7}>
        <Ionicons name="trash" size={20} color={colors.error} />
      </TouchableOpacity>
    </View>
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
  const { mediumImpact } = useHaptics();
  const anim = useSharedValue(0);

  React.useEffect(() => {
    if (!reducedMotion) {
      anim.value = withTiming(1, { duration: ANIMATION.duration.slower });
    } else {
      anim.value = 1;
    }
  }, [reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: interpolateColor(anim.value, [0, 1], [30, 0]) }],
  }), [anim]);

  const handleAction = () => {
    if (onAction) {
      mediumImpact();
      onAction();
    }
  };

  return (
    <Animated.View style={[styles.emptyState, animatedStyle]}>
      {illustration || (
        <View style={[styles.emptyIcon, { backgroundColor: colors.glassLight, borderColor: colors.border }]}>
          <Ionicons name={icon as any} size={64} color={colors.primary} />
        </View>
      )}
      <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{subtitle}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={[styles.emptyAction, { backgroundColor: colors.primary }]} onPress={handleAction} activeOpacity={0.8}>
          <Text style={[styles.emptyActionText, { color: colors.textOnPrimary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function PlaylistManagerScreen() {
  const colors = useColors();
  const navigation = useNavigation();
  const route = useRoute();
  const reducedMotion = useReducedMotion();
  const { lightImpact, mediumImpact, heavyImpact } = useHaptics();

  const { playlists, createPlaylist, updatePlaylist, deletePlaylist, getPlaylist, addTrackToPlaylist, removeTrackFromPlaylist, reorderPlaylistTracks } = usePlaylistStore();
  const { queue, setQueue, setCurrentTrack, play, currentTrack } = usePlayerStore();
  const { isDownloaded } = useDownloadStore();

  const [mode, setMode] = useState<ScreenMode>('list');
  const [editingPlaylist, setEditingPlaylist] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [newPlaylistTitle, setNewPlaylistTitle] = useState('');
  const [newPlaylistDescription, setNewPlaylistDescription] = useState('');
  const [newPlaylistArtwork, setNewPlaylistArtwork] = useState('');
  const [isSmartPlaylist, setIsSmartPlaylist] = useState(false);
  const [smartRules, setSmartRules] = useState<any[]>([]);
  const [importReport, setImportReport] = useState<ImportReport | null>(null);
  const [importContent, setImportContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [isSelectMode, setIsSelectMode] = useState(false);

  // Handle route params
  React.useEffect(() => {
    const params = route.params as any;
    if (params?.mode) setMode(params.mode);
    if (params?.playlistId) {
      const pl = getPlaylist(params.playlistId);
      if (pl) {
        setEditingPlaylist(pl);
        setMode('edit');
      }
    }
  }, [route.params, getPlaylist]);

  const filteredPlaylists = useMemo(() => {
    if (!searchQuery.trim()) return playlists;
    const lower = searchQuery.toLowerCase();
    return playlists.filter(p =>
      p.title.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower)
    );
  }, [playlists, searchQuery]);

  const handleCreatePlaylist = async () => {
    if (!newPlaylistTitle.trim()) {
      Alert.alert('Error', 'El título es obligatorio');
      return;
    }

    const id = await createPlaylist({
      title: newPlaylistTitle.trim(),
      description: newPlaylistDescription.trim(),
      artwork: newPlaylistArtwork.trim() || getMusicPlaceholder('playlist'),
      tracks: [],
      isSmart: isSmartPlaylist,
      smartRules: isSmartPlaylist ? smartRules : undefined,
    });

    // Reset form
    setNewPlaylistTitle('');
    setNewPlaylistDescription('');
    setNewPlaylistArtwork('');
    setIsSmartPlaylist(false);
    setSmartRules([]);
    setMode('list');
    mediumImpact();
  };

  const handleUpdatePlaylist = async () => {
    if (!editingPlaylist || !newPlaylistTitle.trim()) return;

    await updatePlaylist(editingPlaylist.id, {
      title: newPlaylistTitle.trim(),
      description: newPlaylistDescription.trim(),
      artwork: newPlaylistArtwork.trim() || editingPlaylist.artwork,
      isSmart: isSmartPlaylist,
      smartRules: isSmartPlaylist ? smartRules : undefined,
    });

    setEditingPlaylist(null);
    setNewPlaylistTitle('');
    setNewPlaylistDescription('');
    setNewPlaylistArtwork('');
    setIsSmartPlaylist(false);
    setSmartRules([]);
    setMode('list');
    mediumImpact();
  };

  const handleDeletePlaylist = (playlistId: string) => {
    Alert.alert(
      'Eliminar playlist',
      '¿Estás seguro de que quieres eliminar esta playlist? Esta acción no se puede deshacer.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => { deletePlaylist(playlistId); heavyImpact(); } },
      ]
    );
  };

  const handlePlayPlaylist = (playlist: any) => {
    const tracks = playlist.tracks.map((id: string) => {
      // Find track in library/cache
      return { id, title: 'Track', artist: 'Artist', artwork: '', duration: 0, url: '' } as Track;
    }).filter((t: Track) => t.id);

    if (tracks.length > 0) {
      setQueue(tracks, 0);
      setCurrentTrack(tracks[0]);
      play();
      lightImpact();
    }
  };

  const handleAddSmartRule = () => {
    setSmartRules([...smartRules, { field: 'genre', operator: 'equals', value: '' }]);
    lightImpact();
  };

  const handleSmartRuleChange = (index: number, field: string, value: any) => {
    setSmartRules(smartRules.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  const handleRemoveSmartRule = (index: number) => {
    setSmartRules(smartRules.filter((_, i) => i !== index));
    lightImpact();
  };

  const handleImportM3U = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'text/plain', 'application/x-mpegurl', 'audio/x-mpegurl'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const fileUri = result.assets[0].uri;
        const fileName = result.assets[0].name || 'Imported Playlist';
        // Read file content
        const response = await fetch(fileUri);
        const content = await response.text();

        setIsImporting(true);
        const report = await playlistImportService.importM3UPlaylist(content, fileName);
        setImportReport(report);
        setMode('import-preview');
        setIsImporting(false);
        mediumImpact();
      }
    } catch (error: any) {
      if (error.name !== 'DocumentPickerCancelled') {
        console.error('Import failed:', error);
        Alert.alert('Error', 'No se pudo importar la playlist');
      }
      setIsImporting(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!importReport) return;

    const id = await createPlaylist({
      title: importReport.playlistName,
      description: `Importada desde M3U · ${importReport.matched} coincidencias, ${importReport.unmatched} sin coincidir`,
      artwork: importReport.tracks[0]?.artwork || getMusicPlaceholder('playlist'),
      tracks: importReport.tracks.map(t => t.id),
      isSmart: false,
    });

    setImportReport(null);
    setMode('list');
    heavyImpact();
  };

  const handleReorderTracks = async (from: number, to: number) => {
    if (!editingPlaylist) return;
    await reorderPlaylistTracks(editingPlaylist.id, from, to);
    setEditingPlaylist(getPlaylist(editingPlaylist.id));
    lightImpact();
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!editingPlaylist) return;
    await removeTrackFromPlaylist(editingPlaylist.id, trackId);
    setEditingPlaylist(getPlaylist(editingPlaylist.id));
    lightImpact();
  };

  const renderListMode = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={22} color={colors.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar playlists..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => setShowSearch(true)}
            onBlur={() => setShowSearch(false)}
            onSubmitEditing={Keyboard.dismiss}
          />
          {searchQuery && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); Keyboard.dismiss(); lightImpact(); }} style={styles.searchClear}>
              <Ionicons name="close-circle" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Playlists Grid */}
      {filteredPlaylists.length === 0 ? (
        <EmptyState
          icon="list"
          title={searchQuery ? 'Sin resultados' : 'Sin playlists'}
          subtitle={searchQuery ? 'Prueba con otro término de búsqueda' : 'Crea tu primera playlist para organizar tu música'}
          actionLabel={searchQuery ? undefined : 'Crear playlist'}
          onAction={searchQuery ? undefined : () => { setMode('create'); mediumImpact(); }}
        />
      ) : (
        <View style={styles.playlistsGrid}>
          {filteredPlaylists.map((playlist, index) => (
            <PlaylistCard
              key={playlist.id}
              playlist={playlist}
              index={index}
              onPress={() => { setEditingPlaylist(playlist); setNewPlaylistTitle(playlist.title); setNewPlaylistDescription(playlist.description); setNewPlaylistArtwork(playlist.artwork); setIsSmartPlaylist(playlist.isSmart || false); setSmartRules(playlist.smartRules || []); setMode('edit'); lightImpact(); }}
              onMore={() => handleDeletePlaylist(playlist.id)}
              onPlay={() => handlePlayPlaylist(playlist)}
            />
          ))}
        </View>
      )}

      {/* Create Button (FAB) */}
      {!isSelectMode && (
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPress={() => { setMode('create'); mediumImpact(); }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color={colors.textOnPrimary} />
        </TouchableOpacity>
      )}
    </ScrollView>
  );

  const renderCreateMode = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Título *</Text>
        <TextInput
          style={styles.formInput}
          placeholder="Nombre de la playlist"
          value={newPlaylistTitle}
          onChangeText={setNewPlaylistTitle}
          autoCapitalize="words"
          autoFocus
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Descripción</Text>
        <TextInput
          style={[styles.formInput, styles.formInputMultiline]}
          placeholder="Descripción opcional"
          value={newPlaylistDescription}
          onChangeText={setNewPlaylistDescription}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Portada (URL)</Text>
        <TextInput
          style={styles.formInput}
          placeholder="https://example.com/cover.jpg"
          value={newPlaylistArtwork}
          onChangeText={setNewPlaylistArtwork}
          autoCapitalize="none"
          keyboardType="url"
        />
      </View>

      <View style={styles.formSection}>
        <Text style={styles.formLabel}>Tipo de Playlist</Text>
        <View style={styles.toggleContainer}>
          <TouchableOpacity
            style={[styles.toggleOption, !isSmartPlaylist && styles.toggleOptionActive, { backgroundColor: !isSmartPlaylist ? colors.primary + '20' : colors.surfaceOverlay, borderColor: !isSmartPlaylist ? colors.primary : colors.border }]}
            onPress={() => { setIsSmartPlaylist(false); lightImpact(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="list" size={22} color={!isSmartPlaylist ? colors.primary : colors.textMuted} style={{ marginRight: SPACING.sm }} />
            <Text style={{ color: !isSmartPlaylist ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Manual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.toggleOption, isSmartPlaylist && styles.toggleOptionActive, { backgroundColor: isSmartPlaylist ? colors.primary + '20' : colors.surfaceOverlay, borderColor: isSmartPlaylist ? colors.primary : colors.border }]}
            onPress={() => { setIsSmartPlaylist(true); lightImpact(); }}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={22} color={isSmartPlaylist ? colors.primary : colors.textMuted} style={{ marginRight: SPACING.sm }} />
            <Text style={{ color: isSmartPlaylist ? colors.primary : colors.textSecondary, fontWeight: '600' }}>Inteligente</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isSmartPlaylist && (
        <View style={styles.formSection}>
          <View style={styles.smartRulesHeader}>
            <Text style={styles.formLabel}>Reglas Inteligentes</Text>
            <TouchableOpacity onPress={handleAddSmartRule} style={styles.addRuleButton} activeOpacity={0.8}>
              <Ionicons name="add" size={20} color={colors.primary} />
              <Text style={{ color: colors.primary, fontWeight: '600', marginLeft: SPACING.xs }}>Añadir regla</Text>
            </TouchableOpacity>
          </View>
          {smartRules.length === 0 ? (
            <Text style={styles.smartRulesEmpty}>Añade reglas para filtrar automáticamente las pistas</Text>
          ) : (
            <View style={styles.smartRulesList}>
              {smartRules.map((rule, index) => (
                <SmartRuleRow
                  key={index}
                  rule={rule}
                  index={index}
                  onChange={(field, value) => handleSmartRuleChange(index, field, value)}
                  onRemove={() => handleRemoveSmartRule(index)}
                />
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.formActions}>
        <TouchableOpacity onPress={() => { setMode('list'); setNewPlaylistTitle(''); setNewPlaylistDescription(''); setNewPlaylistArtwork(''); setIsSmartPlaylist(false); setSmartRules([]); lightImpact(); }} style={[styles.formButton, styles.formButtonCancel, { borderColor: colors.border }]}>
          <Text style={styles.formButtonTextCancel}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleCreatePlaylist} style={[styles.formButton, { backgroundColor: colors.primary }]}>
          <Text style={styles.formButtonText}>Crear Playlist</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderEditMode = () => {
    if (!editingPlaylist) return null;

    const playlistTracks = editingPlaylist.tracks.map((id: string) => {
      // Mock track data - in real app, fetch from library
      return {
        id,
        title: `Track ${id}`,
        artist: 'Artist',
        album: 'Album',
        artwork: getMusicPlaceholder('track'),
        duration: 180 + Math.random() * 120,
        url: '',
        quality: '320kbps',
      } as Track;
    });

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
        {/* Playlist Header */}
        <View style={styles.editHeader}>
          <View style={styles.editArtworkContainer}>
            {editingPlaylist.artwork ? (
              <Image source={{ uri: editingPlaylist.artwork }} style={styles.editArtwork} resizeMode="cover" />
            ) : (
              <View style={[styles.editArtworkPlaceholder, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="musical-notes" size={48} color={colors.primary} />
              </View>
            )}
          </View>
          <View style={styles.editInfo}>
            <TextInput
              style={styles.editTitleInput}
              value={newPlaylistTitle}
              onChangeText={setNewPlaylistTitle}
              autoCapitalize="words"
            />
            <Text style={styles.editMeta}>{editingPlaylist.tracks.length} canciones · {formatDate(editingPlaylist.updatedAt || editingPlaylist.createdAt)}</Text>
          </View>
        </View>

        {/* Tracks List */}
        <SectionHeader title="Canciones" count={playlistTracks.length} />

        {playlistTracks.length === 0 ? (
          <EmptyState
            icon="musical-notes"
            title="Playlist vacía"
            subtitle="Añade canciones desde la biblioteca o importa un archivo M3U"
            actionLabel="Importar M3U"
            onAction={() => { setMode('import'); mediumImpact(); }}
          />
        ) : (
          <View style={styles.tracksList}>
            {playlistTracks.map((track: Track, index: number) => (
              <TrackRowItem
                key={track.id}
                track={track}
                index={index}
                isPlaying={currentTrack?.id === track.id}
                onPress={() => { /* Play from here */ }}
                onReorder={handleReorderTracks}
                onRemove={() => handleRemoveTrack(track.id)}
                dragAnim={useSharedValue(0)}
              />
            ))}
          </View>
        )}

        <View style={styles.editActions}>
          <TouchableOpacity onPress={() => { setMode('import'); mediumImpact(); }} style={[styles.editActionButton, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}>
            <Ionicons name="download" size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Importar M3U</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDeletePlaylist(editingPlaylist.id)} style={[styles.editActionButton, { backgroundColor: colors.errorGlow, borderColor: colors.error }]}>
            <Ionicons name="trash" size={20} color={colors.error} style={{ marginRight: SPACING.sm }} />
            <Text style={{ color: colors.error, fontWeight: '600' }}>Eliminar Playlist</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formActions}>
          <TouchableOpacity onPress={() => { setMode('list'); setEditingPlaylist(null); lightImpact(); }} style={[styles.formButton, styles.formButtonCancel, { borderColor: colors.border }]}>
            <Text style={styles.formButtonTextCancel}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleUpdatePlaylist} style={[styles.formButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.formButtonText}>Guardar Cambios</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderImportMode = () => (
    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
      <View style={styles.importHeader}>
        <Ionicons name="download" size={64} color={colors.primary} />
        <Text style={styles.importTitle}>Importar Playlist M3U</Text>
        <Text style={styles.importSubtitle}>Selecciona un archivo .m3u o .m3u8 para importar tu playlist</Text>
      </View>

      <TouchableOpacity
        onPress={handleImportM3U}
        disabled={isImporting}
        style={[styles.importButton, { backgroundColor: colors.primary, opacity: isImporting ? 0.6 : 1 }]}
        activeOpacity={0.8}
      >
        {isImporting ? (
          <ActivityIndicator size="large" color={colors.textOnPrimary} />
        ) : (
          <>
            <Ionicons name="folder-open" size={28} color={colors.textOnPrimary} style={{ marginRight: SPACING.md }} />
            <Text style={styles.importButtonText}>Seleccionar archivo M3U</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={styles.importInfo}>
        <Text style={styles.importInfoTitle}>Formatos soportados:</Text>
        <Text style={styles.importInfoText}>• M3U / M3U8 (UTF-8)</Text>
        <Text style={styles.importInfoText}>• #EXTINF con metadatos extendidos</Text>
        <Text style={styles.importInfoText}>• Rutas locales, URLs HTTP/HTTPS</Text>
        <Text style={styles.importInfoText}>• Coincidencia automática con catálogo musical</Text>
      </View>

      <TouchableOpacity onPress={() => { setMode('list'); lightImpact(); }} style={styles.importCancel}>
        <Text style={{ color: colors.textMuted }}>Cancelar</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const renderImportPreviewMode = () => {
    if (!importReport) return null;

    return (
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.formContent}>
        <View style={styles.importPreviewHeader}>
          <View style={[styles.importPreviewArtwork, { backgroundColor: colors.primaryGlow }]}>
            <Ionicons name="musical-notes" size={48} color={colors.primary} />
          </View>
          <View style={styles.importPreviewInfo}>
            <Text style={styles.importPreviewTitle}>{importReport.playlistName}</Text>
            <Text style={styles.importPreviewMeta}>{importReport.tracks.length} pistas · {importReport.matched} coinciden con el catálogo</Text>
          </View>
        </View>

        <View style={styles.importStats}>
          <View style={[styles.importStat, { backgroundColor: colors.successGlow, borderColor: colors.success }]}>
            <Text style={styles.importStatValue}>{importReport.matched}</Text>
            <Text style={styles.importStatLabel}>Coinciden</Text>
          </View>
          <View style={[styles.importStat, { backgroundColor: colors.warningGlow, borderColor: colors.warning }]}>
            <Text style={styles.importStatValue}>{importReport.unmatched}</Text>
            <Text style={styles.importStatLabel}>Sin coincidir</Text>
          </View>
          <View style={[styles.importStat, { backgroundColor: colors.errorGlow, borderColor: colors.error }]}>
            <Text style={styles.importStatValue}>{importReport.duplicates}</Text>
            <Text style={styles.importStatLabel}>Duplicados</Text>
          </View>
        </View>

        {importReport.errors.length > 0 && (
          <View style={styles.importErrors}>
            <Text style={styles.importErrorsTitle}>Advertencias:</Text>
            {importReport.errors.slice(0, 5).map((error, i) => (
              <Text key={i} style={styles.importErrorItem}>• {error}</Text>
            ))}
            {importReport.errors.length > 5 && (
              <Text style={styles.importErrorItem}>... y {importReport.errors.length - 5} más</Text>
            )}
          </View>
        )}

        <View style={styles.formActions}>
          <TouchableOpacity onPress={() => { setImportReport(null); setMode('list'); lightImpact(); }} style={[styles.formButton, styles.formButtonCancel, { borderColor: colors.border }]}>
            <Text style={styles.formButtonTextCancel}>Descartar</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleConfirmImport} style={[styles.formButton, { backgroundColor: colors.primary }]}>
            <Text style={styles.formButtonText}>Crear Playlist</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  const renderContent = () => {
    switch (mode) {
      case 'create':
        return renderCreateMode();
      case 'edit':
        return renderEditMode();
      case 'import':
        return renderImportMode();
      case 'import-preview':
        return renderImportPreviewMode();
      default:
        return renderListMode();
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <BlurView intensity={80} style={styles.headerBlur} />
        <View style={styles.headerContent}>
          <TouchableOpacity
            onPress={() => {
              if (mode !== 'list') {
                setMode('list');
                setEditingPlaylist(null);
                setNewPlaylistTitle('');
                setNewPlaylistDescription('');
                setNewPlaylistArtwork('');
                setIsSmartPlaylist(false);
                setSmartRules([]);
                setImportReport(null);
              } else {
                navigation.goBack();
              }
              lightImpact();
            }}
            style={styles.headerBack}
            activeOpacity={0.7}
            accessibilityLabel={mode !== 'list' ? 'Cancelar' : 'Volver'}
          >
            <Ionicons name={mode !== 'list' ? 'close' : 'chevron-back'} size={28} color={colors.primary} />
          </TouchableOpacity>

          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>
              {mode === 'list' ? 'Playlists' : mode === 'create' ? 'Nueva Playlist' : mode === 'edit' ? 'Editar Playlist' : mode === 'import' ? 'Importar M3U' : 'Vista Previa'}
            </Text>
          </View>

          {mode === 'list' && !isSelectMode && (
            <TouchableOpacity onPress={() => { setMode('create'); mediumImpact(); }} style={styles.headerAction} activeOpacity={0.7} accessibilityLabel="Crear playlist">
              <Ionicons name="add" size={28} color={colors.primary} />
            </TouchableOpacity>
          )}

          {mode === 'list' && isSelectMode && (
            <TouchableOpacity onPress={() => { setIsSelectMode(false); setSelectedTracks(new Set()); lightImpact(); }} style={styles.headerAction} activeOpacity={0.7} accessibilityLabel="Cancelar selección">
              <Text style={{ color: colors.primary, fontWeight: '600' }}>Cancelar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {renderContent()}
    </SafeAreaView>
  );
}

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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBack: {
    padding: SPACING.xs,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textPrimary,
  },
  headerAction: {
    padding: SPACING.xs,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  formContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  searchContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchIcon: {
    marginLeft: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textPrimary,
    paddingVertical: 0,
  },
  searchClear: {
    padding: SPACING.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: C.primary,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  sectionCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.textMuted,
    backgroundColor: C.glassLight,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  playlistsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  playlistCard: {
    width: '48%',
    backgroundColor: C.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  playlistCardMain: {
    flex: 1,
  },
  playlistArtworkContainer: {
    position: 'relative',
    aspectRatio: 1,
    overflow: 'hidden',
  },
  playlistArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  playlistArtworkPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistArtworkGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  playOverlay: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: C.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  moreOverlay: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playlistInfo: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  playlistTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textPrimary,
  },
  playlistMeta: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
  },
  playlistDate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textDisabled,
  },
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
  fab: {
    position: 'absolute',
    bottom: SPACING.xl + 80,
    right: SPACING.xl,
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  // Form Styles
  formSection: {
    gap: SPACING.sm,
  },
  formLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.textSecondary,
    marginBottom: SPACING.xs,
  },
  formInput: {
    backgroundColor: C.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textPrimary,
  },
  formInputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  toggleOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    gap: SPACING.sm,
  },
  toggleOptionActive: {
    borderWidth: 2,
  },
  smartRulesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  addRuleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: C.primaryGlow,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: C.primary,
  },
  smartRulesList: {
    gap: SPACING.md,
  },
  smartRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: C.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    padding: SPACING.sm,
  },
  smartRuleSelect: {
    flex: 1,
    minWidth: 100,
  },
  smartRuleInput: {
    backgroundColor: C.glassLight,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textPrimary,
  },
  smartRuleInputValue: {
    flex: 2,
    minWidth: 120,
    backgroundColor: C.glassLight,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textPrimary,
  },
  smartRuleRemove: {
    padding: SPACING.xs,
  },
  smartRulesEmpty: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: C.textMuted,
    textAlign: 'center',
    padding: SPACING.lg,
  },
  formActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  formButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
  },
  formButtonCancel: {
    backgroundColor: 'transparent',
  },
  formButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textOnPrimary,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  formButtonTextCancel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textSecondary,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  // Edit Mode Styles
  editHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  editArtworkContainer: {
    width: 100,
    height: 100,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  editArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  editArtworkPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  editTitleInput: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textPrimary,
    paddingVertical: 0,
    marginBottom: SPACING.xs,
  },
  editMeta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
  },
  tracksList: {
    gap: SPACING.xs,
    marginTop: SPACING.md,
  },
  trackRow: {
    backgroundColor: C.surface,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  trackRowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  trackNumberContainer: {
    width: 32,
    alignItems: 'center',
  },
  trackNumber: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textMuted,
  },
  trackArtworkContainer: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.sm,
    overflow: 'hidden',
  },
  trackArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  trackInfo: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  trackTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  trackTitlePlaying: {
    color: C.primary,
  },
  trackArtist: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
  },
  trackDuration: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: C.textDisabled,
    minWidth: 50,
    textAlign: 'right',
  },
  removeButton: {
    padding: SPACING.md,
  },
  editActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  editActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  // Import Styles
  importHeader: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  importTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textPrimary,
  },
  importSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
    textAlign: 'center',
    maxWidth: '85%',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.round,
    marginTop: SPACING.lg,
  },
  importButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  importInfo: {
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: C.glassLight,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    gap: SPACING.xs,
  },
  importInfoTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.textSecondary,
  },
  importInfoText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
  },
  importCancel: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    padding: SPACING.md,
  },
  importPreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  importPreviewArtwork: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  importPreviewInfo: {
    flex: 1,
    minWidth: 0,
  },
  importPreviewTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textPrimary,
  },
  importPreviewMeta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
    marginTop: SPACING.xs,
  },
  importStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: SPACING.xl,
    gap: SPACING.md,
  },
  importStat: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  importStatValue: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: C.textPrimary,
  },
  importStatLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    marginTop: SPACING.xs,
  },
  importErrors: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    backgroundColor: C.errorGlow,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: C.error,
    gap: SPACING.xs,
  },
  importErrorsTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.error,
  },
  importErrorItem: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textSecondary,
  },
});

export default PlaylistManagerScreen;