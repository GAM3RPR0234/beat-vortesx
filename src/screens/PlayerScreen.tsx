// Beat Vortex - Player Screen (Redesigned)
// Premium full-screen player with dynamic artwork gradients, lyrics, queue bottom sheet, MiniPlayer

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  ScrollView,
  Platform,
  PanResponder,
  Dimensions,
  Modal,
  Keyboard,
  FlatList,
  RefreshControl,
  Share,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, runOnJS, interpolate, useDerivedValue } from 'react-native-reanimated';
import { useColors, useReducedMotion } from '@/hooks/useColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/constants/theme';
import { usePlayerStore } from '@/store/playerStore';
import { audioService } from '@/services/audioService';
import { extractColorsFromImage, generateNeonGradients } from '@/utils/colorExtractor';
import { lyricsService, ParsedLyricLine, LyricsData } from '@/services/lyricsService';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// MINI PLAYER COMPONENT (Extracted)
// ============================================

interface MiniPlayerProps {
  onExpand: () => void;
}

export function MiniPlayer({ onExpand }: MiniPlayerProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const {
    currentTrack,
    isPlaying,
    isMiniPlayerVisible,
    togglePlay,
    next,
    previous,
    setMiniPlayerVisible,
    progress,
    duration,
  } = usePlayerStore();

  if (!currentTrack || !isMiniPlayerVisible) return null;

  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION.duration.normal,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(1);
    }
  }, [reducedMotion]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePlayPause = () => {
    togglePlay();
    if (isPlaying) {
      audioService.pause();
    } else {
      audioService.play();
    }
  };

  const handleNext = () => {
    next();
    const { queue, currentIndex } = usePlayerStore.getState();
    if (queue[currentIndex + 1]) {
      audioService.loadTrack(queue[currentIndex + 1]).then(success => {
        if (success) audioService.play();
      });
    }
  };

  const handlePrevious = () => {
    previous();
    const { queue, currentIndex } = usePlayerStore.getState();
    if (queue[currentIndex - 1]) {
      audioService.loadTrack(queue[currentIndex - 1]).then(success => {
        if (success) audioService.play();
      });
    }
  };

  return (
    <Animated.View
      style={[
        styles.miniPlayer,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }] },
      ]}
      pointerEvents="auto"
    >
      <BlurView intensity={90} style={styles.miniBlur} />
      <TouchableOpacity onPress={onExpand} activeOpacity={0.8} style={styles.miniTouchArea} accessibilityLabel="Expandir reproductor">
        <Image source={{ uri: currentTrack.artwork }} style={styles.miniArtwork} resizeMode="cover" />
        <View style={styles.miniInfo}>
          <Text style={[styles.miniTitle, { color: colors.textPrimary }]} numberOfLines={1}>{currentTrack.title}</Text>
          <Text style={[styles.miniArtist, { color: colors.textMuted }]} numberOfLines={1}>{currentTrack.artist}</Text>
        </View>
        <View style={styles.miniProgressContainer}>
          <Text style={[styles.miniTime, { color: colors.textMuted }]}>{formatTime(progress)}</Text>
          <View style={styles.miniProgressBar}>
            <Animated.View
              style={[
                styles.miniProgressFill,
                { backgroundColor: colors.primary },
                { width: `${(progress / Math.max(duration, 1)) * 100}%` },
              ]}
            />
          </View>
          <Text style={[styles.miniTime, { color: colors.textMuted }]}>{formatTime(duration)}</Text>
        </View>
        <View style={styles.miniControls}>
          <TouchableOpacity onPress={handlePrevious} style={styles.miniControlBtn} activeOpacity={0.7} accessibilityLabel="Anterior">
            <Ionicons name="play-skip-back" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handlePlayPause} style={[styles.miniPlayBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8} accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}>
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color={colors.textOnPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleNext} style={styles.miniControlBtn} activeOpacity={0.7} accessibilityLabel="Siguiente">
            <Ionicons name="play-skip-forward" size={28} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================
// LYRIC LINE COMPONENT
// ============================================

interface LyricLineProps {
  line: ParsedLyricLine;
  index: number;
  isActive: boolean;
  activeColor: string;
  onLongPress: () => void;
  translation?: string;
}

