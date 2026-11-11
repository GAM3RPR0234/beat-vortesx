// Beat Vortex - Last.fm Settings Screen
// Complete UI for Last.fm scrobbling configuration

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { WebView } from 'react-native-webview';
import { useColors, useReducedMotion, SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/hooks/useColors';
import { useHaptics } from '@/hooks/useHaptics';
import { lastfmService, LastFmSession } from '@/services/lastfmService';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

export function LastFmSettingsScreen() {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const { lightImpact, mediumImpact, heavyImpact } = useHaptics();

  const [session, setSession] = React.useState<LastFmSession | null>(null);
  const [enabled, setEnabled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [authenticating, setAuthenticating] = React.useState(false);
  const [showWebView, setShowWebView] = React.useState(false);
  const [authToken, setAuthToken] = React.useState('');
  const [queuedCount, setQueuedCount] = React.useState(0);
  const [showDisconnectConfirm, setShowDisconnectConfirm] = React.useState(false);

  const headerAnim = useSharedValue(0);
  const cardAnim = useSharedValue(0);

  React.useEffect(() => {
    const init = async () => {
      await lastfmService.initialize();
      const sess = lastfmService.getSession();
      const en = lastfmService.isEnabled();
      setSession(sess);
      setEnabled(en);
      setLoading(false);

      // Subscribe to queue changes
      const unsubscribe = lastfmService.subscribe((s) => {
        setSession(s);
      });
      return unsubscribe;
    };
    init();

    // Poll queue count
    const interval = setInterval(() => {
      setQueuedCount(lastfmService.getQueuedCount());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    if (!reducedMotion) {
      headerAnim.value = withSpring(1, { damping: 20, stiffness: 200 });
      cardAnim.value = withTiming(1, { duration: 400 });
    } else {
      headerAnim.value = 1;
      cardAnim.value = 1;
    }
  }, [reducedMotion]);

  const handleAuth = async () => {
    setAuthenticating(true);
    lightImpact();

    try {
      const authUrl = lastfmService.getAuthUrl();
      setShowWebView(true);
      // The webview will handle the callback via deep link
    } catch (error) {
      console.error('Auth failed:', error);
      Alert.alert('Error', 'No se pudo iniciar la autenticación.');
      heavyImpact();
      setAuthenticating(false);
    }
  };

  const handleWebViewMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'LASTFM_CALLBACK' && data.token) {
        await completeAuth(data.token);
      }
    } catch (e) {
      // Ignore parse errors
    }
  };

  const handleWebViewNavigation = async (navState: any) => {
    const url = navState.url;
    if (url.startsWith('beatvortex://lastfm-callback')) {
      const urlParams = new URLSearchParams(url.split('?')[1]);
      const token = urlParams.get('token');
      if (token) {
        await completeAuth(token);
      }
      setShowWebView(false);
    }
  };

  const completeAuth = async (token: string) => {
    try {
      const sess = await lastfmService.authenticate(token);
      setSession(sess);
      setEnabled(true);
      mediumImpact();
    } catch (error) {
      console.error('Auth completion failed:', error);
      Alert.alert('Error', 'Autenticación fallida. Intenta de nuevo.');
      heavyImpact();
    } finally {
      setAuthenticating(false);
      setShowWebView(false);
    }
  };

  const handleToggleEnabled = async (value: boolean) => {
    await lastfmService.setEnabled(value);
    setEnabled(value);
    lightImpact();
  };

  const handleDisconnect = async () => {
    await lastfmService.disconnect();
    setSession(null);
    setEnabled(false);
    setQueuedCount(0);
    mediumImpact();
    setShowDisconnectConfirm(false);
  };

  const handleLoveTrack = async (track: any, love: boolean) => {
    await lastfmService.loveTrack(track, love);
    lightImpact();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[styles.loadingText, { color: colors.textMuted, marginTop: SPACING.md }]}>Cargando Last.fm...</Text>
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
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Last.fm</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Scrobbling y estadísticas</Text>
        </Animated.View>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Connection Status Card */}
        <Animated.View
          style={[
            styles.statusCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
            {
              opacity: cardAnim,
              transform: [{ translateY: interpolate(cardAnim.value, [0, 1], [30, 0]) }],
            },
          ]}
        >
          <View style={styles.statusHeader}>
            <View style={[styles.statusIcon, { backgroundColor: session ? colors.successGlow : colors.glassLight }]}>
              <Ionicons name={session ? 'radio' : 'radio'} size={28} color={session ? colors.success : colors.textMuted} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusTitle, { color: colors.textPrimary }]}>
                {session ? `Conectado como ${session.name}` : 'No conectado'}
              </Text>
              <Text style={[styles.statusSubtitle, { color: session ? colors.success : colors.textMuted }]}>
                {session ? (session.subscriber ? 'Suscriptor Last.fm Pro' : 'Cuenta gratuita') : 'Conecta tu cuenta para scrobbling automático'}
              </Text>
            </View>
          </View>

          {session ? (
            <View style={styles.statusActions}>
              <TouchableOpacity
                style={[styles.secondaryButton, { backgroundColor: colors.surfaceOverlay, borderColor: colors.border }]}
                onPress={() => { setShowDisconnectConfirm(true); lightImpact(); }}
                activeOpacity={0.8}
              >
                <Ionicons name="log-out" size={18} color={colors.error} style={{ marginRight: SPACING.xs }} />
                <Text style={[styles.secondaryButtonText, { color: colors.error }]}>Desconectar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary, opacity: authenticating ? 0.6 : 1 }]}
              onPress={handleAuth}
              disabled={authenticating}
              activeOpacity={0.8}
            >
              {authenticating ? (
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="radio" size={22} color={colors.textOnPrimary} style={{ marginRight: SPACING.sm }} />
                  <Text style={[styles.primaryButtonText, { color: colors.textOnPrimary }]}>Conectar con Last.fm</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Scrobbling Controls */}
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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Control de Scrobbling</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="sync" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Scrobbling Automático</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Registra reproducciones al completar pistas (≥50% o 4 min)</Text>
              </View>
            </View>
            <Switch
              value={enabled && !!session}
              onValueChange={handleToggleEnabled}
              disabled={!session}
              thumbColor={enabled ? colors.primary : colors.textDisabled}
              trackColor={{ false: colors.border, true: colors.primaryGlow }}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.accentGlow }]}>
                <Ionicons name="musical-notes" size={22} color={colors.accent} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Cola de Scrobbles</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>
                  {queuedCount > 0 ? `${queuedCount} pendiente${queuedCount !== 1 ? 's' : ''} de sincronizar` : 'Cola vacía'}
                </Text>
              </View>
            </View>
            {queuedCount > 0 && (
              <TouchableOpacity
                style={[styles.tertiaryButton, { backgroundColor: colors.warningGlow, borderColor: colors.warning }]}
                onPress={() => { lastfmService.clearQueue(); setQueuedCount(0); lightImpact(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.tertiaryButtonText, { color: colors.warning }]}>Limpiar Cola</Text>
              </TouchableOpacity>
            )}
          </View>

          {session && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <View style={[styles.settingIcon, { backgroundColor: colors.secondaryGlow }]}>
                    <Ionicons name="musical-notes" size={22} color={colors.secondary} />
                  </View>
                  <View>
                    <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Now Playing</Text>
                    <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Actualiza \"Escuchando ahora\" sin contar reproducción</Text>
                  </View>
                </View>
                <Switch
                  value={enabled}
                  onValueChange={handleToggleEnabled}
                  disabled={!enabled}
                  thumbColor={enabled ? colors.secondary : colors.textDisabled}
                  trackColor={{ false: colors.border, true: colors.secondaryGlow }}
                />
              </View>
            </>
          )}
        </Animated.View>

        {/* Privacy & Data */}
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
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Privacidad y Datos</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.glassMedium }]}>
                <Ionicons name="document" size={22} color={colors.textSecondary} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Exportar Historial</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Descarga tus scrobbles como JSON/CSV</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.tertiaryButton, { backgroundColor: colors.glassMedium, borderColor: colors.border }]}
              onPress={() => { lightImpact(); Alert.alert('Próximamente', 'Exportación de historial en desarrollo.'); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tertiaryButtonText, { color: colors.primary }]}>Exportar</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.settingIcon, { backgroundColor: colors.error + '20' }]}>
                <Ionicons name="trash" size={22} color={colors.error} />
              </View>
              <View>
                <Text style={[styles.settingTitle, { color: colors.textPrimary }]}>Limpiar Cola Local</Text>
                <Text style={[styles.settingSubtitle, { color: colors.textMuted }]}>Elimina scrobbles pendientes sin enviar</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.tertiaryButton, { backgroundColor: colors.error + '20', borderColor: colors.error }]}
              onPress={() => {
                Alert.alert(
                  'Limpiar cola',
                  '¿Eliminar todos los scrobbles pendientes? Se perderán si no se han enviado.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Limpiar', style: 'destructive', onPress: () => { lastfmService.clearQueue(); setQueuedCount(0); heavyImpact(); } },
                  ]
                );
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.tertiaryButtonText, { color: colors.error }]}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Info */}
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
              Beat Vortex usa la API oficial de Last.fm. Tus credenciales se almacenan localmente en tu dispositivo.
              El scrobbling ocurre solo cuando completas una pista (50% o 4 minutos). Puedes desactivarlo en cualquier momento.
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="link" size={20} color={colors.accent} style={{ marginRight: SPACING.sm, marginTop: 2 }} />
            <Text style={[styles.infoText, { color: colors.textSecondary, flex: 1 }]}>
              <Text style={{ color: colors.primary }}>last.fm/api</Text> · OAuth 1.0a · Sin servidores intermedios
            </Text>
          </View>
        </Animated.View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Disconnect Confirm Modal */}
      {showDisconnectConfirm && (
        <Modal animationType="slide" transparent={true} visible={showDisconnectConfirm} onRequestClose={() => setShowDisconnectConfirm(false)}>
          <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowDisconnectConfirm(false)} activeOpacity={1}>
            <View style={[styles.modalContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
              <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Desconectar Last.fm</Text>
              <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>
                Se cerrará la sesión y se desactivará el scrobbling. La cola pendiente se perderá.
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

      {/* WebView for OAuth */}
      {showWebView && (
        <Modal animationType="slide" transparent={false} visible={showWebView} onRequestClose={() => setShowWebView(false)}>
          <SafeAreaView style={styles.webViewContainer}>
            <View style={styles.webViewHeader}>
              <TouchableOpacity onPress={() => { setShowWebView(false); setAuthenticating(false); lightImpact(); }} style={styles.webViewClose} activeOpacity={0.7}>
                <Ionicons name="close" size={28} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.webViewTitle, { color: colors.textPrimary }]}>Autenticación Last.fm</Text>
              <View style={{ width: 44 }} />
            </View>
            <WebView
              source={{ uri: lastfmService.getAuthUrl() }}
              style={styles.webView}
              onMessage={handleWebViewMessage}
              onNavigationStateChange={handleWebViewNavigation}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              startInLoadingState={true}
              renderLoading={() => (
                <View style={styles.webViewLoading}>
                  <ActivityIndicator color={colors.primary} size="large" />
                  <Text style={[styles.loadingText, { color: colors.textMuted, marginTop: SPACING.md }]}>Cargando Last.fm...</Text>
                </View>
              )}
            />
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  statusCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.lg, gap: SPACING.lg },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  statusIcon: { width: 56, height: 56, borderRadius: BORDER_RADIUS.round, justifyContent: 'center', alignItems: 'center' },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  statusSubtitle: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular, marginTop: SPACING.xs },
  statusActions: { flexDirection: 'row', gap: SPACING.md },
  sectionCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.lg, gap: SPACING.md },
  sectionTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, marginBottom: SPACING.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1 },
  settingIcon: { width: 44, height: 44, borderRadius: BORDER_RADIUS.round, justifyContent: 'center', alignItems: 'center' },
  settingTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  settingSubtitle: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular, marginTop: SPACING.xs },
  divider: { height: 1, marginVertical: SPACING.sm },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: BORDER_RADIUS.round },
  primaryButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.bold, letterSpacing: TYPOGRAPHY.letterSpacing.wide },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.round, borderWidth: 1 },
  secondaryButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  tertiaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md, borderRadius: BORDER_RADIUS.round, borderWidth: 1 },
  tertiaryButtonText: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  infoCard: { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, marginBottom: SPACING.sm },
  infoText: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular, lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm },
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
  webViewContainer: { flex: 1 },
  webViewHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.md, paddingVertical: SPACING.md, borderBottomWidth: 1 },
  webViewClose: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  webViewTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, flex: 1, textAlign: 'center' },
  webView: { flex: 1 },
  webViewLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default LastFmSettingsScreen;