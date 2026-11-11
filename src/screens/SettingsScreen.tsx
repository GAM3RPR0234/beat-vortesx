import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Image,
  Alert,
  Platform,
  TextInput,
  Keyboard,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColors } from '@/hooks/useColors';
import { useThemeMode, useThemeActions, useColorPalette } from '@/store/themeStore';
import { useReducedMotion } from '@/hooks/useColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION, COLORS as DEFAULT_COLORS } from '@/constants/theme';
import { MATERIAL_YOU_PALETTES } from '@/constants/themes/materialYouPalettes';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor } from 'react-native-reanimated';
import { useHaptics } from '@/hooks/useHaptics';
import { useNavigation } from '@react-navigation/native';
import { lastfmService, LastFmSession } from '@/services/lastfmService';
import { discordService, DiscordSettings } from '@/services/discordService';
import { podcastService, PodcastSearchResult } from '@/services/podcastService';
import * as Linking from 'expo-linking';
import { WebView } from 'react-native-webview';

// Use default colors for StyleSheet (dynamic colors applied via component props)
const C = DEFAULT_COLORS;

// Helper to get theme constants
function useThemeConstants() {
  return { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION, COLORS: DEFAULT_COLORS };
}

// Section item types
interface BaseSettingItem {
  type: 'action' | 'toggle' | 'select';
  icon: string;
  title: string;
  subtitle?: string;
  accessibilityLabel?: string;
  destructive?: boolean;
}

interface ActionSettingItem extends BaseSettingItem {
  type: 'action';
  onPress: () => void;
  destructive?: boolean;
}

interface ToggleSettingItem extends BaseSettingItem {
  type: 'toggle';
  value: boolean;
  onChange: (value: boolean) => void;
  destructive?: boolean;
}

interface SelectSettingItem extends BaseSettingItem {
  type: 'select';
  value: string;
  options: string[];
  onChange: (value: string) => void;
  formatValue?: (value: string) => string;
  destructive?: boolean;
}

type SettingItem = ActionSettingItem | ToggleSettingItem | SelectSettingItem;

interface Section {
  id: string;
  title: string;
  icon: string;
  items: SettingItem[];
}

interface SettingItemProps {
  icon: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightComponent?: React.ReactNode;
  destructive?: boolean;
  chevron?: boolean;
  accessibilityLabel?: string;
}

function SettingItem({
  icon,
  title,
  subtitle,
  onPress,
  rightComponent,
  destructive = false,
  chevron = true,
  accessibilityLabel
}: SettingItemProps) {
  const { COLORS } = useThemeConstants();
  const { lightImpact } = useHaptics();
  const reducedMotion = useReducedMotion();

  const pressAnim = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolateColor(pressAnim.value, [0, 1], [1, 0.98]) }],
    opacity: interpolateColor(pressAnim.value, [0, 1], [1, 0.7]),
  }), []);

  const handlePressIn = useCallback(() => {
    if (!reducedMotion) pressAnim.value = withSpring(1, { damping: 15, stiffness: 150 });
    lightImpact();
  }, [reducedMotion, lightImpact]);

  const handlePressOut = useCallback(() => {
    if (!reducedMotion) pressAnim.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, [reducedMotion]);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={styles.settingItem}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={reducedMotion ? 0.7 : 1}
        accessibilityRole={onPress ? 'button' : undefined}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={subtitle}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={24} color={destructive ? C.error : C.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[
            styles.settingTitle,
            destructive && styles.settingTitleDestructive,
          ]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.settingSubtitle}>{subtitle}</Text>
          )}
        </View>
        <View style={styles.settingRight}>
          {rightComponent}
          {chevron && !rightComponent && (
            <Ionicons name="chevron-forward-outline" size={20} color={C.textDisabled} />
          )}
        </View>
      </TouchableOpacity>
      {onPress && (
        <View style={styles.divider} />
      )}
    </Animated.View>
  );
}

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  const { COLORS, TYPOGRAPHY, SPACING } = useThemeConstants();

  return (
    <View style={{ paddingHorizontal: SPACING.xs, marginBottom: SPACING.sm }}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionHeaderText}>{title}</Text>
        {action}
      </View>
    </View>
  );
}

function ToggleSetting({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
  disabled = false,
  accessibilityLabel
}: {
  icon: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  const { COLORS, SPACING } = useThemeConstants();
  const { lightImpact } = useHaptics();
  const reducedMotion = useReducedMotion();

  const pressAnim = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: disabled ? 0.5 : interpolateColor(pressAnim.value, [0, 1], [1, 0.7]),
    transform: [{ scale: interpolateColor(pressAnim.value, [0, 1], [1, 0.98]) }],
  }), []);

  const handlePressIn = useCallback(() => {
    if (!disabled && !reducedMotion) pressAnim.value = withSpring(1, { damping: 15, stiffness: 150 });
    if (!disabled) lightImpact();
  }, [disabled, reducedMotion, lightImpact]);

  const handlePressOut = useCallback(() => {
    if (!disabled && !reducedMotion) pressAnim.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, [disabled, reducedMotion]);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={styles.settingItem}
        onPress={() => !disabled && onValueChange(!value)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={reducedMotion ? 0.7 : 1}
        disabled={disabled}
        accessibilityRole="switch"
        accessibilityState={{ checked: value, disabled }}
        accessibilityLabel={accessibilityLabel || title}
        accessibilityHint={subtitle}
      >
        <View style={styles.iconContainer}>
          <Ionicons name={icon as any} size={24} color={disabled ? C.textDisabled : C.primary} />
        </View>
        <View style={styles.settingTextContainer}>
          <Text style={[
            styles.settingTitle,
            disabled && styles.settingTitleDisabled,
          ]}>
            {title}
          </Text>
          {subtitle && (
            <Text style={[
              styles.settingSubtitle,
              disabled && styles.settingTitleDisabled,
            ]}>
              {subtitle}
            </Text>
          )}
        </View>
        <Switch
          value={value}
          onValueChange={disabled ? undefined : onValueChange}
          thumbColor={value ? C.primary : C.textDisabled}
          trackColor={{ false: C.border, true: C.primaryGlow }}
          disabled={disabled}
        />
      </TouchableOpacity>
      <View style={styles.divider} />
    </Animated.View>
  );
}