function LyricLine({ line, index, isActive, activeColor, onLongPress, translation }: LyricLineProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isActive && !reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else if (!isActive) {
      anim.setValue(0);
    }
  }, [isActive, reducedMotion]);

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1],
  });

  return (
    <Animated.View
      style={[
        styles.lyricLineContainer,
        { transform: [{ scale }], opacity },
      ]}
    >
      <TouchableOpacity
        onLongPress={onLongPress}
        activeOpacity={0.7}
        style={[
          styles.lyricLineInner,
          isActive && { backgroundColor: colors.glassLight, borderColor: activeColor + '40', borderWidth: 1 },
        ]}
        accessibilityRole="button"
        accessibilityLabel={translation ? `${line.text}, traducción: ${translation}` : line.text}
      >
        <Animated.Text
          style={[
            styles.lyricText,
            isActive ? styles.lyricTextActive : styles.lyricTextDim,
            { color: isActive ? colors.textPrimary : colors.textMuted },
          ]}
        >
          {translation || line.text}
        </Animated.Text>
        {isActive && (
          <View style={[
            styles.activeIndicator,
            { backgroundColor: activeColor },
          ]} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ============================================
// QUEUE BOTTOM SHEET
// ============================================

interface QueueBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onReorder: (from: number, to: number) => void;
  onRemove: (index: number) => void;
  onPlay: (index: number) => void;
}

function QueueBottomSheet({ visible, onClose, onReorder, onRemove, onPlay }: QueueBottomSheetProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const {
    queue,
    currentIndex,
    setQueue,
    setCurrentTrack,
    play,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      if (!reducedMotion) {
        Animated.timing(anim, {
          toValue: 1,
          duration: ANIMATION.duration.normal,
          easing: ANIMATION.easing.easeOut,
          useNativeDriver: true,
        }).start();
      } else {
        anim.setValue(1);
      }
    } else {
      if (!reducedMotion) {
        Animated.timing(anim, {
          toValue: 0,
          duration: ANIMATION.duration.fast,
          easing: ANIMATION.easing.easeIn,
          useNativeDriver: true,
        }).start(() => onClose());
      } else {
        anim.setValue(0);
        onClose();
      }
    }
  }, [visible, reducedMotion]);

  const handlePlayTrack = (index: number) => {
    const track = queue[index];
    if (track) {
      setCurrentTrack(track);
      setQueue(queue, index);
      play();
      audioService.loadTrack(track).then(success => {
        if (success) audioService.play();
      });
    }
  };

  const handleRemove = (index: number) => {
    if (index === currentIndex) return; // Don't remove playing track
    removeFromQueue(index);
  };

  // Don't render if not visible
  if (!visible) return null;

  const renderItem = ({ item, index }: { item: any; index: number }) => (
    <TouchableOpacity
      style={[
        styles.queueItem,
        index === currentIndex && styles.queueItemPlaying,
        { backgroundColor: index === currentIndex ? colors.primary + '15' : 'transparent' },
      ]}
      onPress={() => handlePlayTrack(index)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`${item.title} por ${item.artist}${index === currentIndex ? ', reproduciendo' : ''}`}
      accessibilityState={{ selected: index === currentIndex }}
    >
      <View style={styles.queueNumber}>
        {index === currentIndex ? (
          <Ionicons name="musical-note" size={16} color={colors.primary} />
        ) : (
          <Text style={[styles.queueNumberText, { color: colors.textMuted }]}>{index + 1}</Text>
        )}
      </View>
      <Image source={{ uri: item.artwork }} style={styles.queueArtwork} resizeMode="cover" />
      <View style={styles.queueInfo}>
        <Text style={[styles.queueItemTitle, { color: index === currentIndex ? colors.primary : colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.queueArtist, { color: colors.textMuted }]} numberOfLines={1}>{item.artist}</Text>
      </View>
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); handleRemove(index); }}
        style={styles.queueRemoveBtn}
        activeOpacity={0.7}
        accessibilityLabel={`Eliminar ${item.title} de la cola`}
      >
        <Ionicons name="close" size={20} color={colors.textDisabled} />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.queueSheet,
        { transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] }) }] },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity onPress={onClose} style={styles.queueOverlay} activeOpacity={1} accessibilityLabel="Cerrar cola" />
      <BlurView intensity={90} style={styles.queueBlur} />
      <View style={styles.queueContainer}>
        <View style={styles.queueHandle} />
        <View style={styles.queueHeader}>
          <Text style={[styles.queueTitle, { color: colors.textPrimary }]}>Próximas en la cola</Text>
          <Text style={[styles.queueCount, { color: colors.textMuted }]}>{queue.length} canciones</Text>
          {queue.length > 0 && (
            <TouchableOpacity onPress={() => { Alert.alert('Limpiar cola', '¿Eliminar todas las canciones?', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Limpiar', style: 'destructive', onPress: clearQueue }]); }} style={styles.queueClearBtn} activeOpacity={0.7} accessibilityLabel="Limpiar cola">
              <Text style={[styles.queueClearText, { color: colors.primary }]}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
        {queue.length === 0 ? (
          <View style={styles.queueEmpty}>
            <Ionicons name="musical-notes-outline" size={48} color={colors.textDisabled} />
            <Text style={[styles.queueEmptyTitle, { color: colors.textPrimary }]}>La cola está vacía</Text>
            <Text style={[styles.queueEmptySubtitle, { color: colors.textMuted }]}>Agrega canciones desde la biblioteca o búsqueda</Text>
          </View>
        ) : (
          <FlatList
            data={queue}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.queueList}
            showsVerticalScrollIndicator={false}
            maxToRenderPerBatch={10}
            windowSize={5}
          />
        )}
      </View>
    </Animated.View>
  );
}

// ============================================
// AUDIO SETTINGS MODAL
// ============================================

interface AudioSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  crossfadeDuration: number;
  playbackRate: number;
  pitchShift: number;
  replayGainEnabled: boolean;
  gaplessEnabled: boolean;
  onCrossfadeChange: (value: number) => void;
  onPlaybackRateChange: (value: number) => void;
  onPitchShiftChange: (value: number) => void;
  onReplayGainToggle: () => void;
  onGaplessToggle: () => void;
}

function AudioSettingsModal({
  visible,
  onClose,
  crossfadeDuration,
  playbackRate,
  pitchShift,
  replayGainEnabled,
  gaplessEnabled,
  onCrossfadeChange,
  onPlaybackRateChange,
  onPitchShiftChange,
  onReplayGainToggle,
  onGaplessToggle,
}: AudioSettingsModalProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      if (!reducedMotion) {
        Animated.timing(anim, {
          toValue: 1,
          duration: ANIMATION.duration.normal,
          easing: ANIMATION.easing.easeOut,
          useNativeDriver: true,
        }).start();
      } else {
        anim.setValue(1);
      }
    } else {
      if (!reducedMotion) {
        Animated.timing(anim, {
          toValue: 0,
          duration: ANIMATION.duration.fast,
          easing: ANIMATION.easing.easeIn,
          useNativeDriver: true,
        }).start(() => onClose());
      } else {
        anim.setValue(0);
        onClose();
      }
    }
  }, [visible, reducedMotion]);

  if (!visible) return null;

  const formatCrossfade = (ms: number) => {
    if (ms === 0) return 'Desactivado';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPlaybackRate = (rate: number) => `${rate.toFixed(1)}x`;

  const formatPitchShift = (semitones: number) => {
    if (semitones === 0) return 'Normal';
    return semitones > 0 ? `+${semitones}` : `${semitones}`;
  };

  const crossfadeOptions = [0, 1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 12000];
  const playbackRateOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
  const pitchShiftOptions = [-12, -10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10, 12];

  return (
    <Animated.View
      style={[
        styles.audioModal,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_HEIGHT, 0] }) }] },
      ]}
      pointerEvents={visible ? 'auto' : 'none'}
    >
      <TouchableOpacity onPress={onClose} style={styles.audioModalOverlay} activeOpacity={1} accessibilityLabel="Cerrar configuración de audio" />
      <BlurView intensity={90} style={styles.audioModalBlur} />
      <View style={styles.audioModalContainer}>
        <View style={styles.audioModalHandle} />
        <View style={styles.audioModalHeader}>
          <Text style={[styles.audioModalTitle, { color: colors.textPrimary }]}>Configuración de Audio</Text>
          <TouchableOpacity onPress={onClose} style={styles.audioModalCloseBtn} activeOpacity={0.7} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.audioModalContent} showsVerticalScrollIndicator={false}>
          {/* Crossfade */}
          <View style={styles.audioSection}>
            <View style={styles.audioSectionHeader}>
              <Text style={[styles.audioSectionTitle, { color: colors.textPrimary }]}>Crossfade</Text>
              <Text style={[styles.audioSectionValue, { color: colors.primary }]}>{formatCrossfade(crossfadeDuration)}</Text>
            </View>
            <View style={styles.audioOptionGrid}>
              {crossfadeOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.audioOptionBtn,
                    crossfadeDuration === opt && styles.audioOptionBtnActive,
                    { backgroundColor: crossfadeDuration === opt ? colors.primary + '30' : colors.glassLight, borderColor: crossfadeDuration === opt ? colors.primary : colors.border },
                  ]}
                  onPress={() => onCrossfadeChange(opt)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Crossfade ${formatCrossfade(opt)}`}
                  accessibilityState={{ selected: crossfadeDuration === opt }}
                >
                  <Text style={[
                    styles.audioOptionText,
                    { color: crossfadeDuration === opt ? colors.primary : colors.textPrimary },
                  ]}>
                    {formatCrossfade(opt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Playback Rate */}
          <View style={styles.audioSection}>
            <View style={styles.audioSectionHeader}>
              <Text style={[styles.audioSectionTitle, { color: colors.textPrimary }]}>Velocidad de Reproducción</Text>
              <Text style={[styles.audioSectionValue, { color: colors.primary }]}>{formatPlaybackRate(playbackRate)}</Text>
            </View>
            <View style={styles.audioOptionGrid}>
              {playbackRateOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.audioOptionBtn,
                    Math.abs(playbackRate - opt) < 0.01 && styles.audioOptionBtnActive,
                    { backgroundColor: Math.abs(playbackRate - opt) < 0.01 ? colors.primary + '30' : colors.glassLight, borderColor: Math.abs(playbackRate - opt) < 0.01 ? colors.primary : colors.border },
                  ]}
                  onPress={() => onPlaybackRateChange(opt)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Velocidad ${formatPlaybackRate(opt)}`}
                  accessibilityState={{ selected: Math.abs(playbackRate - opt) < 0.01 }}
                >
                  <Text style={[
                    styles.audioOptionText,
                    { color: Math.abs(playbackRate - opt) < 0.01 ? colors.primary : colors.textPrimary },
                  ]}>
                    {formatPlaybackRate(opt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Pitch Shift */}
          <View style={styles.audioSection}>
            <View style={styles.audioSectionHeader}>
              <Text style={[styles.audioSectionTitle, { color: colors.textPrimary }]}>Cambio de Tono (Pitch)</Text>
              <Text style={[styles.audioSectionValue, { color: colors.primary }]}>{formatPitchShift(pitchShift)} semitonos</Text>
            </View>
            <View style={styles.audioOptionGrid}>
              {pitchShiftOptions.map((opt) => (
                <TouchableOpacity
                  key={opt}
                  style={[
                    styles.audioOptionBtn,
                    pitchShift === opt && styles.audioOptionBtnActive,
                    { backgroundColor: pitchShift === opt ? colors.primary + '30' : colors.glassLight, borderColor: pitchShift === opt ? colors.primary : colors.border },
                  ]}
                  onPress={() => onPitchShiftChange(opt)}
                  activeOpacity={0.7}
                  accessibilityLabel={`Pitch ${formatPitchShift(opt)}`}
                  accessibilityState={{ selected: pitchShift === opt }}
                >
                  <Text style={[
                    styles.audioOptionText,
                    { color: pitchShift === opt ? colors.primary : colors.textPrimary },
                  ]}>
                    {formatPitchShift(opt)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Toggles */}
          <View style={styles.audioSection}>
            <View style={styles.audioSectionHeader}>
              <Text style={[styles.audioSectionTitle, { color: colors.textPrimary }]}>ReplayGain</Text>
              <Text style={[styles.audioSectionValue, { color: colors.textMuted }]}>{replayGainEnabled ? 'Activado' : 'Desactivado'}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.audioToggleBtn,
                replayGainEnabled && styles.audioToggleBtnActive,
                { backgroundColor: replayGainEnabled ? colors.primary + '30' : colors.glassLight, borderColor: replayGainEnabled ? colors.primary : colors.border },
              ]}
              onPress={onReplayGainToggle}
              activeOpacity={0.7}
              accessibilityLabel={replayGainEnabled ? 'Desactivar ReplayGain' : 'Activar ReplayGain'}
              accessibilityState={{ selected: replayGainEnabled }}
            >
              <Text style={[
                styles.audioToggleText,
                { color: replayGainEnabled ? colors.primary : colors.textPrimary },
              ]}>
                Normalizar volumen automáticamente
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.audioSection}>
            <View style={styles.audioSectionHeader}>
              <Text style={[styles.audioSectionTitle, { color: colors.textPrimary }]}>Reproducción Sin Pausas (Gapless)</Text>
              <Text style={[styles.audioSectionValue, { color: colors.textMuted }]}>{gaplessEnabled ? 'Activado' : 'Desactivado'}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.audioToggleBtn,
                gaplessEnabled && styles.audioToggleBtnActive,
                { backgroundColor: gaplessEnabled ? colors.primary + '30' : colors.glassLight, borderColor: gaplessEnabled ? colors.primary : colors.border },
              ]}
              onPress={onGaplessToggle}
              activeOpacity={0.7}
              accessibilityLabel={gaplessEnabled ? 'Desactivar Gapless' : 'Activar Gapless'}
              accessibilityState={{ selected: gaplessEnabled }}
            >
              <Text style={[
                styles.audioToggleText,
                { color: gaplessEnabled ? colors.primary : colors.textPrimary },
              ]}>
                Transiciones suaves entre pistas
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Animated.View>
  );
}

