// Beat Vortex - Downloads Screen (Redesigned)
// Modern downloads management with dynamic theming, animations, and haptic feedback

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
  Alert,
  Platform,
  Share,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColors, useReducedMotion } from '@/hooks/useColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/constants/theme';
import { useHaptics } from '@/hooks/useHaptics';
import { useDownloadStore } from '@/store/downloadStore';
import { downloadService, DownloadTask, DownloadStatus } from '@/services/downloadService';

type DownloadTab = 'active' | 'completed';

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
  const { lightImpact } = useHaptics();
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
    lightImpact();
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

function DownloadItem({ task, index, onPress, onPause, onCancel, onRetry }: {
  task: DownloadTask;
  index: number;
  onPress: () => void;
  onPause: () => void;
  onCancel: () => void;
  onRetry: () => void;
}) {
  const colors = useColors();
  const { lightImpact } = useHaptics();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;
  const progressAnim = React.useRef(new Animated.Value(task.progress)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION.duration.normal,
        delay: index * 50,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(1);
    }

    Animated.timing(progressAnim, {
      toValue: task.progress,
      duration: 500,
      easing: ANIMATION.easing.easeOut,
      useNativeDriver: false,
    }).start();
  }, [task.progress, index, reducedMotion]);

  const getStatusColor = () => {
    switch (task.status) {
      case 'downloading': return colors.primary;
      case 'completed': return colors.success;
      case 'paused': return colors.warning;
      case 'queued': return colors.textMuted;
      case 'error': return colors.error;
      default: return colors.textMuted;
    }
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'downloading': return 'cloud-download';
      case 'completed': return 'checkmark-circle';
      case 'paused': return 'pause-circle';
      case 'queued': return 'time';
      case 'error': return 'alert-circle';
      default: return 'cloud-download';
    }
  };

  const getStatusText = () => {
    switch (task.status) {
      case 'downloading': return `Descargando · ${downloadService.formatSpeed(task.speed)} · ${downloadService.formatETA(task.eta)}`;
      case 'completed': return `Completado · ${downloadService.formatBytes(task.totalBytes)}`;
      case 'paused': return 'Pausado';
      case 'queued': return 'En cola';
      case 'error': return `Error: ${task.error || 'Desconocido'}`;
      default: return '';
    }
  };

  const handleAction = (action: () => void) => {
    lightImpact();
    action();
  };

  return (
    <Animated.View
      style={[
        styles.downloadItem,
        { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.downloadItemMain} accessibilityRole="button" accessibilityLabel={`${task.track.title} por ${task.track.artist}, ${getStatusText()}`}>
        <View style={styles.itemArtworkContainer}>
          <Image source={{ uri: task.track.artwork }} style={styles.itemArtwork} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={styles.itemArtworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </View>
        <View style={styles.itemInfo}>
          <View style={styles.itemTitleRow}>
            <Text style={[
              styles.itemTitle,
              { color: colors.textPrimary },
            ]} numberOfLines={1}>{task.track.title}</Text>
            <View style={[
              styles.statusDot,
              { backgroundColor: getStatusColor() },
            ]} />
          </View>
          <Text style={[
            styles.itemSubtitle,
            { color: colors.textMuted },
          ]} numberOfLines={1}>{task.track.artist}</Text>
          <Text style={[styles.itemStatus, { color: getStatusColor() }]}>{getStatusText()}</Text>
        </View>

        <View style={styles.itemRight}>
          <Text style={[
            styles.itemQuality,
            { color: colors.primary, backgroundColor: colors.primaryGlow },
          ]}>{task.track.quality || '320kbps'}</Text>
          {task.status === 'downloading' && (
            <View style={styles.progressContainer}>
              <Animated.View
                style={[
                  styles.progressBar,
                  { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
                ]}
              />
            </View>
          )}
          {task.status === 'completed' && (
            <Text style={[
              styles.itemSize,
              { color: colors.textMuted },
            ]}>{downloadService.formatBytes(task.totalBytes)}</Text>
          )}
          {task.status === 'paused' && (
            <TouchableOpacity onPress={() => handleAction(onPause)} style={styles.actionButton} activeOpacity={0.7} accessibilityLabel="Reanudar descarga">
              <Ionicons name="play" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
          {task.status === 'queued' && (
            <TouchableOpacity onPress={() => handleAction(onCancel)} style={styles.actionButton} activeOpacity={0.7} accessibilityLabel="Cancelar descarga">
              <Ionicons name="close" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
          {task.status === 'error' && (
            <TouchableOpacity onPress={() => handleAction(onRetry)} style={styles.actionButton} activeOpacity={0.7} accessibilityLabel="Reintentar descarga">
              <Ionicons name="refresh" size={20} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>

      {task.status === 'downloading' && (
        <Animated.View
          style={[
            styles.progressBarFull,
            { backgroundColor: getStatusColor() },
          ]}
        >
          <Animated.View
            style={[
              styles.progressBarFill,
              { width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
            ]}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
}

function CompletedItem({ track, index, onPress, onDelete, onShare }: { track: any; index: number; onPress: () => void; onDelete: () => void; onShare: () => void }) {
  const colors = useColors();
  const { lightImpact } = useHaptics();
  const reducedMotion = useReducedMotion();
  const anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (!reducedMotion) {
      Animated.timing(anim, {
        toValue: 1,
        duration: ANIMATION.duration.normal,
        delay: index * 50,
        easing: ANIMATION.easing.easeOut,
        useNativeDriver: true,
      }).start();
    } else {
      anim.setValue(1);
    }
  }, [anim, index, reducedMotion]);

  const handleAction = (action: () => void) => {
    lightImpact();
    action();
  };

  return (
    <Animated.View
      style={[
        styles.completedItem,
        { opacity: anim, transform: [{ translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.completedItemMain} accessibilityRole="button" accessibilityLabel={`${track.title} por ${track.artist}`}>
        <View style={styles.itemArtworkContainer}>
          <Image source={{ uri: track.artwork }} style={styles.itemArtwork} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.4)']}
            style={styles.itemArtworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
        </View>
        <View style={styles.itemInfo}>
          <Text style={[
            styles.itemTitle,
            { color: colors.textPrimary },
          ]} numberOfLines={1}>{track.title}</Text>
          <Text style={[
            styles.itemSubtitle,
            { color: colors.textMuted },
          ]} numberOfLines={1}>{track.artist} · {track.album}</Text>
          <View style={styles.itemMeta}>
            <Text style={[
              styles.metaItem,
              { color: colors.textDisabled },
            ]}>
              <Ionicons name="musical-note" size={12} color={colors.textDisabled} style={{ marginRight: SPACING.xs }} />
              {track.quality || '320kbps'}
            </Text>
            <Text style={[
              styles.metaItem,
              { color: colors.textDisabled },
            ]}>
              <Ionicons name="document" size={12} color={colors.textDisabled} style={{ marginRight: SPACING.xs }} />
              {track.size || '—'}
            </Text>
            <Text style={[
              styles.metaItem,
              { color: colors.textDisabled },
            ]}>
              <Ionicons name="time" size={12} color={colors.textDisabled} style={{ marginRight: SPACING.xs }} />
              {track.date || '—'}
            </Text>
          </View>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => handleAction(onShare)} style={styles.actionButton} activeOpacity={0.7} accessibilityLabel="Compartir">
            <Ionicons name="share" size={22} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleAction(onDelete)} style={styles.deleteButton} activeOpacity={0.7} accessibilityLabel="Eliminar descarga">
            <Ionicons name="trash" size={22} color={colors.error} />
          </TouchableOpacity>
        </View>
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
  const { mediumImpact } = useHaptics();
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

  const handleAction = () => {
    if (onAction) {
      mediumImpact();
      onAction();
    }
  };

  return (
    <Animated.View
      style={[
        styles.emptyState,
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] },
      ]}
    >
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

// ============================================
// DOWNLOADS SCREEN
// ============================================

export function DownloadsScreen() {
  const colors = useColors();
  const { mediumImpact } = useHaptics();
  const [activeTab, setActiveTab] = React.useState<DownloadTab>('active');
  const [refreshing, setRefreshing] = React.useState(false);

  const { activeDownloads: storeActiveDownloads } = useDownloadStore();
  const allTasks = downloadService.getAllTasks();

  const activeDownloads = allTasks.filter(t => t.status !== 'completed');
  const completedDownloads = allTasks.filter(t => t.status === 'completed');

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  React.useEffect(() => {
    const unsubscribe = downloadService.subscribe(() => {
      // Force re-render by updating state
    });
    return () => unsubscribe();
  }, []);

  const handleTabPress = (tab: DownloadTab) => {
    mediumImpact();
    setActiveTab(tab);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER WITH BLUR */}
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <BlurView intensity={80} style={styles.headerBlur} />
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Descargas</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Gestiona tu música offline</Text>
          </View>
          <TouchableOpacity style={styles.headerAction} onPress={() => {}} activeOpacity={0.7} accessibilityLabel="Configuración">
            <Ionicons name="settings" size={28} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* TAB BAR */}
      <View style={[styles.tabBar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TabButton
          label="Activas"
          icon="cloud-download"
          isActive={activeTab === 'active'}
          onPress={() => handleTabPress('active')}
          count={activeDownloads.length}
        />
        <TabButton
          label="Completadas"
          icon="checkmark-circle"
          isActive={activeTab === 'completed'}
          onPress={() => handleTabPress('completed')}
          count={completedDownloads.length}
        />
      </View>

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
        {activeTab === 'active' ? (
          activeDownloads.length === 0 ? (
            <EmptyState
              icon="cloud-download"
              title="Sin descargas activas"
              subtitle="Busca música y toca el botón de descarga para guardarla offline"
              actionLabel="Buscar música"
              onAction={() => {}}
            />
          ) : (
            <View style={styles.downloadsList}>
              {activeDownloads.map((task, index) => (
                <DownloadItem
                  key={task.id}
                  task={task}
                  index={index}
                  onPress={() => {}}
                  onPause={() => downloadService.pauseDownload(task.id)}
                  onCancel={() => downloadService.cancelDownload(task.id)}
                  onRetry={() => downloadService.retryDownload(task.id)}
                />
              ))}
            </View>
          )
        ) : (
          completedDownloads.length === 0 ? (
            <EmptyState
              icon="musical-notes"
              title="Sin descargas completadas"
              subtitle="Las descargas finalizadas aparecerán aquí automáticamente"
            />
          ) : (
            <View style={styles.completedList}>
              {completedDownloads.map((task, index) => (
                <CompletedItem
                  key={task.id}
                  track={task.track}
                  index={index}
                  onPress={() => {}}
                  onDelete={() => downloadService.deleteDownload(task.id)}
                  onShare={() => Share.share({ title: task.track.title, message: task.track.artist, url: task.localUri })}
                />
              ))}
            </View>
          )
        )}
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
  headerAction: {
    padding: SPACING.xs,
  },
  tabBar: {
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.round,
    borderWidth: 1,
    minHeight: 44,
  },
  tabButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  tabButtonTextActive: {},
  tabButtonTextInactive: {},
  tabButtonActive: {
    backgroundColor: 'rgba(0, 212, 255, 0.12)',
    borderColor: '#00d4ff',
  },
  tabBadge: {
    minWidth: 22,
    height: 22,
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
  downloadsList: {
    gap: SPACING.md,
  },
  downloadItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  downloadItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  completedItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    overflow: 'hidden',
  },
  completedItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  itemArtworkContainer: {
    position: 'relative',
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
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
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    flex: 1,
    marginRight: SPACING.sm,
  },
  itemSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    marginTop: SPACING.xs,
  },
  itemStatus: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginTop: SPACING.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: SPACING.sm,
    minWidth: 80,
  },
  itemQuality: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.round,
  },
  itemSize: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  progressContainer: {
    width: 60,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  progressBarFull: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  actionButton: {
    padding: SPACING.xs,
  },
  deleteButton: {
    padding: SPACING.xs,
  },
  itemMeta: {
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
  completedList: {
    gap: SPACING.md,
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
  bottomSpacer: {
    height: 120,
  },
  itemActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});