function SelectSetting({
  icon,
  title,
  subtitle,
  value,
  options,
  onChange,
  formatValue,
  accessibilityLabel
}: {
  icon: string;
  title: string;
  subtitle?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  formatValue?: (value: string) => string;
  accessibilityLabel?: string;
}) {
  const { COLORS } = useThemeConstants();
  const { lightImpact } = useHaptics();
  const reducedMotion = useReducedMotion();
  const [showModal, setShowModal] = useState(false);

  const pressAnim = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolateColor(pressAnim.value, [0, 1], [1, 0.98]) }],
    opacity: interpolateColor(pressAnim.value, [0, 1], [1, 0.7]),
  }), []);

  const handlePressIn = useCallback(() => {
    if (!reducedMotion) pressAnim.value = withSpring(1, { damping: 15, stiffness: 150 });
    lightImpact();
  }, [reducedMotion, lightImpact]);

  const handlePressOut = useCallback(() => {
    if (!reducedMotion) pressAnim.value = withSpring(0, { damping: 15, stiffness: 150 });
  }, [reducedMotion]);

  const handleSelect = (option: string) => {
    onChange(option);
    setShowModal(false);
    lightImpact();
  };

  return (
    <>
      <Animated.View style={animatedStyle}>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => { setShowModal(true); lightImpact(); }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={reducedMotion ? 0.7 : 1}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel || title}
          accessibilityHint={subtitle}
          accessibilityState={{ expanded: showModal }}
        >
          <View style={styles.iconContainer}>
            <Ionicons name={icon as any} size={24} color={C.primary} />
          </View>
          <View style={styles.settingTextContainer}>
            <Text style={styles.settingTitle}>{title}</Text>
            {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
          </View>
          <View style={styles.settingRight}>
            <View style={styles.selectBadge}>
              <Text style={styles.selectBadgeText}>
                {formatValue ? formatValue(value) : value}
              </Text>
              <Ionicons name="chevron-down-outline" size={18} color={C.textDisabled} style={{ marginLeft: 4 }} />
            </View>
          </View>
        </TouchableOpacity>
        <View style={styles.divider} />
      </Animated.View>

      {showModal && (
        <SettingsModal
          title={title}
          options={options}
          selected={value}
          onSelect={handleSelect}
          onClose={() => setShowModal(false)}
          formatValue={formatValue}
        />
      )}
    </>
  );
}

function SettingsModal({ title, options, selected, onSelect, onClose, formatValue }: {
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
  formatValue?: (value: string) => string;
}) {
  const { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } = useThemeConstants();
  const { mediumImpact } = useHaptics();
  const reducedMotion = useReducedMotion();
  const modalAnim = useSharedValue(0);
  const backdropAnim = useSharedValue(0);

  React.useEffect(() => {
    backdropAnim.value = withTiming(1, { duration: reducedMotion ? 0 : 200 });
    modalAnim.value = withSpring(1, { damping: 20, stiffness: 200 });
  }, []);

  const handleClose = () => {
    backdropAnim.value = withTiming(0, { duration: reducedMotion ? 0 : 150 });
    modalAnim.value = withTiming(0, { duration: reducedMotion ? 0 : 150 });
    setTimeout(onClose, reducedMotion ? 0 : 150);
  };

  const modalBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropAnim.value,
  }), [backdropAnim]);

  const modalContainerStyle = useAnimatedStyle(() => ({
    opacity: modalAnim.value,
    transform: [{ translateY: interpolateColor(modalAnim.value, [0, 1], [50, 0]) }],
  }), [modalAnim]);

  return (
    <Animated.View style={[styles.modalBackdrop, modalBackdropStyle]}>
      <TouchableOpacity onPress={handleClose} activeOpacity={1} style={styles.modalBackdropTouch} />
      <Animated.View style={[styles.modalContainer, modalContainerStyle]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TouchableOpacity onPress={handleClose} style={styles.modalClose}>
            <Ionicons name="close-outline" size={24} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {options.map((option) => (
            <TouchableOpacity
              key={option}
              style={[
                styles.modalOption,
                option === selected && styles.modalOptionSelected,
              ]}
              onPress={() => { onSelect(option); mediumImpact(); }}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.modalOptionText,
                option === selected && styles.modalOptionTextSelected,
              ]}>
                {formatValue ? formatValue(option) : option}
              </Text>
              {option === selected && (
                <Ionicons name="checkmark" size={20} color={C.primary} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

function ThemePreviewCard({
  mode,
  palette,
  isActive,
  onPress,
  COLORS,
  SPACING,
  BORDER_RADIUS,
  TYPOGRAPHY,
}: {
  mode: string;
  palette: string;
  isActive: boolean;
  onPress: () => void;
  COLORS: any;
  SPACING: any;
  BORDER_RADIUS: any;
  TYPOGRAPHY: any;
}) {
  const { lightImpact } = useHaptics();
  const reducedMotion = useReducedMotion();
  const pressAnim = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolateColor(pressAnim.value, [0, 1], [1, 0.96]) }],
    borderWidth: isActive ? 2 : 1,
    borderColor: isActive ? C.primary : C.border,
  }), [isActive]);

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
        style={[
          {
            flexDirection: 'row',
            alignItems: 'center',
            padding: SPACING.md,
            borderRadius: BORDER_RADIUS.lg,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            gap: SPACING.md,
          },
          isActive && {
            borderWidth: 2,
            borderColor: C.primary,
            backgroundColor: C.primaryGlow,
          },
        ]}
        onPress={() => { onPress(); lightImpact(); }}
        onPressIn={() => { if (!reducedMotion) pressAnim.value = withSpring(1, { damping: 15, stiffness: 150 }); }}
        onPressOut={() => { if (!reducedMotion) pressAnim.value = withSpring(0, { damping: 15, stiffness: 150 }); }}
        activeOpacity={reducedMotion ? 0.7 : 1}
      >
        <View style={{
          width: 48,
          height: 48,
          borderRadius: BORDER_RADIUS.md,
          backgroundColor: C.primaryGlow,
        }} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{
            fontSize: TYPOGRAPHY.fontSize.md,
            fontWeight: TYPOGRAPHY.fontWeight.semibold,
            color: C.textPrimary,
          }}>{mode}</Text>
          <Text style={{
            fontSize: TYPOGRAPHY.fontSize.xs,
            fontWeight: TYPOGRAPHY.fontWeight.regular,
            color: C.textMuted,
            marginTop: SPACING.xs,
          }}>{palette}</Text>
        </View>
        {isActive && (
          <View style={{ padding: SPACING.xs }}>
            <Ionicons name="checkmark-circle" size={24} color={C.primary} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function DiscordSettingsModal({
  settings,
  onClose,
  onSave,
}: {
  settings: DiscordSettings;
  onClose: () => void;
  onSave: (settings: DiscordSettings) => void;
}) {
  const { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } = useThemeConstants();
  const { mediumImpact } = useHaptics();
  const reducedMotion = useReducedMotion();
  const modalAnim = useSharedValue(0);
  const backdropAnim = useSharedValue(0);
  const [localSettings, setLocalSettings] = useState(settings);

  React.useEffect(() => {
    backdropAnim.value = withTiming(1, { duration: reducedMotion ? 0 : 200 });
    modalAnim.value = withSpring(1, { damping: 20, stiffness: 200 });
  }, []);

  const handleClose = () => {
    backdropAnim.value = withTiming(0, { duration: reducedMotion ? 0 : 150 });
    modalAnim.value = withTiming(0, { duration: reducedMotion ? 0 : 150 });
    setTimeout(onClose, reducedMotion ? 0 : 150);
  };

  const modalBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropAnim.value,
  }), [backdropAnim]);

  const modalContainerStyle = useAnimatedStyle(() => ({
    opacity: modalAnim.value,
    transform: [{ translateY: interpolateColor(modalAnim.value, [0, 1], [50, 0]) }],
  }), [modalAnim]);

  const handleSave = () => {
    onSave(localSettings);
    handleClose();
    mediumImpact();
  };

  const toggleSetting = (key: keyof DiscordSettings, value: boolean) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Animated.View style={[styles.modalBackdrop, modalBackdropStyle]}>
      <TouchableOpacity onPress={handleClose} activeOpacity={1} style={styles.modalBackdropTouch} />
      <Animated.View style={[styles.modalContainer, modalContainerStyle]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Configurar Discord Rich Presence</Text>
          <TouchableOpacity onPress={handleClose} style={styles.modalClose}>
            <Ionicons name="close-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Información a Compartir</Text>
            <ToggleSetting
              icon="musical-notes"
              title="Nombre de la Pista"
              subtitle="Muestra el título de la canción"
              value={localSettings.showTrack}
              onValueChange={(v) => toggleSetting('showTrack', v)}
            />
            <ToggleSetting
              icon="person"
              title="Artista"
              subtitle="Muestra el nombre del artista"
              value={localSettings.showArtist}
              onValueChange={(v) => toggleSetting('showArtist', v)}
            />
            <ToggleSetting
              icon="albums"
              title="Álbum"
              subtitle="Muestra el nombre del álbum"
              value={localSettings.showAlbum}
              onValueChange={(v) => toggleSetting('showAlbum', v)}
            />
            <ToggleSetting
              icon="timer"
              title="Progreso de Reproducción"
              subtitle="Muestra barra de progreso y tiempo restante"
              value={localSettings.showProgress}
              onValueChange={(v) => toggleSetting('showProgress', v)}
            />
            <ToggleSetting
              icon="link"
              title="Botones de Acción"
              subtitle="Botones 'Escuchar en Beat Vortex' y 'Ver Artista'"
              value={localSettings.showButtons}
              onValueChange={(v) => toggleSetting('showButtons', v)}
            />
          </View>
          <View style={styles.modalSection}>
            <Text style={styles.modalSectionTitle}>Estado Personalizado</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Estado personalizado (opcional)"
                value={localSettings.customState || ''}
                onChangeText={(text) => setLocalSettings(prev => ({ ...prev, customState: text }))}
                maxLength={128}
              />
            </View>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={handleClose}
            >
              <Text style={styles.modalActionButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalActionButton, styles.modalActionButtonPrimary]}
              onPress={handleSave}
            >
              <Text style={styles.modalActionButtonTextPrimary}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </Animated.View>
    </Animated.View>
  );
}