// ============================================
// PLAYER SCREEN
// ============================================

export function PlayerScreen() {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const {
    currentTrack,
    queue,
    currentIndex,
    isPlaying,
    progress,
    duration,
    volume,
    isShuffle,
    repeatMode,
    isMiniPlayerVisible,
    showLyrics,
    lyricsTranslation,
    dynamicColors,
    togglePlay,
    next,
    previous,
    seek,
    setVolume,
    toggleShuffle,
    cycleRepeat,
    setShowLyrics,
    setLyricsTranslation,
    setDynamicColors,
    setMiniPlayerVisible,
    lyricsData,
    lyricsLoading,
    setLyricsData,
    setLyricsLoading,
    eqValues,
    eqEnabled,
    isAIMode,
    setShowQueue,
    showQueue,
    // Advanced Audio Features
    crossfadeDuration,
    playbackRate,
    pitchShift,
    replayGainEnabled,
    gaplessEnabled,
    setCrossfadeDuration,
    setPlaybackRate,
    setPitchShift,
    setReplayGainEnabled,
    setGaplessEnabled,
  } = usePlayerStore();

  const dragY = useSharedValue(0);
  const artworkScale = useSharedValue(1);
  const progressAnim = useSharedValue(0);
  const colorsAnim = useSharedValue(0);
  const lyricLineAnim = useSharedValue(0);
  const [explainModalVisible, setExplainModalVisible] = React.useState(false);
  const [explainLine, setExplainLine] = React.useState<ParsedLyricLine | null>(null);
  const [audioSettingsModalVisible, setAudioSettingsModalVisible] = React.useState(false);
  const [explanationText, setExplanationText] = React.useState('');
  const [explanationLoading, setExplanationLoading] = React.useState(false);
  const [showQueueSheet, setShowQueueSheet] = React.useState(false);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        dragY.value = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        dragY.value = Math.max(0, gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 500) {
          runOnJS(setMiniPlayerVisible)(false);
        } else {
          dragY.value = withSpring(0, { damping: 20, stiffness: 200 });
        }
      },
    })
  ).current;

  React.useEffect(() => {
    if (currentTrack) {
      extractColorsFromImage(currentTrack.artwork).then(extractedColors => {
        setDynamicColors(extractedColors);
        colorsAnim.value = withTiming(1, { duration: ANIMATION.duration.slow });
      });

      audioService.setCallbacks({
        onPlaybackStateChange: (state) => {},
        onProgressUpdate: (prog, dur) => {
          progressAnim.value = withTiming(prog / Math.max(dur, 1), { duration: 500 });
        },
        onTrackEnd: () => {
          runOnJS(async () => {
            const { currentTrack, progress, duration, queue, currentIndex, smartQueueMode, smartQueue } = usePlayerStore.getState();
            if (currentTrack && progress > 0) {
              // Record to history (50% or 4 minutes threshold)
              const playedPercent = progress / Math.max(duration, 1);
              const playedSeconds = progress;
              const shouldRecord = playedPercent >= 0.5 || playedSeconds >= 240;

              if (shouldRecord) {
                const { historyService } = await import('@/services/historyService');
                await historyService.recordPlay(currentTrack, 'library', playedPercent, duration);
              }
            }

            // Handle next track (crossfade, gapless, smart queue)
            const { repeatMode, isShuffle } = usePlayerStore.getState();
            const nextTrack = await audioService.playNext(
              smartQueueMode !== 'off' && smartQueue.length > 0 ? smartQueue : queue,
              currentIndex,
              repeatMode,
              isShuffle
            );

            if (nextTrack) {
              usePlayerStore.getState().setCurrentTrack(nextTrack, smartQueueMode !== 'off' && smartQueue.length > 0 ?
                smartQueue.findIndex(t => t.id === nextTrack.id) :
                queue.findIndex(t => t.id === nextTrack.id)
              );
              usePlayerStore.getState().play();
            } else {
              usePlayerStore.getState().pause();
            }
          })();
        },
        onTrackChange: (track) => {
          runOnJS(loadLyrics)(track);
          if (isAIMode && eqEnabled) {
            runOnJS(applyAdaptiveEQ)(track);
          }
        },
        onPreviousTrack: () => {
          runOnJS(async () => {
            const { queue, currentIndex, progress } = usePlayerStore.getState();
            if (queue.length === 0) return;

            // Use player store's previous logic (handles progress > 3s case)
            usePlayerStore.getState().previous();

            // Load and play the previous track
            const { currentIndex: newIndex, currentTrack: newTrack } = usePlayerStore.getState();
            if (newTrack) {
              await audioService.loadTrack(newTrack);
              await audioService.play();
            }
          })();
        },
      });

      if (isPlaying) {
        audioService.play();
      } else {
        audioService.pause();
      }

      loadLyrics(currentTrack);
      if (isAIMode && eqEnabled) {
        applyAdaptiveEQ(currentTrack);
      }
    }
  }, [currentTrack, isPlaying]);

  const loadLyrics = async (track: any) => {
    setLyricsLoading(true);
    try {
      const data = await lyricsService.fetchLyrics(track);
      if (data) {
        setLyricsData(data);
        if (lyricsTranslation) {
          const translated = await lyricsService.translateLyrics(data.synced, lyricsTranslation as 'es' | 'en');
          setLyricsData({ ...data, synced: translated });
        }
      } else {
        setLyricsData(null);
      }
    } catch (error) {
      console.warn('Failed to load lyrics:', error);
      setLyricsData(null);
    } finally {
      setLyricsLoading(false);
    }
  };

  const applyAdaptiveEQ = async (track: any) => {
    const { equalizerService } = await import('@/services/equalizerService');
    const recommendation = equalizerService.getAIRecommendation(track);
    if (recommendation.confidence > 0.6) {
      const currentEQ = eqValues;
      await equalizerService.startSmoothTransition(currentEQ, recommendation.values, 300);
    }
  };

  const handleTranslationToggle = async () => {
    if (!lyricsData) return;

    const newLang = lyricsTranslation === 'es' ? null : 'es';
    setLyricsTranslation(newLang);

    if (newLang && lyricsData) {
      setLyricsLoading(true);
      try {
        const translated = await lyricsService.translateLyrics(lyricsData.synced, newLang);
        setLyricsData({ ...lyricsData, synced: translated });
      } catch (error) {
        console.warn('Translation failed:', error);
      } finally {
        setLyricsLoading(false);
      }
    } else if (lyricsData) {
      const original = await lyricsService.fetchLyrics(currentTrack!);
      if (original) setLyricsData(original);
    }
  };

  const handleLyricLongPress = async (line: ParsedLyricLine) => {
    if (!currentTrack) return;

    setExplainLine(line);
    setExplainModalVisible(true);
    setExplanationLoading(true);

    try {
      const explanation = await lyricsService.explainLyric(line.text, {
        artist: currentTrack.artist,
        genre: currentTrack.genre || 'unknown',
      });
      setExplanationText(explanation);
    } catch (error) {
      console.warn('Explanation failed:', error);
      setExplanationText('No se pudo generar la explicación en este momento.');
    } finally {
      setExplanationLoading(false);
    }
  };

  React.useEffect(() => {
    progressAnim.value = progress / Math.max(duration, 1);
  }, [progress, duration]);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentLyricIndex = () => {
    if (!lyricsData?.synced.length) return -1;
    return lyricsData.synced.findIndex((line, index) =>
      progress >= line.time && (index === lyricsData.synced.length - 1 || progress < lyricsData.synced[index + 1].time)
    );
  };

  const currentLyricIndex = getCurrentLyricIndex();

  const backgroundColors = dynamicColors
    ? generateNeonGradients(dynamicColors)
    : [colors.background, colors.surface, colors.background];

  const primaryColor = dynamicColors?.primary || colors.primary;
  const textOnPrimary = dynamicColors?.textOnPrimary || colors.textOnPrimary;

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    backgroundColor: backgroundColors[2],
  }));

  const animatedColorOverlayStyle = useAnimatedStyle(() => ({
    opacity: colorsAnim.value,
  }));

  const animatedArtworkStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: artworkScale.value },
      { translateY: interpolate(dragY.value, [0, 150], [0, -50], 'clamp') },
    ],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: dragY.value }],
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressAnim.value * 100}%`,
  }));

  const handlePlayPause = () => {
    togglePlay();
    if (isPlaying) {
      audioService.pause();
    } else {
      audioService.play();
    }
  };

  const handleNext = () => {
    next();
    const { queue, currentIndex } = usePlayerStore.getState();
    if (queue[currentIndex + 1]) {
      audioService.loadTrack(queue[currentIndex + 1]).then(success => {
        if (success) audioService.play();
      });
    }
  };

  const handlePrevious = () => {
    previous();
    const { queue, currentIndex } = usePlayerStore.getState();
    if (queue[currentIndex - 1]) {
      audioService.loadTrack(queue[currentIndex - 1]).then(success => {
        if (success) audioService.play();
      });
    }
  };

  const handleSeek = (value: number) => {
    const newPosition = value * duration;
    seek(newPosition);
    audioService.seek(newPosition);
  };

  const handleVolumeChange = (value: number) => {
    setVolume(value);
    audioService.setVolume(value);
  };

  const handleProgressPress = (event: any) => {
    const { locationX, layout } = event.nativeEvent;
    const percentage = locationX / layout.width;
    handleSeek(percentage);
  };

  const handleQueuePress = () => {
    setShowQueueSheet(true);
  };

  if (!currentTrack) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
        <Ionicons name="musical-notes" size={64} color={colors.textDisabled} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No hay pista seleccionada</Text>
      </View>
    );
  }

  return (
    <View {...panResponder.panHandlers} style={[styles.container, { backgroundColor: colors.background }]}>
      <Animated.View style={[styles.container, animatedContainerStyle]}>
        <Animated.View style={[styles.background, animatedBackgroundStyle]}>
          <Image
            source={{ uri: currentTrack.artwork }}
            style={styles.backgroundImage}
            resizeMode="cover"
            blurRadius={50}
          />
          <BlurView intensity={95} style={StyleSheet.absoluteFill} />
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
            style={StyleSheet.absoluteFill}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <Animated.View
            style={[
              styles.colorOverlay,
              animatedColorOverlayStyle,
              { backgroundColor: primaryColor },
            ]}
          />
        </Animated.View>

        <View style={styles.handleContainer}>
          <View style={[styles.dragHandle, { backgroundColor: colors.border }]} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.artworkContainer}>
            <Animated.Image
              source={{ uri: currentTrack.artwork }}
              style={[styles.artwork, animatedArtworkStyle]}
              resizeMode="cover"
            />
            <View style={[
              styles.artworkGlow,
              { backgroundColor: primaryColor + '4D' },
            ]} />
          </View>

          <View style={styles.trackInfo}>
            <Text style={[styles.trackTitle, { color: colors.textPrimary }]} numberOfLines={1}>{currentTrack.title}</Text>
            <Text style={[styles.trackArtist, { color: primaryColor }]}>{currentTrack.artist}</Text>
            <Text style={[styles.trackAlbum, { color: colors.textMuted }]}>{currentTrack.album}</Text>
            {currentTrack.genre && (
              <View style={[styles.genreBadge, { backgroundColor: colors.glassLight, borderColor: colors.border }]}>
                <Ionicons name="musical-notes" size={12} color={colors.accent} />
                <Text style={[styles.genreBadgeText, { color: colors.textSecondary }]}>{currentTrack.genre}</Text>
              </View>
            )}
            {currentTrack.bpm && (
              <View style={[styles.genreBadge, { backgroundColor: colors.glassLight, borderColor: colors.border }]}>
                <Ionicons name="flash" size={12} color={colors.warning} />
                <Text style={[styles.genreBadgeText, { color: colors.textSecondary }]}>{currentTrack.bpm} BPM</Text>
              </View>
            )}
            {currentTrack.key && (
              <View style={[styles.genreBadge, { backgroundColor: colors.glassLight, borderColor: colors.border }]}>
                <Ionicons name="key" size={12} color={colors.secondary} />
                <Text style={[styles.genreBadgeText, { color: colors.textSecondary }]}>{currentTrack.key}</Text>
              </View>
            )}
          </View>

          <View style={styles.progressContainer}>
            <Text style={[styles.currentTime, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.mono }]}>{formatTime(progress)}</Text>
            <TouchableOpacity
              style={styles.progressBarContainer}
              onPress={handleProgressPress}
              accessibilityLabel="Barra de progreso"
              accessibilityValue={{ min: 0, max: 100, now: Math.round(progressAnim.value * 100) }}
            >
              <View style={[styles.progressBarBackground, { backgroundColor: colors.glassMedium }]} />
              <Animated.View
                style={[styles.progressBarFill, animatedProgressStyle, { backgroundColor: primaryColor }]}
              />
              <View style={[
                styles.progressBarThumb,
                { backgroundColor: primaryColor, shadowColor: primaryColor },
              ]} />
            </TouchableOpacity>
            <Text style={[styles.totalTime, { color: colors.textSecondary, fontFamily: TYPOGRAPHY.fontFamily.mono }]}>{formatTime(duration)}</Text>
          </View>

          <View style={styles.controls}>
            <TouchableOpacity
              style={[styles.controlButton, isShuffle && styles.controlButtonActive]}
              onPress={toggleShuffle}
              activeOpacity={0.7}
              accessibilityLabel={isShuffle ? 'Desactivar aleatorio' : 'Activar aleatorio'}
              accessibilityState={{ selected: isShuffle }}
            >
              <Ionicons name="shuffle" size={28} color={isShuffle ? primaryColor : colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handlePrevious} activeOpacity={0.7} accessibilityLabel="Anterior">
              <Ionicons name="play-skip-back" size={36} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.playButton, { backgroundColor: primaryColor }]} onPress={handlePlayPause} activeOpacity={0.8} accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}>
              <Ionicons name={isPlaying ? 'pause' : 'play'} size={40} color={textOnPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlButton} onPress={handleNext} activeOpacity={0.7} accessibilityLabel="Siguiente">
              <Ionicons name="play-skip-forward" size={36} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.controlButton, repeatMode !== 'off' && styles.controlButtonActive]}
              onPress={cycleRepeat}
              activeOpacity={0.7}
              accessibilityLabel={repeatMode === 'one' ? 'Repetir uno' : repeatMode === 'all' ? 'Repetir todo' : 'Desactivar repetición'}
              accessibilityState={{ selected: repeatMode !== 'off' }}
            >
              <Ionicons name={repeatMode === 'one' ? 'repeat' : 'repeat'} size={28} color={repeatMode !== 'off' ? primaryColor : colors.textMuted} />
              {repeatMode === 'one' && <View style={styles.repeatOneBadge} />}
            </TouchableOpacity>
          </View>

          <View style={styles.secondaryControls}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => { /* Show volume modal */ }} activeOpacity={0.7} accessibilityLabel="Volumen">
              <Ionicons name="volume-high" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, showLyrics && styles.secondaryButtonActive, { backgroundColor: showLyrics ? colors.primaryGlow : colors.glassLight, borderColor: showLyrics ? primaryColor : colors.border }]}
              onPress={() => setShowLyrics(!showLyrics)}
              activeOpacity={0.7}
              accessibilityLabel={showLyrics ? 'Ocultar letras' : 'Mostrar letras'}
              accessibilityState={{ selected: showLyrics }}
            >
              <Ionicons name="musical-notes" size={24} color={showLyrics ? primaryColor : colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, isAIMode && styles.secondaryButtonActive, { backgroundColor: isAIMode ? colors.accent + '20' : colors.glassLight, borderColor: isAIMode ? colors.accent : colors.border }]}
              onPress={() => { /* Navigate to equalizer */ }}
              activeOpacity={0.7}
              accessibilityLabel={isAIMode ? 'Desactivar EQ adaptativo' : 'Activar EQ adaptativo'}
              accessibilityState={{ selected: isAIMode }}
            >
              <Ionicons name="bar-chart" size={24} color={isAIMode ? colors.accent : colors.textSecondary} />
              {isAIMode && <View style={styles.aiIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleQueuePress}
              activeOpacity={0.7}
              accessibilityLabel={`Cola de reproducción, ${queue.length} canciones`}
            >
              <Ionicons name="reorder-three" size={24} color={colors.textSecondary} />
              {queue.length > 1 && (
                <View style={styles.queueBadge}>
                  <Text style={styles.queueBadgeText}>{queue.length}</Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setAudioSettingsModalVisible(true)}
              activeOpacity={0.7}
              accessibilityLabel="Configuración de audio avanzada"
            >
              <Ionicons name="settings" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {showLyrics && (
            <View style={styles.lyricsSection}>
              <View style={styles.lyricsHeader}>
                <Text style={[styles.lyricsTitle, { color: colors.textPrimary }]}>Letras</Text>
                <View style={styles.lyricsHeaderActions}>
                  {lyricsLoading && (
                    <View style={styles.loadingSpinner}>
                      <Animated.View
                        style={[
                          styles.loadingIcon,
                          { backgroundColor: primaryColor },
                        ]}
                      >
                        <Ionicons name="refresh" size={20} color={textOnPrimary} />
                      </Animated.View>
                    </View>
                  )}
                  <TouchableOpacity onPress={handleTranslationToggle} disabled={lyricsLoading || !lyricsData} activeOpacity={0.7} accessibilityLabel={lyricsTranslation ? 'Mostrar original' : 'Traducir al español'}>
                    <Ionicons
                      name="language"
                      size={20}
                      color={lyricsTranslation ? primaryColor : colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.lyricsContent}>
                {lyricsLoading ? (
                  <Text style={[styles.lyricTextDim, { color: colors.textDisabled }]}>Cargando letras...</Text>
                ) : lyricsData?.synced.length ? (
                  lyricsData.synced.map((line, index) => (
                    <LyricLine
                      key={index}
                      line={line}
                      index={index}
                      isActive={index === currentLyricIndex}
                      activeColor={primaryColor}
                      onLongPress={() => handleLyricLongPress(line)}
                      translation={lyricsTranslation && line.translation ? line.translation : undefined}
                    />
                  ))
                ) : (
                  <View style={styles.noLyricsContainer}>
                    <Ionicons name="musical-notes-outline" size={32} color={colors.textDisabled} />
                    <Text style={[styles.noLyricsText, { color: colors.textMuted }]}>No hay letras disponibles</Text>
                    <Text style={[styles.noLyricsSubtext, { color: colors.textDisabled }]}>Intenta buscar en LRCLIB o agregar manualmente</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      {/* Queue Bottom Sheet */}
      <QueueBottomSheet
        visible={showQueueSheet}
        onClose={() => setShowQueueSheet(false)}
        onReorder={() => {}}
        onRemove={() => {}}
        onPlay={() => {}}
      />

      {/* Lyric Explain Modal */}
      <Modal
        visible={explainModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setExplainModalVisible(false);
          setExplainLine(null);
          setExplanationText('');
        }}
      >
        <TouchableOpacity onPress={() => {
          setExplainModalVisible(false);
          setExplainLine(null);
          setExplanationText('');
          Keyboard.dismiss();
        }} activeOpacity={1} style={styles.modalOverlay}>
          <Animated.View style={[styles.modalContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
            <View style={styles.modalHeader}>
              <View style={[styles.modalIcon, { backgroundColor: colors.accent + '20' }]}>
                <Ionicons name="sparkles" size={28} color={colors.accent} />
              </View>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Vortex Lyric Explain</Text>
            </View>
            {explainLine && (
              <View style={[styles.modalLineContainer, { backgroundColor: colors.glassMedium, borderColor: colors.accentGlow }]}>
                <Text style={[styles.modalLineText, { color: colors.textPrimary }]}>{explainLine.text}</Text>
                {explainLine.translation && (
                  <Text style={[styles.modalLineTranslation, { color: colors.textSecondary }]}>{explainLine.translation}</Text>
                )}
              </View>
            )}
            <View style={[styles.modalDivider, { backgroundColor: colors.border }]} />
            <ScrollView style={styles.modalExplanationContent} showsVerticalScrollIndicator={false}>
              {explanationLoading ? (
                <View style={styles.modalLoading}>
                  <Animated.View
                    style={[
                      styles.loadingIcon,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Ionicons name="refresh" size={24} color={colors.textOnPrimary} />
                  </Animated.View>
                  <Text style={[styles.modalLoadingText, { color: colors.textMuted }]}>Generando explicación...</Text>
                </View>
              ) : (
                <Text style={[styles.modalExplanationText, { color: colors.textSecondary }]}>{explanationText}</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, { backgroundColor: colors.primaryGlow, borderColor: primaryColor }]}
              onPress={() => {
                setExplainModalVisible(false);
                setExplainLine(null);
                setExplanationText('');
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalCloseButtonText, { color: primaryColor }]}>Cerrar</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

        {/* Audio Settings Modal */}
        <AudioSettingsModal
          visible={audioSettingsModalVisible}
          onClose={() => setAudioSettingsModalVisible(false)}
          crossfadeDuration={crossfadeDuration}
          playbackRate={playbackRate}
          pitchShift={pitchShift}
          replayGainEnabled={replayGainEnabled}
          gaplessEnabled={gaplessEnabled}
          onCrossfadeChange={setCrossfadeDuration}
          onPlaybackRateChange={setPlaybackRate}
          onPitchShiftChange={setPitchShift}
          onReplayGainToggle={() => setReplayGainEnabled(!replayGainEnabled)}
          onGaplessToggle={() => setGaplessEnabled(!gaplessEnabled)}
        />
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
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundImage: {
    ...StyleSheet.absoluteFillObject,
  },
  colorOverlay: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  dragHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: 160,
    alignItems: 'center',
  },
  artworkContainer: {
    position: 'relative',
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  artwork: {
    width: 300,
    height: 300,
    borderRadius: BORDER_RADIUS.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.4,
    shadowRadius: 40,
    elevation: 24,
  },
  artworkGlow: {
    position: 'absolute',
    top: -24,
    left: -24,
    right: -24,
    bottom: -24,
    borderRadius: BORDER_RADIUS.xl + 24,
    opacity: 0.25,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    width: '100%',
  },
  trackTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.tight * TYPOGRAPHY.fontSize.xxxl,
  },
  trackArtist: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginTop: SPACING.sm,
  },
  trackAlbum: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  genreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  genreBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    width: '100%',
    maxWidth: 360,
    marginBottom: SPACING.xl,
  },
  currentTime: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    minWidth: 45,
  },
  totalTime: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    minWidth: 45,
    textAlign: 'right',
  },
  progressBarContainer: {
    flex: 1,
    height: 8,
    position: 'relative',
    borderRadius: 4,
  },
  progressBarBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 4,
  },
  progressBarFill: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderRadius: 4,
    width: '0%',
  },
  progressBarThumb: {
    position: 'absolute',
    top: -5,
    right: -5,
    width: 18,
    height: 18,
    borderRadius: 9,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xl,
    marginBottom: SPACING.xl,
  },
  controlButton: {
    padding: SPACING.sm,
  },
  controlButtonActive: {},
  playButton: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  repeatOneBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.lg,
    marginBottom: SPACING.xxxl,
  },
  secondaryButton: {
    position: 'relative',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  secondaryButtonActive: {},
  aiIndicator: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  queueBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ff3344',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  queueBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#fff',
  },
  lyricsSection: {
    width: '100%',
    maxWidth: 420,
    paddingHorizontal: SPACING.md,
  },
  lyricsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  lyricsHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  lyricsTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  lyricsContent: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  lyricLineContainer: {
    width: '100%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  lyricLineInner: {
    width: '100%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  lyricText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    textAlign: 'center',
  },
  lyricTextDim: {
    opacity: 0.6,
  },
  lyricTextActive: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    opacity: 1,
  },
  activeIndicator: {
    position: 'absolute',
    left: -8,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  noLyricsContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
    gap: SPACING.sm,
  },
  noLyricsText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  noLyricsSubtext: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  loadingSpinner: {
    padding: SPACING.xs,
  },
  loadingIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
  // MiniPlayer
  miniPlayer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },
  miniBlur: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  miniTouchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    minHeight: 88,
  },
  miniArtwork: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  miniInfo: {
    flex: 1,
    marginHorizontal: SPACING.md,
    minWidth: 0,
  },
  miniTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  miniArtist: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  miniProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginHorizontal: SPACING.md,
    width: 120,
  },
  miniProgressBar: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 1.5,
    overflow: 'hidden',
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: 1.5,
    width: '0%',
  },
  miniTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    minWidth: 35,
  },
  miniControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
    marginLeft: SPACING.md,
  },
  miniControlBtn: {
    padding: SPACING.xs,
  },
  miniPlayBtn: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
  },
  // Queue Sheet
  queueSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  queueOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  queueBlur: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  queueContainer: {
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  queueHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#3a3a4a',
    alignSelf: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  queueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.md,
  },
  queueTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  queueCount: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  queueClearBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  queueClearText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  queueList: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
    paddingBottom: SPACING.xl,
  },
  queueItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
  },
  queueItemPlaying: {
    borderWidth: 1,
    borderColor: '#00d4ff40',
  },
  queueNumber: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  queueNumberText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  queueArtwork: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
  },
  queueInfo: {
    flex: 1,
    minWidth: 0,
  },
  queueItemTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  queueArtist: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  queueRemoveBtn: {
    padding: SPACING.xs,
  },
  queueEmpty: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    gap: SPACING.md,
  },
  queueEmptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textAlign: 'center',
  },
  queueEmptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    textAlign: 'center',
    maxWidth: '80%',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.md,
    maxHeight: '85%',
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 20,
  },
  modalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    flex: 1,
  },
  modalLineContainer: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
  },
  modalLineText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  modalLineTranslation: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalDivider: {
    height: 1,
    marginVertical: SPACING.md,
  },
  modalExplanationContent: {
    maxHeight: 350,
    paddingRight: SPACING.md,
  },
  modalLoading: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    gap: SPACING.md,
  },
  modalLoadingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  modalExplanationText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md,
  },
  modalCloseButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  // Audio Settings Modal
  audioModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  audioModalOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  audioModalBlur: {
    ...StyleSheet.absoluteFillObject,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  audioModalContainer: {
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  audioModalHandle: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#3a3a4a',
    alignSelf: 'center',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  audioModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    marginBottom: SPACING.lg,
  },
  audioModalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  audioModalCloseBtn: {
    padding: SPACING.xs,
  },
  audioModalContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
    gap: SPACING.xl,
  },
  audioSection: {
    gap: SPACING.md,
  },
  audioSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  audioSectionValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  audioOptionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  audioOptionBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  audioOptionBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  audioOptionText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  audioToggleBtn: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  audioToggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  audioToggleText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});