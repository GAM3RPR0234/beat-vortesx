import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  PanResponder,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColors, useReducedMotion, SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/hooks/useColors';
import { usePlayerStore } from '@/store/playerStore';
import { equalizerService, EQPreset } from '@/services/equalizerService';
import { impactAsync, notificationAsync, selectionAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';

const EQ_BANDS = [60, 170, 310, 600, 1000, 3000, 6000, 12000, 16000];

const BUILTIN_PRESETS: EQPreset[] = [
  { name: 'Plano', values: [0, 0, 0, 0, 0, 0, 0, 0, 0], icon: 'remove', genre: 'neutral' },
  { name: 'Bass Boost', values: [8, 6, 3, 0, -2, -4, -4, -6, -8], icon: 'volume-high', genre: 'bass' },
  { name: 'Vocal', values: [-4, -2, 0, 2, 4, 6, 4, 2, 0], icon: 'mic', genre: 'vocal' },
  { name: 'Electrónica', values: [6, 4, 2, 0, -2, 2, 6, 8, 6], icon: 'flash', genre: 'electronic' },
  { name: 'Rock', values: [5, 3, 0, -2, -2, 0, 3, 5, 4], icon: 'git-network', genre: 'rock' },
  { name: 'Clásica', values: [0, 0, 2, 4, 4, 2, 0, -2, -4], icon: 'musical-notes', genre: 'classical' },
  { name: 'Cyberpunk', values: [8, 6, 4, 2, 0, 4, 8, 10, 8], icon: 'rocket', genre: 'synthwave' },
  { name: 'IA Adaptativo', values: [4, 3, 2, 1, 0, 3, 6, 8, 7], icon: 'sparkles', isAI: true, genre: 'ai' },
];

const GENRE_PRESETS: EQPreset[] = [
  { name: 'Synthwave', values: [7, 5, 3, 1, 0, 3, 7, 9, 8], icon: 'planet', genre: 'synthwave' },
  { name: 'Dark Synth', values: [9, 7, 4, 2, 0, 2, 6, 8, 7], icon: 'moon', genre: 'darksynth' },
  { name: 'Cyberpunk', values: [8, 6, 4, 2, 0, 4, 8, 10, 8], icon: 'rocket', genre: 'cyberpunk' },
  { name: 'Retrowave', values: [6, 4, 2, 0, -1, 2, 6, 8, 7], icon: 'sunny', genre: 'retrowave' },
  { name: 'Chillwave', values: [4, 3, 2, 1, 0, 2, 4, 5, 4], icon: 'leaf', genre: 'chillwave' },
  { name: 'EDM', values: [8, 6, 3, 0, -2, 2, 7, 9, 8], icon: 'flash', genre: 'edm' },
  { name: 'Techno', values: [7, 5, 2, 0, -1, 1, 5, 7, 6], icon: 'radio', genre: 'techno' },
  { name: 'House', values: [6, 4, 2, 0, -1, 1, 5, 7, 6], icon: 'musical-notes', genre: 'house' },
  { name: 'Trap', values: [9, 7, 4, 1, -1, 1, 4, 6, 5], icon: 'git-compare', genre: 'trap' },
  { name: 'Lo-Fi', values: [5, 3, 2, 1, 0, -1, 2, 3, 2], icon: 'cafe', genre: 'lofi' },
];

function EqBand({
  frequency,
  value,
  onChange,
  index: _index,
  isAI = false,
  fftValue = 0,
  colors,
  reducedMotion,
}: {
  frequency: number;
  value: number;
  onChange: (value: number) => void;
  index: number;
  isAI?: boolean;
  fftValue?: number;
  colors: ReturnType<typeof useColors>;
  reducedMotion: boolean;
}) {
  const panAnim = React.useRef(new Animated.Value(0));
  const panValue = React.useRef(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const fftAnim = React.useRef(new Animated.Value(0));
  const [lastHapticValue, setLastHapticValue] = React.useState(value);

  React.useEffect(() => {
    if (!isDragging) {
      panValue.current = value * 15;
      if (reducedMotion) {
        panAnim.current.setValue(value * 15);
      } else {
        Animated.timing(panAnim.current, {
          toValue: value * 15,
          duration: ANIMATION.duration.fast,
          useNativeDriver: false,
        }).start();
      }
    }
  }, [value, isDragging, reducedMotion]);

  React.useEffect(() => {
    if (reducedMotion) {
      fftAnim.current.setValue(fftValue);
    } else {
      Animated.timing(fftAnim.current, {
        toValue: fftValue,
        duration: 50,
        useNativeDriver: false,
      }).start();
    }
  }, [fftValue, reducedMotion]);

  React.useEffect(() => {
    if (isDragging && value !== lastHapticValue && value % 2 === 0) {
      setLastHapticValue(value);
      selectionAsync();
    }
  }, [value, isDragging, lastHapticValue]);

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        setIsDragging(true);
        setLastHapticValue(value);
        impactAsync(ImpactFeedbackStyle.Light);
      },
      onPanResponderMove: Animated.event(
        [{ nativeEvent: { translationY: panAnim.current } }],
        { useNativeDriver: false, listener: ({ nativeEvent }: any) => { panValue.current = nativeEvent.translationY; } }
      ),
      onPanResponderRelease: () => {
        const clampedTranslation = Math.max(-180, Math.min(180, panValue.current));
        panAnim.current.setValue(clampedTranslation);
        panValue.current = clampedTranslation;
        const clampedValue = Math.max(-12, Math.min(12, Math.round(-clampedTranslation / 15)));
        onChange(clampedValue);
        setIsDragging(false);
        impactAsync(ImpactFeedbackStyle.Light);
      },
      onPanResponderTerminate: () => {
        const clampedValue = Math.max(-12, Math.min(12, Math.round(-panValue.current / 15)));
        onChange(clampedValue);
        setIsDragging(false);
      },
    })
  ).current;

  const freqLabel = frequency >= 1000 ? `${frequency / 1000}k` : `${frequency}`;
  const freqUnit = frequency >= 1000 ? 'kHz' : 'Hz';

  const bandColor = isAI ? colors.accent : colors.primary;
  const bandGlow = isAI ? colors.accentGlow : colors.primaryGlow;

  return (
    <View style={styles.bandContainer} {...panResponder.panHandlers}>
      <Animated.View
        style={[
          styles.fftBar,
          {
            height: fftAnim.current.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
              extrapolate: 'clamp',
            }),
            backgroundColor: colors.accentGlow,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.bandFill,
          {
            height: panAnim.current.interpolate({
              inputRange: [-180, 180],
              outputRange: ['100%', '0%'],
              extrapolate: 'clamp',
            }),
            backgroundColor: bandGlow,
          },
          isAI && styles.bandFillAI,
        ]}
      />
      <View style={[styles.bandCenterLine, { backgroundColor: colors.border }]} />

      <View style={styles.bandValue}>
        {value > 0 && <Text style={[styles.valueTextPositive, { color: colors.success }]}>+{value}</Text>}
        {value === 0 && <Text style={[styles.valueTextZero, { color: colors.textMuted }]}>0</Text>}
        {value < 0 && <Text style={[styles.valueTextNegative, { color: colors.error }]}>{value}</Text>}
        <Text style={[styles.valueUnit, { color: colors.textDisabled }]}>dB</Text>
      </View>

      <Text style={[
        styles.freqLabel,
        isAI && styles.freqLabelAI,
        { color: isAI ? colors.accent : colors.textSecondary },
      ]}>
        {freqLabel}
      </Text>
      <Text style={[styles.freqUnit, { color: colors.textDisabled }]}>{freqUnit}</Text>
    </View>
  );
}