function AddPodcastModal({
  onClose,
  onAdd,
  url,
  onUrlChange,
}: {
  onClose: () => void;
  onAdd: (url: string) => void;
  url: string;
  onUrlChange: (url: string) => void;
}) {
  const { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } = useThemeConstants();
  const { mediumImpact } = useHaptics();
  const reducedMotion = useReducedMotion();
  const modalAnim = useSharedValue(0);
  const backdropAnim = useSharedValue(0);

  React.useEffect(() => {
    backdropAnim.value = withTiming(1, { duration: reducedMotion ? 0 : 200 });
    modalAnim.value = withSpring(1, { damping: 20, stiffness: 200 });
  }, []);

  const handleClose = () => {
    backdropAnim.value = withTiming(0, { duration: reducedMotion ? 0 : 150 });
    modalAnim.value = withTiming(0, { duration: reducedMotion ? 0 : 150 });
    setTimeout(onClose, reducedMotion ? 0 : 150);
  };

  const modalBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropAnim.value,
  }), [backdropAnim]);

  const modalContainerStyle = useAnimatedStyle(() => ({
    opacity: modalAnim.value,
    transform: [{ translateY: interpolateColor(modalAnim.value, [0, 1], [50, 0]) }],
  }), [modalAnim]);

  const isValidUrl = url.trim().startsWith('http');

  return (
    <Animated.View style={[styles.modalBackdrop, modalBackdropStyle]}>
      <TouchableOpacity onPress={handleClose} activeOpacity={1} style={styles.modalBackdropTouch} />
      <Animated.View style={[styles.modalContainer, modalContainerStyle]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Añadir Podcast por RSS</Text>
          <TouchableOpacity onPress={handleClose} style={styles.modalClose}>
            <Ionicons name="close-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalContent}>
          <Text style={styles.modalDescription}>
            Pega la URL del feed RSS del podcast. Ejemplo: https://feeds.example.com/podcast.xml
          </Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="https://feeds.example.com/podcast.xml"
              value={url}
              onChangeText={onUrlChange}
              autoCapitalize="none"
              autoComplete="url"
              keyboardType="url"
            />
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalActionButton}
              onPress={handleClose}
            >
              <Text style={styles.modalActionButtonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalActionButton,
                styles.modalActionButtonPrimary,
                !isValidUrl && styles.modalActionButtonDisabled,
              ]}
              onPress={isValidUrl ? () => { onAdd(url.trim()); mediumImpact(); } : undefined}
              disabled={!isValidUrl}
            >
              <Text style={styles.modalActionButtonTextPrimary}>Añadir</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function PodcastSearchModal({
  onClose,
  onSearch,
  onSubscribe,
  query,
  onQueryChange,
  results,
  loading,
}: {
  onClose: () => void;
  onSearch: (query: string) => void;
  onSubscribe: (result: PodcastSearchResult) => void;
  query: string;
  onQueryChange: (query: string) => void;
  results: PodcastSearchResult[];
  loading: boolean;
}) {
  const { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } = useThemeConstants();
  const { mediumImpact, lightImpact } = useHaptics();
  const reducedMotion = useReducedMotion();
  const modalAnim = useSharedValue(0);
  const backdropAnim = useSharedValue(0);

  React.useEffect(() => {
    backdropAnim.value = withTiming(1, { duration: reducedMotion ? 0 : 200 });
    modalAnim.value = withSpring(1, { damping: 20, stiffness: 200 });
  }, []);

  const handleClose = () => {
    backdropAnim.value = withTiming(0, { duration: reducedMotion ? 0 : 150 });
    modalAnim.value = withTiming(0, { duration: reducedMotion ? 0 : 150 });
    setTimeout(onClose, reducedMotion ? 0 : 150);
  };

  const modalBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropAnim.value,
  }), [backdropAnim]);

  const modalContainerStyle = useAnimatedStyle(() => ({
    opacity: modalAnim.value,
    transform: [{ translateY: interpolateColor(modalAnim.value, [0, 1], [50, 0]) }],
  }), [modalAnim]);

  const handleSearch = (text: string) => {
    onQueryChange(text);
    if (text.length >= 2) {
      onSearch(text);
    } else {
      onQueryChange(text);
      // Clear results if query too short
      // onSearch would be called with empty but we just clear
    }
  };

  return (
    <Animated.View style={[styles.modalBackdrop, modalBackdropStyle]}>
      <TouchableOpacity onPress={handleClose} activeOpacity={1} style={styles.modalBackdropTouch} />
      <Animated.View style={[styles.modalContainer, modalContainerStyle]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Buscar Podcasts</Text>
          <TouchableOpacity onPress={handleClose} style={styles.modalClose}>
            <Ionicons name="close-outline" size={24} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
        <View style={styles.modalContent}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.textInput}
              placeholder="Buscar podcasts en iTunes / PodcastIndex..."
              value={query}
              onChangeText={handleSearch}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query && (
              <TouchableOpacity
                style={styles.searchClearButton}
                onPress={() => { onQueryChange(''); onSearch(''); lightImpact(); }}
              >
                <Ionicons name="close-circle" size={22} color={COLORS.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Buscando...</Text>
            </View>
          ) : results.length > 0 ? (
            <View style={styles.resultsList}>
              {results.map((result) => (
                <TouchableOpacity
                  key={result.id}
                  style={styles.resultItem}
                  onPress={() => { onSubscribe(result); mediumImpact(); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.resultArtwork}>
                    <Ionicons name="radio" size={32} color={COLORS.primary} />
                  </View>
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultTitle} numberOfLines={1}>{result.title}</Text>
                    <Text style={styles.resultSubtitle} numberOfLines={1}>{result.author}</Text>
                    <Text style={styles.resultMeta}>{result.episodeCount} episodios · {result.category}</Text>
                  </View>
                  <View style={styles.resultAction}>
                    <Text style={styles.subscribeButton}>Suscribirse</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ) : query.length >= 2 ? (
            <View style={styles.emptyResults}>
              <Ionicons name="search-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No se encontraron podcasts</Text>
              <Text style={styles.emptySubtitle}>Prueba con otros términos de búsqueda</Text>
            </View>
          ) : (
            <View style={styles.emptyResults}>
              <Ionicons name="radio" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>Busca tus podcasts favoritos</Text>
              <Text style={styles.emptySubtitle}>Escribe al menos 2 caracteres para buscar</Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export function SettingsScreen() {
  const navigation = useNavigation();
  const { ...colors } = useColors();
  const COLORS = colors;
  const themeMode = useThemeMode();
  const {
    setThemeMode,
    setColorPalette,
    setDynamicColorEnabled,
    setFontScale,
    setAnimationScale,
    setReducedMotion,
    setHighContrast
  } = useThemeActions();
  const colorPalette = useColorPalette();
  const colorPalettes = useMemo(() =>
    MATERIAL_YOU_PALETTES.map((p: any) => p.name),
    []);
  const isDark = themeMode !== 'light';
  const reducedMotion = useReducedMotion();
  const { lightImpact, mediumImpact, heavyImpact } = useHaptics();

  // Last.fm state
  const [lastfmSession, setLastfmSession] = useState<LastFmSession | null>(null);
  const [lastfmEnabled, setLastfmEnabledState] = useState(false);
  const [lastfmAuthUrl, setLastfmAuthUrl] = useState('');
  const [showLastfmAuth, setShowLastfmAuth] = useState(false);
  const [showLastfmWebView, setShowLastfmWebView] = useState(false);

  // Discord state
  const [discordSettings, setDiscordSettingsState] = useState<DiscordSettings>({
    enabled: false,
    showTrack: true,
    showArtist: true,
    showAlbum: true,
    showProgress: true,
    showButtons: true,
  });

  // Podcast state
  const [podcastEnabled, setPodcastEnabled] = useState(true);
  const [showAddPodcastModal, setShowAddPodcastModal] = useState(false);
  const [addPodcastUrl, setAddPodcastUrl] = useState('');
  const [showPodcastSearch, setShowPodcastSearch] = useState(false);
  const [podcastSearchQuery, setPodcastSearchQuery] = useState('');
  const [podcastSearchResults, setPodcastSearchResults] = useState<PodcastSearchResult[]>([]);
  const [podcastSearchLoading, setPodcastSearchLoading] = useState(false);

  // Load settings on mount
  useEffect(() => {
    lastfmService.initialize().then(() => {
      const session = lastfmService.getSession();
      setLastfmSession(session);
      setLastfmEnabledState(lastfmService.isEnabled());
    });
    discordService.initialize().then(() => {
      setDiscordSettingsState(discordService.getSettings());
    });
    podcastService.initialize();
  }, []);

  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [downloadQuality, setDownloadQuality] = useState<'320kbps' | 'FLAC'>('320kbps');
  const [autoDownloadWifi, setAutoDownloadWifi] = useState(true);
  const [showLyrics, setShowLyrics] = useState(true);
  const [backgroundPlayback, setBackgroundPlayback] = useState(true);
  const [normalizeVolume, setNormalizeVolume] = useState(true);
  const [skipSilence, setSkipSilence] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<'off' | '15' | '30' | '60'>('off');
  const [crossfadeDuration, setCrossfadeDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [pitchShift, setPitchShift] = useState(0);
  const [replayGainEnabled, setReplayGainEnabled] = useState(true);
  const [gaplessEnabled, setGaplessEnabled] = useState(true);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showPaletteModal, setShowPaletteModal] = useState(false);
  const [showDiscordSettings, setShowDiscordSettings] = useState(false);

  const themeModes = useMemo(() => [
    { id: 'cyberpunk', label: 'Cyberpunk', description: 'Neón futurista con gradientes dinámicos' },
    { id: 'dark', label: 'Oscuro', description: 'Fondo negro profundo, ideal para OLED' },
    { id: 'amoled', label: 'AMOLED', description: 'Negro puro (#000000) para ahorro de batería' },
    { id: 'light', label: 'Claro', description: 'Fondo blanco limpio para uso diurno' },
    { id: 'system', label: 'Sistema', description: 'Sigue la configuración del dispositivo' },
  ], []);

  const sleepOptions = ['off', '15', '30', '60', '90', '120'];
  const qualityOptions = ['320kbps', 'FLAC'];
  const rateOptions = ['0.5', '0.75', '1.0', '1.25', '1.5', '1.75', '2.0'];
  const pitchOptions = ['-12', '-10', '-8', '-6', '-4', '-2', '0', '+2', '+4', '+6', '+8', '+10', '+12'];
  const crossfadeOptions = ['0', '1000', '2000', '3000', '4000', '5000', '6000', '7000', '8000', '9000', '10000', '11000', '12000'];

  const sections = useMemo(() => {
    const sectionsData: Section[] = [
      {
        id: 'appearance',
        title: 'Apariencia',
        icon: 'brush',
        items: [
          {
            type: 'action' as const,
            icon: 'color-palette',
            title: 'Tema de Color',
            subtitle: `${themeModes.find(m => m.id === themeMode)?.label || themeMode} · ${colorPalettes.length} paletas`,
            onPress: () => { setShowThemeModal(true); lightImpact(); },
            accessibilityLabel: 'Cambiar tema de color',
          },
        {
          type: 'action' as const,
          icon: 'palette',
          title: 'Paleta Material You',
          subtitle: '19 paletas tonales dinámicas',
          onPress: () => { setShowPaletteModal(true); lightImpact(); },
          accessibilityLabel: 'Cambiar paleta de colores',
        },
        {
          type: 'toggle' as const,
          icon: 'color-fill',
          title: 'Colores Dinámicos (Material You)',
          subtitle: 'Extrae colores de la portada del álbum',
          value: true, // from theme store
          onChange: (v: boolean) => setDynamicColorEnabled(v),
          accessibilityLabel: 'Activar colores dinámicos',
        },
        {
          type: 'select' as const,
          icon: 'text',
          title: 'Tamaño de Fuente',
          subtitle: 'Escala de texto en toda la app',
          value: '100%',
          options: ['85%', '90%', '100%', '110%', '120%', '130%'],
          onChange: (v: string) => setFontScale(parseInt(v) / 100),
          formatValue: (v: string) => v,
          accessibilityLabel: 'Cambiar tamaño de fuente',
        },
        {
          type: 'toggle' as const,
          icon: 'flash',
          title: 'Animaciones y Transiciones',
          subtitle: 'Efectos visuales fluidos en toda la app',
          value: !reducedMotion,
          onChange: (v: boolean) => setReducedMotion(!v),
          accessibilityLabel: 'Activar animaciones',
        },
        {
          type: 'toggle' as const,
          icon: 'contrast',
          title: 'Alto Contraste',
          subtitle: 'Mejora la legibilidad para accesibilidad',
          value: false, // from theme store
          onChange: (v: boolean) => setHighContrast(v),
          accessibilityLabel: 'Activar alto contraste',
        },
      ],
    },
    {
      id: 'playback',
      title: 'Reproducción',
      icon: 'musical-notes',
      items: [
        {
          type: 'toggle' as const,
          icon: 'play-skip-forward',
          title: 'Reproducción en Segundo Plano',
          subtitle: 'Música sigue sonando al minimizar la app',
          value: backgroundPlayback,
          onChange: setBackgroundPlayback,
          accessibilityLabel: 'Reproducción en segundo plano',
        },
        {
          type: 'toggle' as const,
          icon: 'volume-high',
          title: 'Normalización de Volumen (ReplayGain)',
          subtitle: 'Nivel de volumen consistente entre pistas',
          value: replayGainEnabled,
          onChange: setReplayGainEnabled,
          accessibilityLabel: 'Normalización de volumen ReplayGain',
        },
        {
          type: 'toggle' as const,
          icon: 'skip-forward',
          title: 'Saltar Silencios',
          subtitle: 'Omite automáticamente pausas al inicio/final',
          value: skipSilence,
          onChange: setSkipSilence,
          accessibilityLabel: 'Saltar silencios',
        },
        {
          type: 'toggle' as const,
          icon: 'chatbubbles',
          title: 'Mostrar Letras Sincronizadas',
          subtitle: 'Visualiza LRC en tiempo real durante reproducción',
          value: showLyrics,
          onChange: setShowLyrics,
          accessibilityLabel: 'Mostrar letras sincronizadas',
        },
        {
          type: 'toggle' as const,
          icon: 'infinite',
          title: 'Reproducción Sin Pausas (Gapless)',
          subtitle: 'Transición fluida entre pistas continuas',
          value: gaplessEnabled,
          onChange: setGaplessEnabled,
          accessibilityLabel: 'Reproducción sin pausas',
        },
        {
          type: 'select' as const,
          icon: 'timer',
          title: 'Crossfade',
          subtitle: 'Transición suave entre pistas (0-12s)',
          value: crossfadeDuration.toString(),
          options: crossfadeOptions,
          onChange: (v: string) => setCrossfadeDuration(parseInt(v)),
          formatValue: (v: string) => v === '0' ? 'Desactivado' : `${parseInt(v)/1000}s`,
          accessibilityLabel: 'Duración del crossfade',
        },
        {
          type: 'select' as const,
          icon: 'speed',
          title: 'Velocidad de Reproducción',
          subtitle: '0.5x - 2.0x con corrección de tono',
          value: playbackRate.toFixed(2),
          options: rateOptions,
          onChange: (v: string) => setPlaybackRate(parseFloat(v)),
          formatValue: (v: string) => `${v}x`,
          accessibilityLabel: 'Velocidad de reproducción',
        },
        {
          type: 'select' as const,
          icon: 'musical-note',
          title: 'Cambio de Tono (Pitch Shift)',
          subtitle: '±12 semitonos independiente de la velocidad',
          value: pitchShift >= 0 ? `+${pitchShift}` : `${pitchShift}`,
          options: pitchOptions,
          onChange: (v: string) => setPitchShift(parseInt(v)),
          formatValue: (v: string) => v.startsWith('+') || v.startsWith('-') ? `${v} st` : `${v} st`,
          accessibilityLabel: 'Cambio de tono',
        },
        {
          type: 'select' as const,
          icon: 'bed',
          title: 'Temporizador de Sueño',
          subtitle: 'Apagar reproducción automáticamente',
          value: sleepTimer,
          options: sleepOptions,
          onChange: (v: string) => setSleepTimer(v as any),
          formatValue: (v: string) => v === 'off' ? 'Desactivado' : `${v} min`,
          accessibilityLabel: 'Temporizador de sueño',
        },
      ],
    },
    {
      id: 'downloads',
      title: 'Descargas y Almacenamiento',
      icon: 'download',
      items: [
        {
          type: 'select' as const,
          icon: 'download',
          title: 'Calidad de Descarga',
          subtitle: 'Formato de audio para descargas offline',
          value: downloadQuality,
          options: qualityOptions,
          onChange: (v: string) => setDownloadQuality(v as any),
          formatValue: (v: string) => v === 'FLAC' ? 'FLAC (Sin pérdida)' : '320 kbps (Alta calidad)',
          accessibilityLabel: 'Calidad de descarga',
        },
        {
          type: 'toggle' as const,
          icon: 'wifi',
          title: 'Solo Descargar en WiFi',
          subtitle: 'Evita uso de datos móviles para descargas',
          value: autoDownloadWifi,
          onChange: setAutoDownloadWifi,
          accessibilityLabel: 'Descargar solo en WiFi',
        },
        {
          type: 'action' as const,
          icon: 'folder',
          title: 'Gestionar Archivos Descargados',
          subtitle: 'Ver, reproducir y eliminar música offline',
          onPress: () => {},
          accessibilityLabel: 'Gestionar archivos descargados',
        },
        {
          type: 'action' as const,
          icon: 'trash',
          title: 'Limpiar Caché',
          subtitle: 'Liberar espacio de imágenes y metadatos temporales',
          onPress: () => {
            Alert.alert(
              'Limpiar caché',
              '¿Estás seguro de que quieres limpiar todo el caché? Esto liberará espacio pero requerirá volver a cargar imágenes y metadatos.',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Limpiar', style: 'destructive', onPress: () => { heavyImpact(); } },
              ]
            );
          },
          destructive: true,
          accessibilityLabel: 'Limpiar caché',
        },
        {
          type: 'action' as const,
          icon: 'stats-chart',
          title: 'Estadísticas de Almacenamiento',
          subtitle: 'Ver uso de espacio por música, podcasts, caché',
          onPress: () => {},
          accessibilityLabel: 'Estadísticas de almacenamiento',
        },
      ],
    },
    {
      id: 'integrations',
      title: 'Integraciones',
      icon: 'link',
      items: [
        {
          type: 'action' as const,
          icon: 'sparkles',
          title: 'Vortex AI · Smart Queue',
          subtitle: 'Mixes automáticos basados en BPM, género y estructura',
          onPress: () => {},
          accessibilityLabel: 'Configurar Smart Queue',
        },
        {
          type: 'action' as const,
          icon: 'bar-chart',
          title: 'Ecualizador Adaptativo por Género',
          subtitle: 'Presets IA según el género detectado en la pista',
          onPress: () => {},
          accessibilityLabel: 'Configurar ecualizador adaptativo',
        },
        {
          type: 'action' as const,
          icon: 'language',
          title: 'Traductor de Letras Asistido',
          subtitle: 'Explicación y traducción en tiempo real de estrofas',
          onPress: () => {},
          accessibilityLabel: 'Configurar traductor de letras',
        },
        {
          type: 'action' as const,
          icon: 'shuffle',
          title: 'Importar Playlists (M3U / M3U8)',
          subtitle: 'Normalización automática de listas externas',
          onPress: () => {},
          accessibilityLabel: 'Importar playlists M3U',
        },
        {
          type: 'action' as const,
          icon: 'radio',
          title: 'Radio IA y Mezclas Semanales',
          subtitle: 'Descubre música nueva basada en tu historial',
          onPress: () => {},
          accessibilityLabel: 'Configurar radio IA',
        },
        {
          type: 'toggle' as const,
          icon: 'heart',
          title: 'Scrobbling Last.fm',
          subtitle: lastfmSession ? `Conectado como ${lastfmSession.name}` : 'Conecta tu cuenta para scrobbling',
          value: lastfmEnabled && !!lastfmSession,
          onChange: async (v: boolean) => {
            if (v && !lastfmSession) {
              // Start auth flow
              const authUrl = lastfmService.getAuthUrl();
              setLastfmAuthUrl(authUrl);
              setShowLastfmWebView(true);
            } else if (!v) {
              // Disconnect
              await lastfmService.disconnect();
              setLastfmSession(null);
              setLastfmEnabledState(false);
            } else {
              await lastfmService.setEnabled(v);
            }
            setLastfmEnabledState(v);
          },
          accessibilityLabel: 'Activar scrobbling Last.fm',
        },
        {
          type: 'action' as const,
          icon: 'logout',
          title: lastfmSession ? 'Desconectar Last.fm' : 'Conectar Last.fm',
          subtitle: lastfmSession ? `Sesión activa: ${lastfmSession.name}` : 'Autenticación OAuth 1.0a',
          onPress: lastfmSession ? async () => {
            await lastfmService.disconnect();
            setLastfmSession(null);
            setLastfmEnabledState(false);
          } : () => {
            const authUrl = lastfmService.getAuthUrl();
            setLastfmAuthUrl(authUrl);
            setShowLastfmWebView(true);
          },
          destructive: !!lastfmSession,
          accessibilityLabel: lastfmSession ? 'Desconectar Last.fm' : 'Conectar Last.fm',
        },
        {
          type: 'toggle' as const,
          icon: 'logo-discord',
          title: 'Discord Rich Presence',
          subtitle: discordSettings.enabled ? 'Activo - Muestra reproducción actual' : 'Inactivo - Activa para compartir en Discord',
          value: discordSettings.enabled,
          onChange: async (v: boolean) => {
            await discordService.setSettings({ enabled: v });
            setDiscordSettingsState(discordService.getSettings());
          },
          accessibilityLabel: 'Activar Discord Rich Presence',
        },
        {
          type: 'action' as const,
          icon: 'settings',
          title: 'Configurar Discord Rich Presence',
          subtitle: 'Personaliza qué información se comparte',
          onPress: () => {
            // Show modal with Discord settings
            setShowDiscordSettings(true);
          },
          accessibilityLabel: 'Configurar Discord Rich Presence',
        },
      ],
    },
    {
      id: 'podcasts',
      title: 'Podcasts',
      icon: 'podcast',
      items: [
        {
          type: 'toggle' as const,
          icon: 'podcast',
          title: 'Habilitar Podcasts',
          subtitle: 'Suscríbete y escucha podcasts RSS',
          value: podcastEnabled,
          onChange: async (v: boolean) => {
            setPodcastEnabled(v);
          },
          accessibilityLabel: 'Habilitar podcasts',
        },
        {
          type: 'action' as const,
          icon: 'add-circle',
          title: 'Añadir Podcast por URL RSS',
          subtitle: 'Suscríbete pegando la URL del feed',
          onPress: () => { setShowAddPodcastModal(true); lightImpact(); },
          accessibilityLabel: 'Añadir podcast por RSS',
        },
        {
          type: 'action' as const,
          icon: 'search',
          title: 'Buscar Podcasts (iTunes / PodcastIndex)',
          subtitle: 'Descubre nuevos programas',
          onPress: () => { setShowPodcastSearch(true); lightImpact(); },
          accessibilityLabel: 'Buscar podcasts',
        },
        {
          type: 'toggle' as const,
          icon: 'download',
          title: 'Descargar Episodios Automáticamente',
          subtitle: 'Nuevos episodios de suscripciones en WiFi',
          value: true,
          onChange: (v: boolean) => {},
          accessibilityLabel: 'Descarga automática de episodios',
        },
        {
          type: 'toggle' as const,
          icon: 'skip-forward',
          title: 'Saltar Silencios en Podcasts',
          subtitle: 'Recorta pausas automáticamente',
          value: false,
          onChange: (v: boolean) => {},
          accessibilityLabel: 'Saltar silencios en podcasts',
        },
        {
          type: 'select' as const,
          icon: 'speed',
          title: 'Velocidad Predeterminada Podcasts',
          subtitle: 'Velocidad de reproducción por defecto',
          value: '1.0',
          options: rateOptions,
          onChange: (v: string) => {},
          formatValue: (v: string) => `${v}x`,
          accessibilityLabel: 'Velocidad predeterminada podcasts',
        },
      ],
    },
    {
      id: 'legal',
      title: 'Legal y Privacidad',
      icon: 'shield-checkmark',
      items: [
        {
          type: 'action' as const,
          icon: 'document',
          title: 'Términos y Condiciones',
          subtitle: 'Descargo de responsabilidad legal completo',
          onPress: () => {},
          accessibilityLabel: 'Ver términos y condiciones',
        },
        {
          type: 'action' as const,
          icon: 'shield-checkmark',
          title: 'Política de Privacidad',
          subtitle: 'Sin recopilación de datos · Todo procesamiento local',
          onPress: () => {},
          accessibilityLabel: 'Ver política de privacidad',
        },
        {
          type: 'action' as const,
          icon: 'logo-github',
          title: 'Código Abierto (GitHub)',
          subtitle: 'Ver código fuente, contribuir, reportar issues',
          onPress: () => {},
          accessibilityLabel: 'Ver en GitHub',
        },
        {
          type: 'action' as const,
          icon: 'information-circle',
          title: 'Acerca de Beat Vortex',
          subtitle: 'Versión 1.0.0 · Cliente independiente gratuito',
          onPress: () => {},
          accessibilityLabel: 'Acerca de Beat Vortex',
        },
        {
          type: 'action' as const,
          icon: 'license',
          title: 'Licencias de Código Abierto',
          subtitle: 'Ver licencias de dependencias de terceros',
          onPress: () => {},
          accessibilityLabel: 'Ver licencias open source',
        },
      ],
    },
    {
      id: 'danger',
      title: 'Zona de Peligro',
      icon: 'warning',
      items: [
        {
          type: 'action' as const,
          icon: 'refresh',
          title: 'Restablecer Todos los Ajustes',
          subtitle: 'Vuelve a la configuración predeterminada',
          onPress: () => {
            Alert.alert(
              'Restablecer ajustes',
              'Esto restablecerá todos los ajustes a sus valores predeterminados. ¿Continuar?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Restablecer', style: 'destructive', onPress: () => { heavyImpact(); } },
              ]
            );
          },
          destructive: true,
          accessibilityLabel: 'Restablecer todos los ajustes',
        },
        {
          type: 'action' as const,
          icon: 'trash',
          title: 'Borrar Todos los Datos',
          subtitle: 'Elimina biblioteca, historial, descargas y ajustes',
          onPress: () => {
            Alert.alert(
              'Borrar todos los datos',
              'Esta acción es IRREVERSIBLE. Se eliminarán: biblioteca musical, historial de reproducción, descargas offline, playlists, suscripciones de podcasts y todos los ajustes. ¿Estás completamente seguro?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Borrar todo', style: 'destructive', onPress: () => { heavyImpact(); } },
              ]
            );
          },
          destructive: true,
          accessibilityLabel: 'Borrar todos los datos',
        },
      ],
    },
  ];

  return sectionsData;
}, [
    themeMode,
    colorPalettes,
    backgroundPlayback,
    replayGainEnabled,
    skipSilence,
    showLyrics,
    gaplessEnabled,
    crossfadeDuration,
    playbackRate,
    pitchShift,
    sleepTimer,
    downloadQuality,
    autoDownloadWifi,
    reducedMotion,
  ]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const lower = searchQuery.toLowerCase();
    return sections.map(section => ({
      ...section,
      items: section.items.filter(item =>
        item.title.toLowerCase().includes(lower) ||
        item.subtitle?.toLowerCase().includes(lower)
      )
    })).filter(section => section.items.length > 0);
  }, [sections, searchQuery]);

  const handleClearCache = () => {
    Alert.alert(
      'Limpiar caché',
      '¿Estás seguro de que quieres limpiar todo el caché? Esto liberará espacio pero requerirá volver a cargar imágenes y metadatos.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpiar', style: 'destructive', onPress: () => { heavyImpact(); } },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={22} color={C.textMuted} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar ajustes..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor={C.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            onFocus={() => {}}
            onBlur={Keyboard.dismiss}
          />
          {searchQuery && (
            <TouchableOpacity
              onPress={() => { setSearchQuery(''); Keyboard.dismiss(); lightImpact(); }}
              style={styles.searchClear}
            >
              <Ionicons name="close-circle" size={22} color={C.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <BlurView intensity={80} style={styles.profileBlur} />
          <LinearGradient
            colors={['rgba(0,212,255,0.1)', 'rgba(184,77,255,0.1)']}
            style={styles.profileGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={styles.profileContent}>
            <View style={styles.avatarContainer}>
              <Animated.View style={[styles.avatar, {
                shadowColor: C.primary,
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.3,
                shadowRadius: 16,
                elevation: 16,
              }]}>
                <Ionicons name="musical-notes" size={36} color={C.primary} />
              </Animated.View>
              <View style={styles.avatarRing} />
            </View>
            <Text style={styles.profileName}>Usuario Vortex</Text>
            <Text style={styles.profileEmail}>beatvortex@local</Text>
            <View style={styles.profileBadges}>
              <View style={styles.badge}>
                <Ionicons name="shield-checkmark" size={12} color={C.success} />
                <Text style={styles.badgeText}>Offline First</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="lock-closed" size={12} color={C.primary} />
                <Text style={styles.badgeText}>Privacidad Total</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="wifi" size={12} color={C.warning} />
                <Text style={styles.badgeText}>Sin Servidores</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Settings Sections */}
        {filteredSections.map((section) => (
          <View key={section.id} style={styles.sectionContainer}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeaderIcon}>
                <Ionicons name={section.icon as any} size={18} color={C.primary} />
              </View>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
              {searchQuery && (
                <Text style={styles.sectionCount}>
                  {section.items.length} {section.items.length === 1 ? 'resultado' : 'resultados'}
                </Text>
              )}
            </View>
            <View style={styles.settingsGroup}>
              {section.items.map((item, index) => (
                <React.Fragment key={`${section.id}-${index}`}>
                  {item.type === 'action' && (
                    <SettingItem
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      onPress={item.onPress}
                      destructive={item.destructive ?? false}
                      chevron={!item.destructive}
                      accessibilityLabel={item.accessibilityLabel}
                    />
                  )}
                  {item.type === 'toggle' && (
                    <ToggleSetting
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      value={item.value}
                      onValueChange={item.onChange}
                      accessibilityLabel={item.accessibilityLabel}
                    />
                  )}
                  {item.type === 'select' && (
                    <SelectSetting
                      icon={item.icon}
                      title={item.title}
                      subtitle={item.subtitle}
                      value={item.value}
                      options={item.options}
                      onChange={item.onChange}
                      formatValue={item.formatValue}
                      accessibilityLabel={item.accessibilityLabel}
                    />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Beat Vortex v1.0.0
          </Text>
          <Text style={styles.footerLegal}>
            Cliente de reproducción local independiente · Código abierto · Sin servidores · Sin rastreo
          </Text>
          <Text style={styles.footerDisclaimer}>
            No afiliado a Google LLC, YouTube, Spotify ni sus filiales
          </Text>
        </View>
      </ScrollView>

      {/* Theme Modal */}
      {showThemeModal && (
        <SettingsModal
          title="Seleccionar Tema"
          options={themeModes.map(m => m.id)}
          selected={themeMode}
          onSelect={(mode) => { setThemeMode(mode as any); setShowThemeModal(false); mediumImpact(); }}
          onClose={() => setShowThemeModal(false)}
          formatValue={(mode) => {
            const t = themeModes.find(m => m.id === mode);
            return t ? `${t.label} — ${t.description}` : mode;
          }}
        />
      )}

      {/* Palette Modal */}
      {showPaletteModal && (
        <SettingsModal
          title="Paleta Material You"
          options={colorPalettes}
          selected="default" // Would come from theme store
          onSelect={(palette) => { setColorPalette(palette); setShowPaletteModal(false); mediumImpact(); }}
          onClose={() => setShowPaletteModal(false)}
        />
      )}

      {/* Last.fm Auth WebView */}
      {showLastfmWebView && lastfmAuthUrl && (
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <Text style={styles.webViewTitle}>Autenticación Last.fm</Text>
            <TouchableOpacity onPress={() => { setShowLastfmWebView(false); lightImpact(); }} style={styles.webViewClose}>
              <Ionicons name="close-outline" size={24} color={C.textPrimary} />
            </TouchableOpacity>
          </View>
          <WebView
            source={{ uri: lastfmAuthUrl }}
            style={styles.webView}
            onMessage={(event) => {
              // Handle callback from Last.fm
              try {
                const data = JSON.parse(event.nativeEvent.data);
                if (data.token) {
                  lastfmService.authenticate(data.token).then((session) => {
                    setLastfmSession(session);
                    setLastfmEnabledState(true);
                    setShowLastfmWebView(false);
                  }).catch(console.error);
                }
              } catch (e) {
                // Ignore non-JSON messages
              }
            }}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            mixedContentMode="always"
          />
        </View>
      )}

      {/* Discord Settings Modal */}
      {showDiscordSettings && (
        <DiscordSettingsModal
          settings={discordSettings}
          onClose={() => setShowDiscordSettings(false)}
          onSave={async (newSettings) => {
            await discordService.setSettings(newSettings);
            setDiscordSettingsState(discordService.getSettings());
          }}
        />
      )}

      {/* Add Podcast RSS Modal */}
      {showAddPodcastModal && (
        <AddPodcastModal
          onClose={() => { setShowAddPodcastModal(false); setAddPodcastUrl(''); }}
          onAdd={async (url) => {
            const podcast = await podcastService.addPodcastByUrl(url);
            if (podcast) {
              await podcastService.subscribe(podcast.id);
              setShowAddPodcastModal(false);
              setAddPodcastUrl('');
            }
          }}
          url={addPodcastUrl}
          onUrlChange={setAddPodcastUrl}
        />
      )}

      {/* Podcast Search Modal */}
      {showPodcastSearch && (
        <PodcastSearchModal
          onClose={() => { setShowPodcastSearch(false); setPodcastSearchQuery(''); setPodcastSearchResults([]); }}
          onSearch={async (query) => {
            setPodcastSearchLoading(true);
            const results = await podcastService.searchPodcasts(query);
            setPodcastSearchResults(results);
            setPodcastSearchLoading(false);
          }}
          onSubscribe={async (result) => {
            const podcast = await podcastService.addPodcastByUrl(result.feedUrl);
            if (podcast) {
              await podcastService.subscribe(podcast.id);
            }
          }}
          query={podcastSearchQuery}
          onQueryChange={setPodcastSearchQuery}
          results={podcastSearchResults}
          loading={podcastSearchLoading}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
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
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  profileSection: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    padding: SPACING.xl,
  },
  profileBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  profileGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  profileContent: {
    position: 'relative',
    zIndex: 1,
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: C.glassMedium,
    borderWidth: 2,
    borderColor: C.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRing: {
    position: 'absolute',
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: C.primaryGlow,
  },
  profileName: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textPrimary,
  },
  profileEmail: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
  },
  profileBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: C.glassLight,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: C.border,
  },
  badgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  sectionContainer: {
    marginTop: SPACING.xs,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    paddingHorizontal: SPACING.xs,
  },
  sectionHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: BORDER_RADIUS.sm,
    backgroundColor: C.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  sectionHeaderText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: C.primary,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    flex: 1,
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
  settingsGroup: {
    backgroundColor: C.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginLeft: SPACING.xl + 44, // icon container width + gap
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: C.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingTextContainer: {
    flex: 1,
    minWidth: 0,
  },
  settingTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.textPrimary,
  },
  settingTitleDestructive: {
    color: C.error,
  },
  settingTitleDisabled: {
    color: C.textDisabled,
  },
  settingSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
    marginTop: SPACING.xs,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  selectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: C.glassMedium,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: C.border,
  },
  selectBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.textSecondary,
  },
  sleepTimerBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: C.glassMedium,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: C.border,
  },
  sleepTimerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.primary,
  },
  qualityBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: C.primaryGlow,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: C.primary,
  },
  qualityBadgeFLAC: {
    backgroundColor: C.successGlow,
    borderColor: C.success,
  },
  footer: {
    marginTop: SPACING.xxxl,
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textSecondary,
  },
  footerLegal: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
    textAlign: 'center',
  },
  footerDisclaimer: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textDisabled,
    textAlign: 'center',
  },
  // Modal styles
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalBackdropTouch: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContainer: {
    width: '100%',
    maxHeight: '80%',
    backgroundColor: C.surface,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textPrimary,
  },
  modalClose: {
    padding: SPACING.xs,
  },
  modalContent: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalOptionSelected: {
    backgroundColor: C.primaryGlow,
  },
  modalOptionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textPrimary,
  },
  modalOptionTextSelected: {
    color: C.primary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  // Theme preview card
  themePreviewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    gap: SPACING.md,
  },
  themePreviewCardActive: {
    borderWidth: 2,
    borderColor: C.primary,
    backgroundColor: C.primaryGlow,
  },
  themePreviewGradient: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: C.primaryGlow,
  },
  themePreviewContent: {
    flex: 1,
    minWidth: 0,
  },
  themePreviewLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.textPrimary,
  },
  themePreviewPalette: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
    marginTop: SPACING.xs,
  },
  themePreviewCheck: {
    padding: SPACING.xs,
  },
  // Discord Settings Modal
  modalSection: {
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    color: C.primary,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: SPACING.md,
  },
  inputContainer: {
    marginBottom: SPACING.md,
  },
  textInput: {
    backgroundColor: C.glassLight,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textPrimary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.md,
    padding: SPACING.md,
    paddingTop: 0,
  },
  modalActionButton: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: C.glassMedium,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalActionButtonPrimary: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  modalActionButtonDisabled: {
    opacity: 0.5,
  },
  modalActionButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.textSecondary,
  },
  modalActionButtonTextPrimary: {
    color: C.background,
  },
  modalDescription: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
    marginBottom: SPACING.lg,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed,
  },
  // Podcast Search Modal
  searchClearButton: {
    position: 'absolute',
    right: SPACING.md,
    padding: SPACING.xs,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
  },
  resultsList: {
    gap: SPACING.sm,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: C.glassLight,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: C.border,
    gap: SPACING.md,
  },
  resultArtwork: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: C.primaryGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  resultTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.textPrimary,
  },
  resultSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textSecondary,
  },
  resultMeta: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
  },
  resultAction: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: C.primaryGlow,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    borderColor: C.primary,
  },
  subscribeButton: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.primary,
  },
  emptyResults: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl,
    gap: SPACING.md,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: C.textSecondary,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: C.textMuted,
    textAlign: 'center',
  },
  // WebView
  webViewContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: C.background,
    zIndex: 1000,
  },
  webViewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  webViewTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: C.textPrimary,
  },
  webViewClose: {
    padding: SPACING.xs,
  },
  webView: {
    flex: 1,
  },
});

export default SettingsScreen;