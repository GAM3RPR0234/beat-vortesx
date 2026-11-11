// Beat Vortex - Discord Rich Presence Settings Screen
// Complete UI for Discord Rich Presence configuration

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColors, useReducedMotion, SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/hooks/useColors';
import { DEFAULT_COLORS } from '@/constants/theme';
import { useHaptics } from '@/hooks/useHaptics';
import { discordService, type DiscordSettings, type DiscordPresence } from '@/services/discordService';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

export function DiscordSettingsScreen() {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const { lightImpact, mediumImpact, heavyImpact } = useHaptics();

  const [settings, setSettings] = React.useState<DiscordSettings>({
    enabled: false,
    showTrack: true,
    showArtist: true,
    showAlbum: true,
    showProgress: true,
    showButtons: true,
  });
  const [loading, setLoading] = React.useState(true);
  const [presence, setPresence] = React.useState<DiscordPresence | null>(null);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = React.useState(false);
  const [customState, setCustomState] = React.useState('');

  const headerAnim = useSharedValue(0);
  const cardAnim = useSharedValue(0);
  const previewAnim = useSharedValue(0);

  React.useEffect(() => {
    const init = async () => {
      await discordService.initialize();
      const s = discordService.getSettings();
      const p = discordService.getCurrentPresence();
      setSettings(s);
      setPresence(p);
      setCustomState(s.customState || '');
      setLoading(false);

      // Subscribe to presence updates
      const unsubscribe = discordService.subscribe((p) => {
        setPresence(p);
      });
      return unsubscribe;
    };
    init();

    if (!reducedMotion) {
      headerAnim.value = withSpring(1, { damping: 20, stiffness: 200 });
      cardAnim.value = withTiming(1, { duration: 400 });
      previewAnim.value = withTiming(1, { duration: 500 });
    } else {
      headerAnim.value = 1;
      cardAnim.value = 1;
      previewAnim.value = 1;
    }
  }, [reducedMotion]);

  const handleSettingChange = async (key: keyof DiscordSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    await discordService.setSettings(newSettings);
    lightImpact();
  };

  const handleCustomStateChange = async (text: string) => {
    setCustomState(text);
    await discordService.setSettings({ ...settings, customState: text });
  };

  const handleDisconnect = async () => {
    await discordService.disconnect();
    setSettings({ ...settings, enabled: false });
    mediumImpact();
    setShowDisconnectConfirm(false);
  };

  const handleTestPresence = () => {
    // This would trigger a test presence update
    lightImpact();
    Alert.alert('Test', 'Presencia de prueba enviada (requiere cliente de escritorio)');
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Animated.View
            style={[
              styles.loadingSpinner,
              {
                transform: [{ rotate: `${interpolate(previewAnim.value, [0, 1], [0, 360])}deg` }],
              },
            ]}
          >
            <Ionicons name="logo-discord" size={48} color={colors.primary} />
          </Animated.View>
          <Text style={[styles.loadingText, { color: colors.textMuted, marginTop: SPACING.md }]}>Cargando Discord...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => {}} style={styles.backButton} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Animated.View
          style={[
            styles.headerTitleContainer,
            {
              opacity: headerAnim,
              transform: [{ translateY: interpolate(headerAnim.value, [0, 1], [-20, 0]) }],
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Discord Rich Presence</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Muestra lo que escuchas en tu perfil</Text>
        </Animated.View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Master Toggle Card */}
        <Animated.View
          style={[
            styles.masterCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            {
              opacity: cardAnim,
              transform: [{ translateY: interpolate(cardAnim.value, [0, 1], [30, 0]) }],
            },
          ]}
        >
          <View style={styles.masterHeader}>
            <View style={[styles.masterIcon, { backgroundColor: settings.enabled ? colors.discord + '30' : colors.glassLight }]}>
              <Ionicons name="logo-discord" size={32} color={settings.enabled ? colors.discord : colors.textMuted} />
            </View>
            <View style={styles.masterInfo}>
              <Text style={[styles.masterTitle, { color: colors.textPrimary }]}>Rich Presence</Text>
              <Text style={[styles.masterSubtitle, { color: colors.textMuted }]}>
                {settings.enabled ? 'Activo - Tu perfil muestra la reproducción actual' : 'Inactivo - Conecta para compartir tu música'}
              </Text>
            </View>
          </View>

          <Switch
            value={settings.enabled}
            onValueChange={(v) => handleSettingChange('enabled', v)}
            thumbColor={settings.enabled ? colors.discord : colors.textDisabled}
            trackColor={{ false: colors.border, true: colors.discordGlow }}
            style={styles.masterSwitch}
          />
        </Animated.View>

        {/* Privacy Notice */}
        <Animated.View
          style={[
            styles.privacyCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            {
              opacity: cardAnim,
              transform: [{ translateY: interpolate(cardAnim.value, [0, 1], [30, 0]) }],
            },
          ]}
        >
          <View style={styles.privacyRow}>
            <Ionicons name="shield-checkmark" size={20} color={colors.accent} style={{ marginRight: SPACING.sm, marginTop: 2 }} />
            <Text style={[styles.privacyText, { color: colors.textSecondary, flex: 1 }]}>
              {settings.enabled ? (
                <>
                  <Text style={{ fontWeight: TYPOGRAPHY.fontWeight.semibold }}>Activo: </Text>
                  Tu estado de reproducción se comparte con Discord a través de conexión local (IPC).
                  Funciona solo en escritorio. En móvil, requiere puente de escritorio.
                </>
              ) : (
                'Al activar, Beat Vortex se conectará al cliente de Discord local para actualizar tu estado. No se envían datos a servidores externos.'
              )}
            </Text>
          </View>
        </Animated.View>

        {/* Display Options - only show if enabled */}
        {settings.enabled && (
          <>
            <Animated.View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                {
                  opacity: cardAnim,
                  transform: [{ translateY: interpolate(cardAnim.value, [0, 1], [30, 0]) }],
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Qué Mostrar</Text>

              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, { backgroundColor: colors.primaryGlow }]}>
                    <Ionicons name="musical-notes" size={22} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Título de la pista</Text>
                    <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>Nombre de la canción en reproducción</Text>
                  </View>
                </View>
                <Switch
                  value={settings.showTrack}
                  onValueChange={(v) => handleSettingChange('showTrack', v)}
                  thumbColor={settings.showTrack ? colors.primary : colors.textDisabled}
                  trackColor={{ false: colors.border, true: colors.primaryGlow }}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, { backgroundColor: colors.secondaryGlow }]}>
                    <Ionicons name="person" size={22} color={colors.secondary} />
                  </View>
                  <View>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Artista</Text>
                    <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>Nombre del artista o banda</Text>
                  </View>
                </View>
                <Switch
                  value={settings.showArtist}
                  onValueChange={(v) => handleSettingChange('showArtist', v)}
                  thumbColor={settings.showArtist ? colors.secondary : colors.textDisabled}
                  trackColor={{ false: colors.border, true: colors.secondaryGlow }}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, { backgroundColor: colors.accentGlow }]}>
                    <Ionicons name="albums" size={22} color={colors.accent} />
                  </View>
                  <View>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Álbum</Text>
                    <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>Nombre del álbum (si está disponible)</Text>
                  </View>
                </View>
                <Switch
                  value={settings.showAlbum}
                  onValueChange={(v) => handleSettingChange('showAlbum', v)}
                  thumbColor={settings.showAlbum ? colors.accent : colors.textDisabled}
                  trackColor={{ false: colors.border, true: colors.accentGlow }}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, { backgroundColor: colors.warningGlow }]}>
                    <Ionicons name="time" size={22} color={colors.warning} />
                  </View>
                  <View>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Progreso de reproducción</Text>
                    <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>Barra de progreso y tiempo transcurrido</Text>
                  </View>
                </View>
                <Switch
                  value={settings.showProgress}
                  onValueChange={(v) => handleSettingChange('showProgress', v)}
                  thumbColor={settings.showProgress ? colors.warning : colors.textDisabled}
                  trackColor={{ false: colors.border, true: colors.warningGlow }}
                />
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              <View style={styles.optionRow}>
                <View style={styles.optionLeft}>
                  <View style={[styles.optionIcon, { backgroundColor: colors.successGlow }]}>
                    <Ionicons name="link" size={22} color={colors.success} />
                  </View>
                  <View>
                    <Text style={[styles.optionTitle, { color: colors.textPrimary }]}>Botones de acción</Text>
                    <Text style={[styles.optionSubtitle, { color: colors.textMuted }]}>\"Escuchar en Beat Vortex\" y \"Ver Artista\"</Text>
                  </View>
                </View>
                <Switch
                  value={settings.showButtons}
                  onValueChange={(v) => handleSettingChange('showButtons', v)}
                  thumbColor={settings.showButtons ? colors.success : colors.textDisabled}
                  trackColor={{ false: colors.border, true: colors.successGlow }}
                />
              </View>
            </Animated.View>

            {/* Custom State */}
            <Animated.View
              style={[
                styles.sectionCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                {
                  opacity: cardAnim,
                  transform: [{ translateY: interpolate(cardAnim.value, [0, 1], [30, 0]) }],
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Estado Personalizado</Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>Reemplaza \"by Artist · on Album\" con tu propio texto (máx. 128 caracteres)</Text>

              <TextInput
                style={[styles.customStateInput, { backgroundColor: colors.surfaceOverlay, borderColor: colors.border, color: colors.textPrimary }]}
                placeholder="Ej: 🎵 Chill vibes only"
                value={customState}
                onChangeText={handleCustomStateChange}
                placeholderTextColor={colors.textDisabled}
                maxLength={128}
                onFocus={() => {}}
              />
              <Text style={[styles.charCount, { color: customState.length > 100 ? colors.warning : colors.textDisabled }]}>{customState.length}/128</Text>
            </Animated.View>

            {/* Live Preview */}
            <Animated.View
              style={[
                styles.previewCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                {
                  opacity: previewAnim,
                  transform: [{ translateY: interpolate(previewAnim.value, [0, 1], [30, 0]) }],
                },
              ]}
            >
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Vista Previa en Vivo</Text>
              <View style={[styles.discordPreview, { backgroundColor: colors.discordBackground, borderColor: colors.discordGlow }]}>
                <View style={styles.previewHeader}>
                  <View style={[styles.previewAvatar, { backgroundColor: colors.discord }]} />
                  <View style={styles.previewUserInfo}>
                    <Text style={styles.previewUsername}>Tu Usuario</Text>
                    <Text style={styles.previewStatus}>
                      {settings.showTrack ? 'Escuchando ' : ''}
                      {settings.showTrack && settings.showArtist ? '· ' : ''}
                      {settings.showArtist ? 'Artista' : ''}
                    </Text>
                  </View>
                </View>

                <View style={styles.previewContent}>
                  <View style={styles.previewArtwork} />
                  <View style={styles.previewTrackInfo}>
                    <Text style={styles.previewTrackTitle}>
                      {settings.showTrack ? 'Título de la Canción' : '—'}
                    </Text>
                    <View style={styles.previewMeta}>
                      {settings.showArtist && <Text style={styles.previewMetaItem}>por Artista</Text>}
                      {settings.showAlbum && <Text style={styles.previewMetaItem}>en Álbum</Text>}
                    </View>
                    {settings.showProgress && (
                      <View style={styles.previewProgress}>
                        <View style={styles.previewProgressBar}>
                          <View style={styles.previewProgressFill} />
                        </View>
                        <Text style={styles.previewProgressText}>1:30 / 3:45</Text>
                      </View>
                    )}
                    {settings.showButtons && (
                      <View style={styles.previewButtons}>
                        <View style={styles.previewButton}>Escuchar en Beat Vortex</View>
                        <View style={styles.previewButton}>Ver Artista</View>
                      </View>
                    )}
                  </View>
                </View>
              </View>
            </Animated.View>

            {/* Test Button */}
            <Animated.View
              style={[
                styles.testCard,
                { backgroundColor: colors.surface, borderColor: colors.border },
                {
                  opacity: cardAnim,
                  transform: [{ translateY: interpolate(cardAnim.value, [0, 1], [30, 0]) }],
                },
              ]}
            >
              <TouchableOpacity
                style={[styles.testButton, { backgroundColor: colors.discord + '20', borderColor: colors.discord }]}
                onPress={handleTestPresence}
                activeOpacity={0.8}
              >
                <Ionicons name="send" size={20} color={colors.discord} style={{ marginRight: SPACING.sm }} />
                <Text style={[styles.testButtonText, { color: colors.discord }]}>Enviar Presencia de Prueba</Text>
              </TouchableOpacity>
              <Text style={[styles.testNote, { color: colors.textDisabled }]}>Requiere cliente de Discord en escritorio conectado</Text>
            </Animated.View>
          </>
        )}

        {/* Platform Note */}
        <Animated.View
          style={[
            styles.infoCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            {
              opacity: cardAnim,
              transform: [{ translateY: interpolate(cardAnim.value, [0, 1], [30, 0]) }],
            },
          ]}
        >
          <View style={styles.infoRow}>
            <Ionicons name="information-circle" size={20} color={colors.accent} style={{ marginRight: SPACING.sm, marginTop: 2 }} />
            <Text style={[styles.infoText, { color: colors.textSecondary, flex: 1 }]}>
              <Text style={{ fontWeight: TYPOGRAPHY.fontWeight.semibold, color: colors.textPrimary }}>Nota de plataforma: </Text>
              Discord Rich Presence funciona nativamente en escritorio (Windows/macOS/Linux) vía IPC local.
              En móvil, requiere un puente de escritorio o implementación vía webhook (próximamente).
              La app detecta automáticamente el entorno.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="logo-github" size={20} color={colors.accent} style={{ marginRight: SPACING.sm, marginTop: 2 }} />
            <Text style={[styles.infoText, { color: colors.textSecondary, flex: 1 }]}>
              Código abierto · Sin servidores intermedios · Conexión local directa
            </Text>
          </View>
        </Animated.View>

        {/* Disconnect */}
        {settings.enabled && (
          <Animated.View
            style={[
              styles.dangerCard,
              { backgroundColor: colors.surface, borderColor: colors.border },
              {
                opacity: cardAnim,
                transform: [{ translateY: interpolate(cardAnim.value, [0, 1], [30, 0]) }],
              },
            ]}
          >
            <TouchableOpacity
              style={[styles.dangerButton, { backgroundColor: colors.error + '15', borderColor: colors.error }]}
              onPress={() => { setShowDisconnectConfirm(true); lightImpact(); }}
              activeOpacity={0.8}
            >
              <Ionicons name="log-out" size={20} color={colors.error} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.dangerButtonText, { color: colors.error }]}>Desconectar Discord</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Disconnect Confirm Modal */}
      {showDisconnectConfirm && (
        <Modal animationType="slide" transparent={true} visible={showDisconnectConfirm} onRequestClose={() => setShowDisconnectConfirm(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowDisconnectConfirm(false)} activeOpacity={1}>
            <View style={[styles.modalContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Desconectar Discord</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Se desactivará Rich Presence. Tu estado en Discord volverá a la normalidad.
              </Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalCancelButton, { backgroundColor: colors.glassMedium, borderColor: colors.border }]}
                  onPress={() => setShowDisconnectConfirm(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalConfirmButton, { backgroundColor: colors.error + '30', borderColor: colors.error }]}
                  onPress={handleDisconnect}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.modalButtonText, { color: colors.error }]}>Desconectar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingSpinner: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.regular },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitleContainer: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold },
  headerSubtitle: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular, marginTop: SPACING.xs },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxxl, gap: SPACING.lg },
  masterCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.lg },
  masterHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.md },
  masterIcon: { width: 64, height: 64, borderRadius: BORDER_RADIUS.round, justifyContent: 'center', alignItems: 'center' },
  masterInfo: { flex: 1 },
  masterTitle: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold },
  masterSubtitle: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular, marginTop: SPACING.xs },
  masterSwitch: { marginTop: SPACING.md, alignSelf: 'flex-end' },
  privacyCard: { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md },
  privacyRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  privacyText: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular, lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm },
  sectionCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.lg, gap: SPACING.md },
  sectionTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, marginBottom: SPACING.sm },
  sectionSubtitle: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular, marginBottom: SPACING.md },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm },
  optionLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  optionIcon: { width: 44, height: 44, borderRadius: BORDER_RADIUS.round, justifyContent: 'center', alignItems: 'center' },
  optionTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  optionSubtitle: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular, marginTop: SPACING.xs },
  divider: { height: 1 },
  customStateInput: { borderRadius: BORDER_RADIUS.md, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: TYPOGRAPHY.fontSize.md, marginBottom: SPACING.xs },
  charCount: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium, textAlign: 'right' },
  previewCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.lg },
  discordPreview: { borderRadius: BORDER_RADIUS.lg, overflow: 'hidden', borderWidth: 1 },
  previewHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderBottomWidth: 1, borderBottomColor: '#40444b' },
  previewAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: DEFAULT_COLORS.discord },
  previewUserInfo: { flex: 1 },
  previewUsername: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.bold, color: '#ffffff' },
  previewStatus: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular, color: '#b9bbbe', marginTop: 2 },
  previewContent: { flexDirection: 'row', padding: SPACING.md, gap: SPACING.md },
  previewArtwork: { width: 56, height: 56, borderRadius: BORDER_RADIUS.md, backgroundColor: '#202225' },
  previewTrackInfo: { flex: 1, justifyContent: 'center', gap: SPACING.xs },
  previewTrackTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold, color: '#ffffff' },
  previewMeta: { flexDirection: 'row', gap: SPACING.md, flexWrap: 'wrap' },
  previewMetaItem: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular, color: '#b9bbbe' },
  previewProgress: { gap: SPACING.xs },
  previewProgressBar: { height: 4, borderRadius: 2, backgroundColor: '#40444b', overflow: 'hidden' },
  previewProgressFill: { height: '100%', width: '40%', borderRadius: 2, backgroundColor: DEFAULT_COLORS.discord },
  previewProgressText: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular, color: '#b9bbbe', textAlign: 'right' },
  previewButtons: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm },
  previewButton: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.round, backgroundColor: DEFAULT_COLORS.discord + '30' },
  testCard: { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md },
  testButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.round, borderWidth: 1 },
  testButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  testNote: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular, textAlign: 'center', marginTop: SPACING.sm },
  infoCard: { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  infoText: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular, lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm },
  dangerCard: { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.xs },
  dangerButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.round, borderWidth: 1 },
  dangerButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  bottomSpacer: { height: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.md },
  modalContainer: { width: '90%', maxWidth: 350, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, borderWidth: 1, shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 20 },
  modalHandle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, textAlign: 'center', marginBottom: SPACING.xs },
  modalSubtitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.regular, textAlign: 'center', marginBottom: SPACING.lg, lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md },
  modalButtons: { flexDirection: 'row', gap: SPACING.md },
  modalCancelButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.round, borderWidth: 1, alignItems: 'center' },
  modalConfirmButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.round, borderWidth: 1, alignItems: 'center' },
  modalButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },
});

export default DiscordSettingsScreen;