// Beat Vortex - M3U Import Screen
// Complete UI for importing M3U/M3U8 playlists with match preview

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as DocumentPicker from 'expo-document-picker';
import { DocumentPickerResult } from 'expo-document-picker';
import { useColors, useReducedMotion, SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/hooks/useColors';
import { useHaptics } from '@/hooks/useHaptics';
import { playlistImportService, M3UParseResult, M3UEntry, ImportReport, matchEntryToCatalog } from '@/services/playlistImportService';
import { usePlaylistStore } from '@/store/playlistStore';
import { getMusicPlaceholder } from '@/utils/placeholderImages';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated';

interface ParsedEntry extends M3UEntry {
  matched: boolean;
  matchedTrack?: any;
  confidence: number;
}

export function M3UImportScreen() {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const { lightImpact, mediumImpact, heavyImpact } = useHaptics();
  const { createPlaylist } = usePlaylistStore();

  const [stage, setStage] = React.useState<'pick' | 'preview' | 'importing' | 'done'>('pick');
  const [parseResult, setParseResult] = React.useState<M3UParseResult | null>(null);
  const [entries, setEntries] = React.useState<ParsedEntry[]>([]);
  const [playlistName, setPlaylistName] = React.useState('');
  const [importReport, setImportReport] = React.useState<ImportReport | null>(null);
  const [isImporting, setIsImporting] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filter, setFilter] = React.useState<'all' | 'matched' | 'unmatched'>('all');

  const headerAnim = useSharedValue(0);
  const listAnim = useSharedValue(0);

  React.useEffect(() => {
    if (!reducedMotion) {
      headerAnim.value = withSpring(1, { damping: 20, stiffness: 200 });
      listAnim.value = withTiming(1, { duration: 400 });
    } else {
      headerAnim.value = 1;
      listAnim.value = 1;
    }
  }, [stage, reducedMotion]);

  const handleFilePick = async () => {
    try {
      lightImpact();
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/x-mpegurl', 'application/x-mpegurl', 'text/plain'],
        copyToCacheDirectory: true,
        multiple: false,
      });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const response = await fetch(asset.uri);
      const content = await response.text();

      const parsed = playlistImportService.parseM3U(content);
      setParseResult(parsed);

      // Match entries to catalog
      const matchedEntries: ParsedEntry[] = [];
      for (let i = 0; i < parsed.entries.length; i++) {
        const entry = parsed.entries[i];
        const catalogTrack = await matchEntryToCatalog(entry);
        matchedEntries.push({
          ...entry,
          matched: !!catalogTrack,
          matchedTrack: catalogTrack,
          confidence: catalogTrack ? 0.85 : 0,
        });
      }

      setEntries(matchedEntries);
      setPlaylistName(parsed.entries[0]?.album || 'Playlist Importada');
      setStage('preview');
      mediumImpact();
    } catch (error) {
      console.error('M3U import failed:', error);
      Alert.alert('Error', 'No se pudo leer el archivo M3U. Verifica que sea un archivo válido.');
      heavyImpact();
    }
  };

  const handleImport = async () => {
    if (!playlistName.trim()) {
      Alert.alert('Nombre requerido', 'Por favor ingresa un nombre para la playlist.');
      return;
    }

    setIsImporting(true);
    heavyImpact();

    try {
      // Convert entries to M3UEntry format for import
      const m3uEntries = entries.map(e => ({
        title: e.title,
        artist: e.artist,
        album: e.album,
        duration: e.duration,
        url: e.url,
        artwork: e.artwork,
        genre: e.genre,
        year: e.year,
        trackNumber: e.trackNumber,
      }));

      // Create a temporary M3U content for import
      const m3uContent = playlistImportService.exportToM3U(
        m3uEntries.map(e => ({
          id: `temp_${Date.now()}_${Math.random()}`,
          title: e.title,
          artist: e.artist,
          album: e.album || 'Unknown Album',
          artwork: e.artwork || getMusicPlaceholder('track'),
          duration: e.duration || 0,
          url: e.url,
          genre: e.genre,
          year: e.year ? (typeof e.year === 'string' ? parseInt(e.year, 10) : e.year) : undefined,
        })),
        playlistName
      );

      const report = await playlistImportService.importM3UPlaylist(m3uContent, playlistName);

      // Create playlist in store
      await createPlaylist({
        title: playlistName,
        description: `Importada desde M3U · ${report.matched} coincidencias · ${report.unmatched} no encontradas`,
        artwork: report.tracks[0]?.artwork || getMusicPlaceholder('playlist'),
        tracks: report.tracks.map(t => t.id),
        isSmart: false,
      });

      setImportReport(report);
      setStage('done');
      mediumImpact();
    } catch (error) {
      console.error('Import failed:', error);
      Alert.alert('Error', 'No se pudo importar la playlist. Intenta de nuevo.');
      heavyImpact();
    } finally {
      setIsImporting(false);
    }
  };

  const filteredEntries = entries.filter(e => {
    if (filter === 'matched') return e.matched;
    if (filter === 'unmatched') return !e.matched;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return e.title.toLowerCase().includes(q) || e.artist.toLowerCase().includes(q);
    }
    return true;
  });

  const matchedCount = entries.filter(e => e.matched).length;
  const unmatchedCount = entries.filter(e => !e.matched).length;

  if (stage === 'pick') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => {}} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Importar M3U</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <BlurView intensity={60} style={styles.heroBlur} />
            <LinearGradient
              colors={[colors.primary + '15', colors.secondary + '10']}
              style={styles.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
            <View style={styles.heroContent}>
              <View style={[styles.heroIcon, { backgroundColor: colors.primaryGlow }]}>
                <Ionicons name="musical-notes" size={48} color={colors.primary} />
              </View>
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>Importar Playlist M3U</Text>
              <Text style={[styles.heroSubtitle, { color: colors.textMuted }]}>
                Selecciona un archivo .m3u o .m3u8 para importar tu playlist.
                Beat Vortex buscará coincidencias en el catálogo automáticamente.
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleFilePick}
                activeOpacity={0.8}
              >
                <Ionicons name="folder-open" size={22} color={colors.textOnPrimary} style={{ marginRight: SPACING.sm }} />
                <Text style={[styles.primaryButtonText, { color: colors.textOnPrimary }]}>Seleccionar Archivo M3U</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.featuresContainer}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>¿Qué hace esta función?</Text>
            <View style={styles.featuresGrid}>
              {[
                { icon: 'search', title: 'Búsqueda Inteligente', desc: 'Coincide pistas por título, artista y álbum' },
                { icon: 'checkmark-circle', title: 'Reporte Detallado', desc: 'Vea cuántas pistas se encontraron y cuáles no' },
                { icon: 'create', title: 'Playlist Nativa', desc: 'Se crea una playlist real en tu biblioteca' },
                { icon: 'share', title: 'Exportar M3U', desc: 'Exporta tus playlists para usar en otras apps' },
              ].map((f, i) => (
                <View key={i} style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.primaryGlow }]}>
                    <Ionicons name={f.icon as any} size={24} color={colors.primary} />
                  </View>
                  <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>{f.title}</Text>
                  <Text style={[styles.featureDesc, { color: colors.textMuted }]}>{f.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color={colors.accent} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Soporta etiquetas extendidas: #EXTINF, #EXTALB, #EXTGRP, #EXTART, #EXTIMG
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="information-circle" size={20} color={colors.accent} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.infoText, { color: colors.textSecondary }]}>
                Las pistas no encontradas se agregan con metadatos básicos del archivo M3U
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (stage === 'preview') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => { setStage('pick'); lightImpact(); }} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Vista Previa</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{entries.length} pistas · {matchedCount} coinciden · {unmatchedCount} nuevas</Text>
          </View>
          <TouchableOpacity onPress={() => { setStage('pick'); lightImpact(); }} style={styles.closeButton} activeOpacity={0.7}>
            <Ionicons name="close" size={28} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={[styles.previewHeader, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.previewStats}>
            <View style={[styles.stat, { borderRightColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.success }]}>{matchedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Coinciden</Text>
            </View>
            <View style={[styles.stat, { borderRightColor: colors.border }]}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{unmatchedCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Nuevas</Text>
            </View>
            <View style={styles.stat}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{entries.length}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
            </View>
          </View>

          <View style={styles.filterBar}>
            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.surfaceOverlay, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Buscar pistas..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholderTextColor={colors.textDisabled}
              onFocus={() => {}}
            />
            <View style={styles.filterChips}>
              {(['all', 'matched', 'unmatched'] as const).map(f => (
                <TouchableOpacity
                  key={f}
                  style={[
                    styles.filterChip,
                    filter === f && styles.filterChipActive,
                    { backgroundColor: filter === f ? colors.primaryGlow : colors.surface, borderColor: filter === f ? colors.primary : colors.border },
                  ]}
                  onPress={() => { setFilter(f); lightImpact(); }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.filterChipText,
                    filter === f && styles.filterChipTextActive,
                    { color: filter === f ? colors.primary : colors.textSecondary },
                  ]}>
                    {f === 'all' ? 'Todas' : f === 'matched' ? '✓ Coinciden' : '✗ Nuevas'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <FlatList
          data={filteredEntries}
          keyExtractor={(item, index) => `${item.url}_${index}`}
          renderItem={({ item, index }) => (
            <Animated.View
              style={[
                styles.entryRow,
                { backgroundColor: colors.surface, borderColor: colors.border },
                {
                  opacity: listAnim,
                  transform: [{ translateY: interpolate(listAnim.value, [0, 1], [20, 0]) }],
                },
              ]}
            >
              <View style={[
                styles.entryStatus,
                { backgroundColor: item.matched ? colors.successGlow : colors.warningGlow, borderColor: item.matched ? colors.success : colors.warning },
              ]}>
                <Ionicons name={item.matched ? 'checkmark' : 'add'} size={16} color={item.matched ? colors.success : colors.warning} />
              </View>
              <View style={styles.entryInfo}>
                <Text style={[styles.entryTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                <Text style={[styles.entryArtist, { color: colors.textMuted }]}>{item.artist}</Text>
                {item.matched && item.matchedTrack && (
                  <View style={styles.matchBadge}>
                    <Ionicons name="checkmark-circle" size={12} color={colors.success} style={{ marginRight: 2 }} />
                    <Text style={[styles.matchBadgeText, { color: colors.success }]}>Encontrada en catálogo</Text>
                  </View>
                )}
                {!item.matched && (
                  <View style={styles.matchBadge}>
                    <Ionicons name="add-circle" size={12} color={colors.warning} style={{ marginRight: 2 }} />
                    <Text style={[styles.matchBadgeText, { color: colors.warning }]}>Se agregará con metadatos M3U</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.emptyPreview}>
              <Ionicons name="search" size={48} color={colors.textDisabled} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>Sin resultados para "{searchQuery}"</Text>
            </View>
          }
        />

        <View style={[styles.bottomBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <View style={styles.bottomBarContent}>
            <TextInput
              style={[styles.playlistNameInput, { backgroundColor: colors.surfaceOverlay, borderColor: colors.border, color: colors.textPrimary }]}
              placeholder="Nombre de la playlist"
              value={playlistName}
              onChangeText={setPlaylistName}
              placeholderTextColor={colors.textDisabled}
            />
            <TouchableOpacity
              style={[styles.importButton, { backgroundColor: isImporting ? colors.textDisabled : colors.primary }]}
              onPress={handleImport}
              disabled={isImporting || !playlistName.trim()}
              activeOpacity={0.8}
            >
              {isImporting ? (
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <>
                  <Ionicons name="download" size={22} color={colors.textOnPrimary} style={{ marginRight: SPACING.sm }} />
                  <Text style={[styles.importButtonText, { color: colors.textOnPrimary }]}>Importar Playlist</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (stage === 'done' && importReport) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setStage('pick'); setImportReport(null); lightImpact(); }} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={28} color={colors.primary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Importación Completa</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false} contentContainerStyle={styles.doneContent}>
          <View style={[styles.successCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.successIcon, { backgroundColor: colors.successGlow }]}>
              <Ionicons name="checkmark-circle" size={48} color={colors.success} />
            </View>
            <Text style={[styles.successTitle, { color: colors.textPrimary }]}>¡Playlist Importada!</Text>
            <Text style={[styles.successSubtitle, { color: colors.textMuted }]}>\"{importReport.playlistName}\" creada con {importReport.tracks.length} pistas</Text>
          </View>

          <View style={[styles.reportCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.reportTitle, { color: colors.textPrimary }]}>Resumen de Importación</Text>
            <View style={styles.reportGrid}>
              <View style={[styles.reportItem, { borderRightColor: colors.border, borderBottomColor: colors.border }]}>
                <Text style={[styles.reportValue, { color: colors.textPrimary }]}>{importReport.totalEntries}</Text>
                <Text style={[styles.reportLabel, { color: colors.textMuted }]}>Entradas Totales</Text>
              </View>
              <View style={[styles.reportItem, { borderBottomColor: colors.border }]}>
                <Text style={[styles.reportValue, { color: colors.success }]}>{importReport.matched}</Text>
                <Text style={[styles.reportLabel, { color: colors.textMuted }]}>Coincidencias</Text>
              </View>
              <View style={[styles.reportItem, { borderRightColor: colors.border }]}>
                <Text style={[styles.reportValue, { color: colors.warning }]}>{importReport.unmatched}</Text>
                <Text style={[styles.reportLabel, { color: colors.textMuted }]}>No Encontradas</Text>
              </View>
              <View style={styles.reportItem}>
                <Text style={[styles.reportValue, { color: colors.textMuted }]}>{importReport.duplicates}</Text>
                <Text style={[styles.reportLabel, { color: colors.textMuted }]}>Duplicados</Text>
              </View>
            </View>
          </View>

          {importReport.errors.length > 0 && (
            <View style={[styles.errorsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.errorsTitle, { color: colors.error }]}>Advertencias</Text>
              {importReport.errors.map((err, i) => (
                <Text key={i} style={[styles.errorText, { color: colors.textSecondary }]}>• {err}</Text>
              ))}
            </View>
          )}

          <View style={styles.doneActions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => { setStage('pick'); setImportReport(null); lightImpact(); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Importar Otra</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary }]}
              onPress={() => { /* Navigate to playlist */ lightImpact(); }}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryButtonText, { color: colors.textOnPrimary }]}>Ver Playlist</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  closeButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxxl, gap: SPACING.lg },
  heroCard: {
    position: 'relative',
    borderRadius: BORDER_RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    padding: SPACING.xl,
  },
  heroBlur: { ...StyleSheet.absoluteFillObject },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  heroContent: { position: 'relative', zIndex: 1, alignItems: 'center', gap: SPACING.lg },
  heroIcon: { width: 96, height: 96, borderRadius: BORDER_RADIUS.round, justifyContent: 'center', alignItems: 'center' },
  heroTitle: { fontSize: TYPOGRAPHY.fontSize.xxxl, fontWeight: TYPOGRAPHY.fontWeight.heavy, textAlign: 'center', letterSpacing: TYPOGRAPHY.letterSpacing.tight },
  heroSubtitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.regular, textAlign: 'center', lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: BORDER_RADIUS.round, marginTop: SPACING.md },
  primaryButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.bold, letterSpacing: TYPOGRAPHY.letterSpacing.wide },
  featuresContainer: { gap: SPACING.md },
  sectionTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, marginBottom: SPACING.md },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md },
  featureCard: { flex: 1, minWidth: '45%', borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.lg, alignItems: 'center', gap: SPACING.md },
  featureIcon: { width: 56, height: 56, borderRadius: BORDER_RADIUS.round, justifyContent: 'center', alignItems: 'center' },
  featureTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold, textAlign: 'center' },
  featureDesc: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular, textAlign: 'center', color: '#78788c' },
  infoCard: { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md, gap: SPACING.sm },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm },
  infoText: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular, lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm, flex: 1 },

  previewHeader: { padding: SPACING.md, borderBottomWidth: 1 },
  previewStats: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SPACING.md },
  stat: { alignItems: 'center', paddingVertical: SPACING.sm, borderRightWidth: 1 },
  statValue: { fontSize: TYPOGRAPHY.fontSize.xxl, fontWeight: TYPOGRAPHY.fontWeight.bold },
  statLabel: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium, marginTop: SPACING.xs },
  filterBar: { gap: SPACING.md },
  searchInput: { borderRadius: BORDER_RADIUS.round, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: TYPOGRAPHY.fontSize.md },
  filterChips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  filterChip: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.round, borderWidth: 1 },
  filterChipActive: {},
  filterChipText: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  filterChipTextActive: {},

  listContent: { padding: SPACING.md, paddingBottom: 120, gap: SPACING.sm },
  entryRow: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, borderRadius: BORDER_RADIUS.lg, borderWidth: 1, gap: SPACING.md },
  entryStatus: { width: 36, height: 36, borderRadius: BORDER_RADIUS.round, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  entryInfo: { flex: 1, minWidth: 0, gap: SPACING.xs },
  entryTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  entryArtist: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular },
  matchBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.round },
  matchBadgeText: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium },
  separator: { height: 1, marginLeft: 70 },
  emptyPreview: { alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.md },
  emptyText: { fontSize: TYPOGRAPHY.fontSize.md, textAlign: 'center' },

  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, padding: SPACING.md, paddingBottom: SPACING.lg },
  bottomBarContent: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  playlistNameInput: { flex: 1, borderRadius: BORDER_RADIUS.round, borderWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, fontSize: TYPOGRAPHY.fontSize.md },
  importButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.round, minWidth: 160 },
  importButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.bold },

  doneContent: { padding: SPACING.md, paddingBottom: SPACING.xxxl, gap: SPACING.lg, alignItems: 'center' },
  successCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.xl, alignItems: 'center', gap: SPACING.md, width: '100%' },
  successIcon: { width: 80, height: 80, borderRadius: BORDER_RADIUS.round, justifyContent: 'center', alignItems: 'center' },
  successTitle: { fontSize: TYPOGRAPHY.fontSize.xxl, fontWeight: TYPOGRAPHY.fontWeight.bold, textAlign: 'center' },
  successSubtitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.regular, textAlign: 'center' },
  reportCard: { borderRadius: BORDER_RADIUS.xl, borderWidth: 1, padding: SPACING.lg, width: '100%' },
  reportTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, marginBottom: SPACING.lg },
  reportGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  reportItem: { flex: 1, minWidth: '50%', alignItems: 'center', paddingVertical: SPACING.md, borderRightWidth: 1, borderBottomWidth: 1 },
  reportValue: { fontSize: TYPOGRAPHY.fontSize.xxxl, fontWeight: TYPOGRAPHY.fontWeight.heavy },
  reportLabel: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium, marginTop: SPACING.xs, textTransform: 'uppercase', letterSpacing: TYPOGRAPHY.letterSpacing.wider },
  errorsCard: { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, padding: SPACING.md, width: '100%', gap: SPACING.xs },
  errorsTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.bold, marginBottom: SPACING.sm },
  errorText: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular },
  doneActions: { flexDirection: 'row', gap: SPACING.md, width: '100%', marginTop: SPACING.lg },
  secondaryButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.round, borderWidth: 1 },
  secondaryButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.bold },
});

export default M3UImportScreen;