function PresetButton({
  preset,
  isActive,
  onPress,
  colors,
}: {
  preset: EQPreset;
  isActive: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const genreColors: Record<string, string> = {
    bass: '#00d4ff',
    vocal: '#ff2d75',
    electronic: '#b84dff',
    rock: '#ff9500',
    classical: '#34c759',
    synthwave: '#ff00ff',
    darksynth: '#8b00ff',
    cyberpunk: '#00ffff',
    retrowave: '#ff6b35',
    chillwave: '#00b4d8',
    edm: '#ff006e',
    techno: '#8338ec',
    house: '#3a86ff',
    trap: '#ff006e',
    lofi: '#8ecae6',
    ai: '#f72585',
    neutral: '#666666',
  };

  const genreColor = genreColors[preset.genre || 'neutral'] || colors.primary;

  return (
    <TouchableOpacity
      style={[
        styles.presetButton,
        isActive && styles.presetButtonActive,
        preset.isAI && styles.presetButtonAI,
        { borderColor: isActive ? genreColor : colors.border, backgroundColor: isActive ? genreColor + '20' : colors.surface },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Preajuste ${preset.name}${isActive ? ', activo' : ''}`}
    >
      <View style={[
        styles.presetIconContainer,
        { backgroundColor: isActive ? genreColor + '30' : colors.glassMedium },
      ]}>
        <Ionicons name={preset.icon as any} size={20} color={isActive ? genreColor : colors.primary} />
      </View>
      <Text style={[
        styles.presetName,
        isActive && styles.presetNameActive,
        { color: isActive ? genreColor : colors.textPrimary },
      ]}>
        {preset.name}
      </Text>
      {preset.isAI && (
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={10} color={colors.accent} />
        </View>
      )}
      {preset.genre && !preset.isAI && (
        <View style={[styles.genreBadge, { backgroundColor: genreColor + '20', borderColor: genreColor + '40' }]}>
          <Text style={[styles.genreBadgeText, { color: genreColor }]}>{preset.genre}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function GenreChip({
  genre,
  isActive,
  onPress,
  colors,
}: {
  genre: string;
  isActive: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.genreChip,
        isActive && styles.genreChipActive,
        { backgroundColor: isActive ? colors.primaryGlow : colors.surface, borderColor: isActive ? colors.primary : colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={`Género ${genre}${isActive ? ', seleccionado' : ''}`}
    >
      <Text style={[
        styles.genreChipText,
        isActive && styles.genreChipTextActive,
        { color: isActive ? colors.primary : colors.textSecondary },
      ]}>
        {genre}
      </Text>
    </TouchableOpacity>
  );
}

export function EqualizerScreen() {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const {
    currentTrack,
    eqValues,
    setEQValues,
    eqPreset: storeEqPreset,
    setEQPreset: storeSetEQPreset,
    eqEnabled: storeEqEnabled,
    setEQEnabled: storeSetEQEnabled,
    isAIMode: storeIsAIMode,
    toggleAIMode: storeToggleAIMode,
  } = usePlayerStore();

  const [eqValuesLocal, setEQValuesLocal] = React.useState<number[]>(eqValues);
  const [activePreset, setActivePreset] = React.useState<string | null>(storeEqPreset || 'Plano');
  const [isEnabled, setIsEnabled] = React.useState(storeEqEnabled);
  const [isAIMode, setIsAIMode] = React.useState(storeIsAIMode);
  const [userPresets, setUserPresets] = React.useState<EQPreset[]>([]);
  const [showSavePreset, setShowSavePreset] = React.useState(false);
  const [newPresetName, setNewPresetName] = React.useState('');
  const [fftData, setFftData] = React.useState<Uint8Array | null>(null);
  const [aiConfidence, setAiConfidence] = React.useState<number>(0);
  const [editingPreset, setEditingPreset] = React.useState<EQPreset | null>(null);
  const [editPresetName, setEditPresetName] = React.useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState<string | null>(null);

  React.useEffect(() => {
    setEQValuesLocal(eqValues);
  }, [eqValues]);

  React.useEffect(() => {
    const loadUserPresets = async () => {
      const presets = await equalizerService.getUserPresets();
      setUserPresets(presets);
    };
    loadUserPresets();
  }, []);

  React.useEffect(() => {
    if (currentTrack) {
      const recommendation = equalizerService.getAIRecommendation(currentTrack);
      setAiConfidence(recommendation.confidence);

      if (isAIMode && isEnabled) {
        const aiPreset = BUILTIN_PRESETS.find(p => p.isAI);
        if (aiPreset) {
          const newValues = equalizerService.applyPreset('IA Adaptativo', eqValuesLocal);
          setEQValuesLocal(newValues);
          setEQValues(newValues);
          setActivePreset('IA Adaptativo');
          storeSetEQPreset('IA Adaptativo');
        }
      }
    }
  }, [currentTrack, isAIMode, isEnabled, eqValuesLocal]);

  React.useEffect(() => {
    if (!currentTrack) return;

    let audioElement: HTMLAudioElement | null = null;
    if (Platform.OS === 'web') {
      const audioElements = document.getElementsByTagName('audio');
      if (audioElements.length > 0) {
        audioElement = audioElements[0] as HTMLAudioElement;
      }
    }

    if (audioElement) {
      equalizerService.initAudioContext(audioElement).then(() => {
        const unsubscribe = equalizerService.subscribeFFT((data) => {
          setFftData(data);
        });
        return () => unsubscribe();
      });
    }

    return () => {
      equalizerService.stopRealTimeAnalysis();
    };
  }, [currentTrack]);

  const getFFTForBand = (bandIndex: number): number => {
    if (!fftData) return 0;
    const freq = EQ_BANDS[bandIndex];
    const nextFreq = EQ_BANDS[bandIndex + 1] || 20000;
    const bands = equalizerService.getBandsForFrequencyRange(freq, nextFreq);
    if (bands.length === 0) return 0;
    return bands.reduce((sum, val) => sum + val, 0) / bands.length;
  };

  const applyPreset = async (preset: EQPreset) => {
    const newValues = equalizerService.applyPreset(preset.name, eqValuesLocal);
    setEQValuesLocal(newValues);
    setEQValues(newValues);
    setActivePreset(preset.name);
    storeSetEQPreset(preset.name);
    setIsAIMode(preset.isAI || false);
    if (preset.isAI !== isAIMode) storeToggleAIMode();
    impactAsync(ImpactFeedbackStyle.Light);
  };

  const handleBandChange = (index: number, value: number) => {
    const newValues = [...eqValuesLocal];
    newValues[index] = value;
    setEQValuesLocal(newValues);
    setEQValues(newValues);
    setActivePreset('Personalizado');
    storeSetEQPreset('Personalizado');
    if (isAIMode) {
      setIsAIMode(false);
      storeToggleAIMode();
    }
  };

  const resetEQ = () => {
    const newValues = new Array(9).fill(0);
    setEQValuesLocal(newValues);
    setEQValues(newValues);
    setActivePreset('Plano');
    storeSetEQPreset('Plano');
    if (isAIMode) {
      setIsAIMode(false);
      storeToggleAIMode();
    }
    impactAsync(ImpactFeedbackStyle.Medium);
  };

  const handleSavePreset = async () => {
    if (!newPresetName.trim()) return;

    const preset: EQPreset = {
      name: newPresetName.trim(),
      values: [...eqValuesLocal],
      icon: 'tune',
      genre: 'custom',
    };

    await equalizerService.saveUserPreset(preset);
    setUserPresets(await equalizerService.getUserPresets());
    setShowSavePreset(false);
    setNewPresetName('');
    notificationAsync(NotificationFeedbackType.Success);
  };

  const handleEditPreset = (preset: EQPreset) => {
    setEditingPreset(preset);
    setEditPresetName(preset.name);
  };

  const handleSaveEdit = async () => {
    if (!editingPreset || !editPresetName.trim()) return;

    const updatedPreset: EQPreset = {
      ...editingPreset,
      name: editPresetName.trim(),
    };

    await equalizerService.deleteUserPreset(editingPreset.name);
    await equalizerService.saveUserPreset(updatedPreset);
    setUserPresets(await equalizerService.getUserPresets());
    setEditingPreset(null);
    setEditPresetName('');
    if (activePreset === editingPreset.name) {
      setActivePreset(updatedPreset.name);
    }
    notificationAsync(NotificationFeedbackType.Success);
  };

  const handleDeletePreset = async (name: string) => {
    await equalizerService.deleteUserPreset(name);
    setUserPresets(await equalizerService.getUserPresets());
    setShowDeleteConfirm(null);
    if (activePreset === name) {
      setActivePreset('Plano');
    }
    notificationAsync(NotificationFeedbackType.Warning);
  };

  const handleToggleEnabled = () => {
    const newEnabled = !isEnabled;
    setIsEnabled(newEnabled);
    storeSetEQEnabled(newEnabled);
    impactAsync(ImpactFeedbackStyle.Light);
  };

  const handleToggleAI = () => {
    const newAIMode = !isAIMode;
    setIsAIMode(newAIMode);
    storeToggleAIMode();
    if (newAIMode && currentTrack) {
      const recommendation = equalizerService.getAIRecommendation(currentTrack);
      const newValues = equalizerService.applyPreset('IA Adaptativo', recommendation.values);
      setEQValuesLocal(newValues);
      setEQValues(newValues);
      setActivePreset('IA Adaptativo');
      storeSetEQPreset('IA Adaptativo');
    }
    impactAsync(ImpactFeedbackStyle.Medium);
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: colors.background }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerMain}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Ecualizador</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Ajuste de frecuencia inteligente</Text>
          </View>
          <TouchableOpacity
            style={[
              styles.enableToggle,
              isEnabled && styles.enableToggleActive,
              { backgroundColor: isEnabled ? colors.primaryGlow : colors.border },
            ]}
            onPress={handleToggleEnabled}
            activeOpacity={0.8}
            accessibilityRole="switch"
            accessibilityState={{ checked: isEnabled }}
            accessibilityLabel={isEnabled ? 'Ecualizador activado' : 'Ecualizador desactivado'}
          >
            <View style={[
              styles.toggleThumb,
              isEnabled && styles.toggleThumbActive,
              { backgroundColor: isEnabled ? colors.primary : colors.textPrimary },
            ]} />
          </TouchableOpacity>
        </View>

        {currentTrack && currentTrack.genre && (
          <View style={[styles.currentTrackGenre, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.genreBadge, { backgroundColor: colors.glassLight, borderColor: colors.primaryGlow }]}>
              <Ionicons name="musical-notes" size={14} color={colors.primary} />
              <Text style={[styles.genreBadgeText, { color: colors.textSecondary }]}>Género actual: {currentTrack.genre}</Text>
            </View>
            {isAIMode && aiConfidence > 0 && (
              <View style={[styles.confidenceBadge, { backgroundColor: colors.accentGlow, borderColor: colors.accent }]}>
                <Ionicons name="sparkles" size={14} color={colors.accent} />
                <Text style={[styles.confidenceText, { color: colors.accent }]}>
                  Confianza IA: {Math.round(aiConfidence * 100)}%
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={[styles.eqContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.eqLabels}>
            <Text style={[styles.eqLabel, { color: colors.textDisabled }]}>GANANCIA (dB)</Text>
            <Text style={[styles.eqLabel, { color: colors.textDisabled }]}>FRECUENCIA</Text>
          </View>
          <View style={styles.bandsContainer}>
            {EQ_BANDS.map((freq, index) => (
              <EqBand
                key={freq}
                frequency={freq}
                value={eqValuesLocal[index]}
                onChange={(val) => handleBandChange(index, val)}
                index={index}
                isAI={isAIMode}
                fftValue={getFFTForBand(index)}
                colors={colors}
                reducedMotion={reducedMotion}
              />
            ))}
          </View>
        </View>

        <View style={styles.presetsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Preajustes del Sistema</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity onPress={resetEQ} activeOpacity={0.7} accessibilityLabel="Restablecer ecualizador">
                <Text style={[styles.resetText, { color: colors.primary }]}>Restablecer</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowSavePreset(true)} activeOpacity={0.7} accessibilityLabel="Guardar preajuste actual">
                <Text style={[styles.saveText, { color: colors.accent }]}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsList}>
            {[...BUILTIN_PRESETS].map((preset) => (
              <PresetButton
                key={preset.name}
                preset={preset}
                isActive={activePreset === preset.name}
                onPress={() => applyPreset(preset)}
                colors={colors}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.presetsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Por Género</Text>
            <View style={styles.sectionActions}>
              <TouchableOpacity onPress={() => setShowSavePreset(true)} activeOpacity={0.7} accessibilityLabel="Guardar preajuste actual">
                <Text style={[styles.saveText, { color: colors.accent }]}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.genreChipsContainer}>
            {GENRE_PRESETS.map((preset) => (
              <GenreChip
                key={preset.name}
                genre={preset.name}
                isActive={activePreset === preset.name}
                onPress={() => applyPreset(preset)}
                colors={colors}
              />
            ))}
          </View>
        </View>

        {userPresets.length > 0 && (
          <View style={styles.presetsSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tus Preajustes</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetsList}>
              {userPresets.map((preset) => (
                <View key={preset.name} style={styles.userPresetWrapper}>
                  <PresetButton
                    preset={preset}
                    isActive={activePreset === preset.name}
                    onPress={() => applyPreset(preset)}
                    colors={colors}
                  />
                  <TouchableOpacity
                    style={[styles.presetActionButton, { backgroundColor: colors.glassMedium }]}
                    onPress={() => handleEditPreset(preset)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Editar ${preset.name}`}
                  >
                    <Ionicons name="create-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.presetActionButton, { backgroundColor: colors.error + '20' }]}
                    onPress={() => setShowDeleteConfirm(preset.name)}
                    activeOpacity={0.7}
                    accessibilityLabel={`Eliminar ${preset.name}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={[styles.aiSection, { marginBottom: SPACING.xl }]}>
          <View style={[styles.aiCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LinearGradient
              colors={[colors.primaryGlow, colors.secondaryGlow]}
              style={styles.aiCardGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.aiCardContent}>
              <View style={[styles.aiIcon, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="sparkles" size={32} color={colors.primary} />
              </View>
              <View style={styles.aiTextContainer}>
                <Text style={[styles.aiTitle, { color: colors.textPrimary }]}>Vortex AI · Ecualizador Adaptativo</Text>
                <Text style={[styles.aiDescription, { color: colors.textMuted }]}>
                  La IA analiza el género, BPM y estructura espectral de la pista actual
                  para aplicar el preajuste óptimo en tiempo real.
                </Text>
                {currentTrack && currentTrack.genre && (
                  <View style={[styles.aiCurrentPreset, { backgroundColor: colors.glassMedium }]}>
                    <Text style={[styles.aiCurrentPresetLabel, { color: colors.textMuted }]}>Preajuste recomendado:</Text>
                    <Text style={[styles.aiCurrentPresetValue, { color: colors.accent }]}>
                      {equalizerService.getAIRecommendation(currentTrack).preset}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.aiToggle,
                  isAIMode && styles.aiToggleActive,
                  { backgroundColor: isAIMode ? colors.accentGlow : colors.border },
                ]}
                onPress={handleToggleAI}
                activeOpacity={0.8}
                accessibilityRole="switch"
                accessibilityState={{ checked: isAIMode }}
                accessibilityLabel={isAIMode ? 'Modo IA activado' : 'Modo IA desactivado'}
              >
                <View style={[
                  styles.aiToggleThumb,
                  isAIMode && styles.aiToggleThumbActive,
                  { backgroundColor: isAIMode ? colors.accent : colors.textPrimary },
                ]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={[styles.bottomSpacer, { height: 100 }]} />
      </ScrollView>

      {showSavePreset && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={showSavePreset}
          onRequestClose={() => setShowSavePreset(false)}
        >
          <TouchableOpacity
            style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
            onPress={() => setShowSavePreset(false)}
            activeOpacity={1}
          >
            <View style={[styles.modalContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Guardar Preajuste</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Dale un nombre a tu configuración actual</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={newPresetName}
                onChangeText={setNewPresetName}
                placeholder="Mi Preajuste"
                autoFocus
                maxLength={30}
                placeholderTextColor={colors.textDisabled}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { backgroundColor: colors.glassMedium, borderColor: colors.border }]}
                  onPress={() => {
                    setShowSavePreset(false);
                    setNewPresetName('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}
                  onPress={handleSavePreset}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textOnPrimary }]}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {editingPreset && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!editingPreset}
          onRequestClose={() => {
            setEditingPreset(null);
            setEditPresetName('');
          }}
        >
          <TouchableOpacity
            style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
            onPress={() => {
              setEditingPreset(null);
              setEditPresetName('');
            }}
            activeOpacity={1}
          >
            <View style={[styles.modalContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Editar Preajuste</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Cambia el nombre de tu preajuste</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
                value={editPresetName}
                onChangeText={setEditPresetName}
                placeholder="Nombre del preajuste"
                autoFocus
                maxLength={30}
                placeholderTextColor={colors.textDisabled}
              />
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { backgroundColor: colors.glassMedium, borderColor: colors.border }]}
                  onPress={() => {
                    setEditingPreset(null);
                    setEditPresetName('');
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}
                  onPress={handleSaveEdit}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textOnPrimary }]}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {showDeleteConfirm && (
        <Modal
          animationType="slide"
          transparent={true}
          visible={!!showDeleteConfirm}
          onRequestClose={() => setShowDeleteConfirm(null)}
        >
          <TouchableOpacity
            style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}
            onPress={() => setShowDeleteConfirm(null)}
            activeOpacity={1}
          >
            <View style={[styles.modalContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Eliminar Preajuste</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>¿Eliminar "{showDeleteConfirm}"? Esta acción no se puede deshacer.</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { backgroundColor: colors.glassMedium, borderColor: colors.border }]}
                  onPress={() => setShowDeleteConfirm(null)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, { backgroundColor: colors.error + '30', borderColor: colors.error }]}
                  onPress={() => handleDeletePreset(showDeleteConfirm!)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: colors.error }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    borderBottomWidth: 1,
  },
  headerMain: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  enableToggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  enableToggleActive: {},
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  toggleThumbActive: {
    marginLeft: 24,
  },
  currentTrackGenre: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
  },
  genreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  genreBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  confidenceText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  eqContainer: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  eqLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  eqLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
  },
  bandsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 220,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  bandContainer: {
    alignItems: 'center',
    flex: 1,
    position: 'relative',
  },
  fftBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 4,
    opacity: 0.6,
    zIndex: 0,
  },
  bandFill: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 4,
    zIndex: 1,
  },
  bandFillAI: {},
  bandCenterLine: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    zIndex: 2,
  },
  bandValue: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'baseline',
    zIndex: 2,
  },
  valueTextPositive: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  valueTextZero: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  valueTextNegative: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  valueUnit: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginLeft: 1,
  },
  freqLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    zIndex: 2,
  },
  freqLabelAI: {},
  freqUnit: {
    fontSize: 8,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    zIndex: 2,
  },
  presetsSection: {
    marginBottom: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  sectionActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  resetText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  saveText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  presetsList: {
    gap: SPACING.md,
    paddingHorizontal: SPACING.xs,
  },
  presetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    minWidth: 150,
  },
  presetButtonActive: {},
  presetButtonAI: {},
  presetIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  presetName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  presetNameActive: {},
  aiBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  genreChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
  },
  genreChipActive: {},
  genreChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  genreChipTextActive: {},
  userPresetsSection: {
    marginTop: SPACING.lg,
  },
  subSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: SPACING.md,
  },
  userPresetWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  presetActionButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  deletePresetButton: {
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.round,
  },
  aiSection: {
    marginBottom: SPACING.xl,
  },
  aiCard: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
  },
  aiCardGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  aiCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  aiIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiTextContainer: {
    flex: 1,
  },
  aiTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.xs,
  },
  aiDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm,
  },
  aiCurrentPreset: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  aiCurrentPresetLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  aiCurrentPresetValue: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontFamily: TYPOGRAPHY.fontFamily.mono,
  },
  aiToggle: {
    width: 56,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  aiToggleActive: {},
  aiToggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  aiToggleThumbActive: {
    marginLeft: 24,
  },
  bottomSpacer: {
    height: 40,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 350,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
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
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  modalSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    textAlign: 'center',
    marginBottom: SPACING.lg,
  },
  modalInput: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    marginBottom: SPACING.lg,
    textAlign: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  modalCancelButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalConfirmButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});