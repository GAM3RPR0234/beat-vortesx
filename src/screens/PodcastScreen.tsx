// Beat Vortex - Podcast Library Screen
// Complete podcast management with subscriptions, episodes, downloads

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  SafeAreaView,
  Modal,
  FlatList,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useColors, useReducedMotion, SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/hooks/useColors';
import { useHaptics } from '@/hooks/useHaptics';
import { podcastService, Podcast, PodcastEpisode } from '@/services/podcastService';
import { downloadService } from '@/services/downloadService';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  interpolateColor,
} from 'react-native-reanimated';

type PodcastTab = 'shows' | 'episodes' | 'downloads' | 'in-progress';

export function PodcastScreen() {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const { lightImpact, mediumImpact, heavyImpact } = useHaptics();

  const [activeTab, setActiveTab] = React.useState<PodcastTab>('shows');
  const [refreshing, setRefreshing] = React.useState(false);
  const [showAddModal, setShowAddModal] = React.useState(false);
  const [feedUrl, setFeedUrl] = React.useState('');
  const [showSearchModal, setShowSearchModal] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [searchResults, setSearchResults] = React.useState<any[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [selectedPodcast, setSelectedPodcast] = React.useState<Podcast | null>(null);
  const [selectedEpisode, setSelectedEpisode] = React.useState<PodcastEpisode | null>(null);

  const headerAnim = useSharedValue(0);
  const tabAnim = useSharedValue(0);
  const listAnim = useSharedValue(0);

  React.useEffect(() => {
    podcastService.initialize();
    const unsubscribe = podcastService.onPodcastsChange((podcasts) => {
      // Force re-render via state update if needed
    });
    return unsubscribe;
  }, []);

  React.useEffect(() => {
    if (!reducedMotion) {
      headerAnim.value = withSpring(1, { damping: 20, stiffness: 200 });
      tabAnim.value = withTiming(1, { duration: 300 });
      listAnim.value = withTiming(1, { duration: 400 });
    } else {
      headerAnim.value = 1;
      tabAnim.value = 1;
      listAnim.value = 1;
    }
  }, [reducedMotion]);

  const onRefresh = async () => {
    setRefreshing(true);
    await podcastService.refreshAllSubscribed();
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
    lightImpact();
  };

  const handleAddByUrl = async () => {
    if (!feedUrl.trim()) return;
    setSearching(true);
    const podcast = await podcastService.addPodcastByUrl(feedUrl.trim());
    setSearching(false);
    if (podcast) {
      await podcastService.subscribe(podcast.id);
      setShowAddModal(false);
      setFeedUrl('');
      mediumImpact();
    } else {
      Alert.alert('Error', 'No se pudo agregar el podcast. Verifica la URL del feed RSS.');
      heavyImpact();
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const results = await podcastService.searchPodcasts(searchQuery.trim());
    setSearchResults(results);
    setSearching(false);
  };

  const handleSubscribe = async (podcast: any) => {
    const existing = podcastService.getPodcast(podcast.id);
    if (existing?.subscribed) {
      await podcastService.unsubscribe(podcast.id);
    } else {
      await podcastService.subscribe(podcast.id);
      if (!existing) {
        await podcastService.addPodcastByUrl(podcast.feedUrl);
      }
    }
    lightImpact();
  };

  const handleEpisodePress = (episode: PodcastEpisode, podcast: Podcast) => {
    setSelectedEpisode(episode);
    setSelectedPodcast(podcast);
    lightImpact();
  };

  const handleDownloadEpisode = async (episode: PodcastEpisode) => {
    if (episode.downloaded) {
      await podcastService.removeDownload(episode.podcastId, episode.id);
    } else {
      // Trigger download via download service
      const track = {
        id: episode.id,
        title: episode.title,
        artist: episode.podcastId,
        album: episode.title,
        artwork: episode.artwork || '',
        duration: episode.duration,
        url: episode.audioUrl,
        quality: '128kbps',
      };
      await downloadService.startDownload(track);
      // Would need to connect download completion to podcastService.markDownloaded
    }
    lightImpact();
  };

  const getShows = () => podcastService.getSubscribedPodcasts();
  const getEpisodes = () => podcastService.getLatestEpisodes(50);
  const getDownloads = () => podcastService.getDownloadedEpisodes();
  const getInProgress = () => podcastService.getInProgressEpisodes();

  const currentData = (() => {
    switch (activeTab) {
      case 'shows': return getShows();
      case 'episodes': return getEpisodes();
      case 'downloads': return getDownloads();
      case 'in-progress': return getInProgress();
    }
  })();

  const tabs: { id: PodcastTab; label: string; icon: string; count?: number }[] = [
    { id: 'shows', label: 'Podcasts', icon: 'podcast', count: getShows().length },
    { id: 'episodes', label: 'Episodios', icon: 'musical-notes', count: getEpisodes().length },
    { id: 'in-progress', label: 'En Progreso', icon: 'time', count: getInProgress().length },
    { id: 'downloads', label: 'Descargas', icon: 'download', count: getDownloads().length },
  ];

  if (activeTab === 'shows') {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Animated.View
            style={[
              styles.headerContent,
              {
                opacity: headerAnim,
                transform: [{ translateY: interpolate(headerAnim.value, [0, 1], [-20, 0]) }],
              },
            ]}
          >
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Podcasts</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{getShows().length} suscripciones</Text>
          </Animated.View>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => { setShowSearchModal(true); lightImpact(); }} style={styles.headerAction} activeOpacity={0.7}>
              <Ionicons name="search" size={26} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowAddModal(true); lightImpact(); }} style={styles.headerAction} activeOpacity={0.7}>
              <Ionicons name="add" size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tabButton,
                  activeTab === tab.id && styles.tabButtonActive,
                  { backgroundColor: activeTab === tab.id ? colors.primaryGlow : colors.surface, borderColor: activeTab === tab.id ? colors.primary : colors.border },
                ]}
                onPress={() => { setActiveTab(tab.id); lightImpact(); }}
                activeOpacity={0.7}
              >
                <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.id ? colors.primary : colors.textMuted} style={{ marginRight: SPACING.xs }} />
                <Text style={[
                  styles.tabButtonText,
                  activeTab === tab.id ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                  { color: activeTab === tab.id ? colors.primary : colors.textSecondary },
                ]}>
                  {tab.label}
                </Text>
                {tab.count !== undefined && tab.count > 0 && (
                  <View style={[
                    styles.tabBadge,
                    activeTab === tab.id && styles.tabBadgeActive,
                    { backgroundColor: activeTab === tab.id ? colors.primary : colors.glassMedium },
                  ]}>
                    <Text style={[
                      styles.tabBadgeText,
                      activeTab === tab.id ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive,
                      { color: activeTab === tab.id ? colors.textOnPrimary : colors.textMuted },
                    ]}>
                      {tab.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

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
          {currentData.length === 0 ? (
            <Animated.View
              style={[
                styles.emptyState,
                {
                  opacity: listAnim,
                  transform: [{ translateY: interpolate(listAnim.value, [0, 1], [30, 0]) }],
                },
              ]}
            >
              <View style={[styles.emptyIcon, { backgroundColor: colors.glassLight, borderColor: colors.border }]}>
                <Ionicons name="radio" size={64} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>Sin podcasts suscritos</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Busca podcasts o agrega uno por URL RSS para empezar
              </Text>
              <View style={styles.emptyActions}>
                <TouchableOpacity
                  style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                  onPress={() => { setShowSearchModal(true); mediumImpact(); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="search" size={20} color={colors.textOnPrimary} style={{ marginRight: SPACING.sm }} />
                  <Text style={[styles.primaryButtonText, { color: colors.textOnPrimary }]}>Buscar Podcasts</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => { setShowAddModal(true); mediumImpact(); }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={20} color={colors.primary} style={{ marginRight: SPACING.sm }} />
                  <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Agregar por URL</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          ) : (
            <FlatList<Podcast>
              data={currentData as Podcast[]}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <Animated.View
                  style={[
                    styles.podcastCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    {
                      opacity: listAnim,
                      transform: [{ translateY: interpolate(listAnim.value, [0, 1], [20, 0]) }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => { setSelectedPodcast(item); lightImpact(); }}
                    activeOpacity={0.8}
                    style={styles.podcastCardMain}
                  >
                    <View style={styles.podcastArtworkContainer}>
                      <Image source={{ uri: item.artwork }} style={styles.podcastArtwork} resizeMode="cover" />
                    </View>
                    <View style={styles.podcastInfo}>
                      <Text style={[styles.podcastTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                      <Text style={[styles.podcastAuthor, { color: colors.textMuted }]} numberOfLines={1}>{item.author}</Text>
                      <View style={styles.podcastMeta}>
                        <Text style={[styles.metaItem, { color: colors.textDisabled }]}>
                          <Ionicons name="musical-notes" size={12} color={colors.textDisabled} style={{ marginRight: SPACING.xs }} />
                          {item.episodeCount} episodios
                        </Text>
                        <Text style={[styles.metaItem, { color: colors.textDisabled }]}>
                          <Ionicons name="time" size={12} color={colors.textDisabled} style={{ marginRight: SPACING.xs }} />
                          Actualizado {new Date(item.lastUpdated).toLocaleDateString()}
                        </Text>
                      </View>
                      {item.categories.length > 0 && (
                        <View style={styles.categories}>
                          {item.categories.slice(0, 3).map((cat, i) => (
                            <View key={i} style={[styles.categoryChip, { backgroundColor: colors.glassMedium, borderColor: colors.border }]}>
                              <Text style={[styles.categoryChipText, { color: colors.textSecondary }]}>{cat}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.subscribeButton}
                    onPress={() => handleSubscribe(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={item.subscribed ? 'checkmark-circle' : 'add-circle'} size={24} color={item.subscribed ? colors.success : colors.primary} />
                  </TouchableOpacity>
                </Animated.View>
              )}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        {/* Podcast Detail Modal */}
        {selectedPodcast && (
          <PodcastDetailModal
            podcast={selectedPodcast}
            onClose={() => { setSelectedPodcast(null); lightImpact(); }}
            onEpisodePress={handleEpisodePress}
            onDownload={handleDownloadEpisode}
            colors={colors}
          />
        )}

        {/* Add by URL Modal */}
        {showAddModal && (
          <AddPodcastModal
            visible={showAddModal}
            onClose={() => { setShowAddModal(false); setFeedUrl(''); lightImpact(); }}
            onAdd={handleAddByUrl}
            feedUrl={feedUrl}
            setFeedUrl={setFeedUrl}
            searching={searching}
            colors={colors}
          />
        )}

        {/* Search Modal */}
        {showSearchModal && (
          <SearchPodcastModal
            visible={showSearchModal}
            onClose={() => { setShowSearchModal(false); setSearchQuery(''); setSearchResults([]); lightImpact(); }}
            onSearch={handleSearch}
            query={searchQuery}
            setQuery={setSearchQuery}
            results={searchResults}
            searching={searching}
            onSubscribe={handleSubscribe}
            colors={colors}
          />
        )}
      </SafeAreaView>
    );
  }

  // Episodes / In Progress / Downloads tabs
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Animated.View
          style={[
            styles.headerContent,
            {
              opacity: headerAnim,
              transform: [{ translateY: interpolate(headerAnim.value, [0, 1], [-20, 0]) }],
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{tabs.find(t => t.id === activeTab)?.label}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>{currentData.length} elementos</Text>
        </Animated.View>
        <View style={styles.headerActions}>
          {activeTab === 'episodes' && (
            <TouchableOpacity onPress={() => { setShowSearchModal(true); lightImpact(); }} style={styles.headerAction} activeOpacity={0.7}>
              <Ionicons name="search" size={26} color={colors.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.tabBar, { borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabBarContent}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabButton,
                activeTab === tab.id && styles.tabButtonActive,
                { backgroundColor: activeTab === tab.id ? colors.primaryGlow : colors.surface, borderColor: activeTab === tab.id ? colors.primary : colors.border },
              ]}
              onPress={() => { setActiveTab(tab.id); lightImpact(); }}
              activeOpacity={0.7}
            >
              <Ionicons name={tab.icon as any} size={18} color={activeTab === tab.id ? colors.primary : colors.textMuted} style={{ marginRight: SPACING.xs }} />
              <Text style={[
                styles.tabButtonText,
                activeTab === tab.id ? styles.tabButtonTextActive : styles.tabButtonTextInactive,
                { color: activeTab === tab.id ? colors.primary : colors.textSecondary },
              ]}>
                {tab.label}
              </Text>
              {tab.count !== undefined && tab.count > 0 && (
                <View style={[
                  styles.tabBadge,
                  activeTab === tab.id && styles.tabBadgeActive,
                  { backgroundColor: activeTab === tab.id ? colors.primary : colors.glassMedium },
                ]}>
                  <Text style={[
                    styles.tabBadgeText,
                    activeTab === tab.id ? styles.tabBadgeTextActive : styles.tabBadgeTextInactive,
                    { color: activeTab === tab.id ? colors.textOnPrimary : colors.textMuted },
                  ]}>
                    {tab.count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

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
        {currentData.length === 0 ? (
          <Animated.View
            style={[
              styles.emptyState,
              {
                opacity: listAnim,
                transform: [{ translateY: interpolate(listAnim.value, [0, 1], [30, 0]) }],
              },
            ]}
          >
            <View style={[styles.emptyIcon, { backgroundColor: colors.glassLight, borderColor: colors.border }]}>
              <Ionicons name={activeTab === 'downloads' ? 'download' : activeTab === 'in-progress' ? 'time' : 'musical-notes'} size={64} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>{activeTab === 'downloads' ? 'Sin descargas' : activeTab === 'in-progress' ? 'Sin episodios en progreso' : 'Sin episodios recientes'}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
              {activeTab === 'downloads' ? 'Los episodios descargados aparecerán aquí' : activeTab === 'in-progress' ? 'Empieza a escuchar un episodio para verlo aquí' : 'Suscríbete a podcasts para ver episodios recientes'}
            </Text>
          </Animated.View>
        ) : (
          <FlatList<PodcastEpisode>
            data={currentData as PodcastEpisode[]}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => {
              const podcast = podcastService.getPodcast(item.podcastId);
              return (
                <Animated.View
                  style={[
                    styles.episodeCard,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    {
                      opacity: listAnim,
                      transform: [{ translateY: interpolate(listAnim.value, [0, 1], [20, 0]) }],
                    },
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleEpisodePress(item, podcast!)}
                    activeOpacity={0.8}
                    style={styles.episodeCardMain}
                  >
                    <View style={styles.episodeArtworkContainer}>
                      <Image source={{ uri: item.artwork || podcast?.artwork }} style={styles.episodeArtwork} resizeMode="cover" />
                      {item.playProgress > 0 && item.playProgress < 1 && (
                        <View style={styles.episodeProgressRing}>
                          <Text style={styles.episodeProgressText}>{Math.round(item.playProgress * 100)}%</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.episodeInfo}>
                      <View style={styles.episodeTitleRow}>
                        <Text style={[styles.episodeTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                        {item.played && <Ionicons name="checkmark-circle" size={16} color={colors.success} style={{ marginLeft: SPACING.sm }} />}
                      </View>
                      <Text style={[styles.episodePodcast, { color: colors.textMuted }]} numberOfLines={1}>{podcast?.title || 'Podcast desconocido'}</Text>
                      <View style={styles.episodeMeta}>
                        <Text style={[styles.metaItem, { color: colors.textDisabled }]}>
                          <Ionicons name="time" size={12} color={colors.textDisabled} style={{ marginRight: SPACING.xs }} />
                          {formatDuration(item.duration)}
                        </Text>
                        <Text style={[styles.metaItem, { color: colors.textDisabled }]}>
                          <Ionicons name="calendar" size={12} color={colors.textDisabled} style={{ marginRight: SPACING.xs }} />
                          {new Date(item.pubDate).toLocaleDateString()}
                        </Text>
                      </View>
                      {item.playProgress > 0 && item.playProgress < 1 && (
                        <View style={styles.episodeProgressBar}>
                          <Animated.View
                            style={[
                              styles.episodeProgressFill,
                              { width: `${item.playProgress * 100}%`, backgroundColor: colors.primary },
                            ]}
                          />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                  <View style={styles.episodeActions}>
                    {item.downloaded ? (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDownloadEpisode(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash" size={22} color={colors.error} />
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDownloadEpisode(item)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="cloud-download" size={22} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                    {item.chapters && item.chapters.length > 0 && (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => { lightImpact(); }} // Show chapters modal
                        activeOpacity={0.7}
                      >
                        <Ionicons name="list" size={22} color={colors.textSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </Animated.View>
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Episode Player Modal */}
      {selectedEpisode && selectedPodcast && (
        <EpisodePlayerModal
          episode={selectedEpisode}
          podcast={selectedPodcast}
          onClose={() => { setSelectedEpisode(null); setSelectedPodcast(null); lightImpact(); }}
          onDownload={handleDownloadEpisode}
          colors={colors}
        />
      )}

      {/* Search Modal for episodes */}
      {showSearchModal && (
        <SearchPodcastModal
          visible={showSearchModal}
          onClose={() => { setShowSearchModal(false); setSearchQuery(''); setSearchResults([]); lightImpact(); }}
          onSearch={handleSearch}
          query={searchQuery}
          setQuery={setSearchQuery}
          results={searchResults}
          searching={searching}
          onSubscribe={handleSubscribe}
          colors={colors}
        />
      )}
    </SafeAreaView>
  );
}

function formatDuration(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Podcast Detail Modal Component
function PodcastDetailModal({ podcast, onClose, onEpisodePress, onDownload, colors }: any) {
  const episodes = podcastService.getEpisodes(podcast.id);
  return (
    <Modal animationType="slide" transparent={true} visible={!!podcast} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.modalContainerLarge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={styles.podcastDetailHeader}>
            <Image source={{ uri: podcast.artwork }} style={styles.podcastDetailArtwork} resizeMode="cover" />
            <View style={styles.podcastDetailInfo}>
              <Text style={[styles.podcastDetailTitle, { color: colors.textPrimary }]}>{podcast.title}</Text>
              <Text style={[styles.podcastDetailAuthor, { color: colors.textMuted }]}>{podcast.author}</Text>
              <View style={styles.podcastDetailMeta}>
                <Text style={[styles.metaItem, { color: colors.textDisabled }]}>{episodes.length} episodios</Text>
                <Text style={[styles.metaItem, { color: colors.textDisabled }]}>{podcast.categories.join(', ')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.subscribeButtonLarge, { backgroundColor: podcast.subscribed ? colors.successGlow : colors.primaryGlow, borderColor: podcast.subscribed ? colors.success : colors.primary }]}
                onPress={() => { podcastService.subscribe(podcast.id); onClose(); }}
                activeOpacity={0.8}
              >
                <Text style={[styles.subscribeButtonText, { color: podcast.subscribed ? colors.success : colors.primary }]}>
                  {podcast.subscribed ? 'Suscrito' : 'Suscribirse'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <FlatList
            data={episodes.slice(0, 20)}
            keyExtractor={(item: PodcastEpisode) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.episodeListItem}
                onPress={() => onEpisodePress(item, podcast)}
                activeOpacity={0.7}
              >
                <Text style={[styles.episodeListTitle, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
                <View style={styles.episodeListMeta}>
                  <Text style={[styles.metaItem, { color: colors.textDisabled }]}>{formatDuration(item.duration)}</Text>
                  <Text style={[styles.metaItem, { color: colors.textDisabled }]}>{new Date(item.pubDate).toLocaleDateString()}</Text>
                </View>
                {item.playProgress > 0 && (
                  <View style={styles.episodeListProgress}>
                    <Animated.View style={[styles.episodeListProgressFill, { width: `${item.playProgress * 100}%`, backgroundColor: colors.primary }]} />
                  </View>
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.episodeListContent}
            showsVerticalScrollIndicator={false}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// Episode Player Modal Component
function EpisodePlayerModal({ episode, podcast, onClose, onDownload, colors }: any) {
  const { lightImpact, mediumImpact, heavyImpact } = useHaptics();
  return (
    <Modal animationType="slide" transparent={true} visible={!!episode} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={styles.episodeModalHeader}>
            <Image source={{ uri: episode.artwork || podcast.artwork }} style={styles.episodeModalArtwork} resizeMode="cover" />
            <View style={styles.episodeModalInfo}>
              <Text style={[styles.episodeModalTitle, { color: colors.textPrimary }]}>{episode.title}</Text>
              <Text style={[styles.episodeModalPodcast, { color: colors.textMuted }]}>{podcast.title}</Text>
              <Text style={[styles.episodeModalDate, { color: colors.textDisabled }]}>{new Date(episode.pubDate).toLocaleDateString()} · {formatDuration(episode.duration)}</Text>
            </View>
          </View>
          {episode.description && (
            <Text style={[styles.episodeModalDescription, { color: colors.textSecondary }]}>{episode.description}</Text>
          )}
          <View style={styles.episodeModalActions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.primary, flex: 1 }]}
              onPress={() => { /* Play episode */ onClose(); mediumImpact(); }}
              activeOpacity={0.8}
            >
              <Ionicons name="play" size={22} color={colors.textOnPrimary} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.primaryButtonText, { color: colors.textOnPrimary }]}>Reproducir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: episode.downloaded ? colors.error + '20' : colors.surface, borderColor: episode.downloaded ? colors.error : colors.border, flex: 1 }]}
              onPress={() => onDownload(episode)}
              activeOpacity={0.8}
            >
              <Ionicons name={episode.downloaded ? 'trash' : 'cloud-download'} size={22} color={episode.downloaded ? colors.error : colors.primary} style={{ marginRight: SPACING.sm }} />
              <Text style={[styles.secondaryButtonText, { color: episode.downloaded ? colors.error : colors.primary }]}>
                {episode.downloaded ? 'Eliminar' : 'Descargar'}
              </Text>
            </TouchableOpacity>
          </View>
          {episode.chapters && episode.chapters.length > 0 && (
            <View style={styles.chaptersSection}>
              <Text style={[styles.chaptersTitle, { color: colors.textPrimary }]}>Capítulos</Text>
              {episode.chapters.map((ch: any, i: number) => (
                <View key={i} style={styles.chapterItem}>
                  <Text style={[styles.chapterTime, { color: colors.textMuted }]}>{formatDuration(ch.startTime)}</Text>
                  <Text style={[styles.chapterTitle, { color: colors.textPrimary }]}>{ch.title}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// Add Podcast Modal Component
function AddPodcastModal({ visible, onClose, onAdd, feedUrl, setFeedUrl, searching, colors }: any) {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.modalContainer, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Agregar Podcast por URL</Text>
          <Text style={[styles.modalSubtitle, { color: colors.textMuted }]}>Pega la URL del feed RSS del podcast</Text>
          <TextInput
            style={[styles.modalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
            value={feedUrl}
            onChangeText={setFeedUrl}
            placeholder="https://ejemplo.com/feed.xml"
            placeholderTextColor={colors.textDisabled}
            autoFocus
            autoCapitalize="none"
            autoComplete="url"
          />
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalCancelButton, { backgroundColor: colors.glassMedium, borderColor: colors.border }]}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalConfirmButton, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}
              onPress={onAdd}
              disabled={searching || !feedUrl.trim()}
              activeOpacity={0.8}
            >
              {searching ? (
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <Text style={[styles.modalButtonText, { color: colors.textOnPrimary }]}>Agregar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// Search Podcast Modal Component
function SearchPodcastModal({ visible, onClose, onSearch, query, setQuery, results, searching, onSubscribe, colors }: any) {
  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.modalContainerLarge, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
          <View style={styles.searchModalHeader}>
            <TextInput
              style={[styles.searchModalInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Buscar podcasts en iTunes..."
              placeholderTextColor={colors.textDisabled}
              autoFocus
              onSubmitEditing={onSearch}
            />
            <TouchableOpacity
              style={[styles.searchModalButton, { backgroundColor: colors.primaryGlow, borderColor: colors.primary }]}
              onPress={onSearch}
              disabled={searching || !query.trim()}
              activeOpacity={0.8}
            >
              {searching ? (
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <Ionicons name="search" size={22} color={colors.primary} />
              )}
            </TouchableOpacity>
          </View>
          {results.length > 0 && (
            <FlatList
              data={results}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.searchResultItem}
                  onPress={() => onSubscribe(item)}
                  activeOpacity={0.7}
                >
                  <Image source={{ uri: item.artwork }} style={styles.searchResultArtwork} resizeMode="cover" />
                  <View style={styles.searchResultInfo}>
                    <Text style={[styles.searchResultTitle, { color: colors.textPrimary }]}>{item.title}</Text>
                    <Text style={[styles.searchResultAuthor, { color: colors.textMuted }]}>{item.author}</Text>
                    <Text style={[styles.searchResultMeta, { color: colors.textDisabled }]}>{item.episodeCount} episodios · {item.category}</Text>
                  </View>
                  <Ionicons name="add-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.searchResultContent}
              showsVerticalScrollIndicator={false}
            />
          )}
          {query.trim() && !searching && results.length === 0 && (
            <View style={styles.searchEmpty}>
              <Ionicons name="search" size={48} color={colors.textDisabled} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No se encontraron podcasts para "{query}"</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
  },
  headerContent: { flex: 1 },
  headerTitle: { fontSize: TYPOGRAPHY.fontSize.xxxl, fontWeight: TYPOGRAPHY.fontWeight.heavy, letterSpacing: TYPOGRAPHY.letterSpacing.tight },
  headerSubtitle: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular, marginTop: SPACING.xs },
  headerActions: { flexDirection: 'row', gap: SPACING.md },
  headerAction: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  tabBar: { borderBottomWidth: 1, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  tabBarContent: { gap: SPACING.sm },
  tabButton: {
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
  tabButtonActive: {},
  tabButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  tabButtonTextActive: {},
  tabButtonTextInactive: {},
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
  tabBadgeText: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.bold },
  tabBadgeTextActive: {},
  tabBadgeTextInactive: {},
  scrollView: { flex: 1 },
  scrollContent: { padding: SPACING.md, paddingBottom: SPACING.xxxl, gap: SPACING.md },
  listContent: { paddingBottom: SPACING.xxxl, gap: SPACING.md },
  separator: { height: 1, marginLeft: 80 },
  bottomSpacer: { height: 40 },

  emptyState: { alignItems: 'center', paddingVertical: SPACING.xxxl, paddingHorizontal: SPACING.xl, gap: SPACING.md },
  emptyIcon: { width: 100, height: 100, borderRadius: BORDER_RADIUS.round, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  emptyTitle: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, textAlign: 'center' },
  emptySubtitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.regular, textAlign: 'center', lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md, maxWidth: '85%' },
  emptyActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.md, flexWrap: 'wrap', justifyContent: 'center' },
  primaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: BORDER_RADIUS.round },
  primaryButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.bold, letterSpacing: TYPOGRAPHY.letterSpacing.wide },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl, borderRadius: BORDER_RADIUS.round, borderWidth: 1 },
  secondaryButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },

  podcastCard: { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  podcastCardMain: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md, flex: 1 },
  podcastArtworkContainer: { width: 64, height: 64, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  podcastArtwork: { ...StyleSheet.absoluteFillObject },
  podcastInfo: { flex: 1, minWidth: 0, gap: SPACING.xs },
  podcastTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  podcastAuthor: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular },
  podcastMeta: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  metaItem: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular, flexDirection: 'row', alignItems: 'center' },
  categories: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs, marginTop: SPACING.xs },
  categoryChip: { paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs, borderRadius: BORDER_RADIUS.round, borderWidth: 1 },
  categoryChipText: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.medium },
  subscribeButton: { padding: SPACING.sm },

  episodeCard: { borderRadius: BORDER_RADIUS.lg, borderWidth: 1, overflow: 'hidden' },
  episodeCardMain: { flexDirection: 'row', alignItems: 'center', padding: SPACING.md, gap: SPACING.md, flex: 1 },
  episodeArtworkContainer: { position: 'relative', width: 56, height: 56, borderRadius: BORDER_RADIUS.md, overflow: 'hidden' },
  episodeArtwork: { ...StyleSheet.absoluteFillObject },
  episodeProgressRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: BORDER_RADIUS.md, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  episodeProgressText: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.bold, color: '#ffffff' },
  episodeInfo: { flex: 1, minWidth: 0, gap: SPACING.xs },
  episodeTitleRow: { flexDirection: 'row', alignItems: 'center' },
  episodeTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold, flex: 1 },
  episodePodcast: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular },
  episodeMeta: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  episodeProgressBar: { height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: SPACING.xs },
  episodeProgressFill: { height: '100%', borderRadius: 1.5 },
  episodeActions: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, paddingRight: SPACING.md },
  actionButton: { padding: SPACING.xs },

  // Podcast Detail Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: SPACING.md },
  modalContainer: { width: '90%', maxWidth: 350, borderRadius: BORDER_RADIUS.xl, padding: SPACING.xl, borderWidth: 1, maxHeight: '80%' },
  modalContainerLarge: { width: '95%', maxWidth: 500, borderRadius: BORDER_RADIUS.xl, borderWidth: 1, maxHeight: '85%' },
  modalHandle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: SPACING.md },
  modalTitle: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold, textAlign: 'center', marginBottom: SPACING.xs },
  modalSubtitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.regular, textAlign: 'center', marginBottom: SPACING.lg, lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md },
  modalInput: { borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md, fontSize: TYPOGRAPHY.fontSize.md, marginBottom: SPACING.lg, textAlign: 'center' },
  modalButtons: { flexDirection: 'row', gap: SPACING.md },
  modalCancelButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.round, borderWidth: 1, alignItems: 'center' },
  modalConfirmButton: { flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.round, borderWidth: 1, alignItems: 'center' },
  modalButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },

  podcastDetailHeader: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  podcastDetailArtwork: { width: 80, height: 80, borderRadius: BORDER_RADIUS.lg },
  podcastDetailInfo: { flex: 1, justifyContent: 'center', gap: SPACING.xs },
  podcastDetailTitle: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold },
  podcastDetailAuthor: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.regular },
  podcastDetailMeta: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xs },
  subscribeButtonLarge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.round, borderWidth: 1, marginTop: SPACING.sm },
  subscribeButtonText: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.bold },
  episodeListContent: { paddingBottom: SPACING.md, gap: SPACING.xs },
  episodeListItem: { padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  episodeListTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold, marginBottom: SPACING.xs },
  episodeListMeta: { flexDirection: 'row', gap: SPACING.md },
  episodeListProgress: { height: 2, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginTop: SPACING.xs },
  episodeListProgressFill: { height: '100%', borderRadius: 1 },

  // Episode Modal
  episodeModalHeader: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  episodeModalArtwork: { width: 64, height: 64, borderRadius: BORDER_RADIUS.md },
  episodeModalInfo: { flex: 1, justifyContent: 'center', gap: SPACING.xs },
  episodeModalTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold },
  episodeModalPodcast: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.regular },
  episodeModalDate: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular },
  episodeModalDescription: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular, lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.sm, marginBottom: SPACING.lg },
  episodeModalActions: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  chaptersSection: { borderTopWidth: 1, paddingTop: SPACING.lg },
  chaptersTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold, marginBottom: SPACING.md },
  chapterItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1 },
  chapterTime: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.medium, fontFamily: TYPOGRAPHY.fontFamily.mono },
  chapterTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.regular, flex: 1, marginLeft: SPACING.md },

  // Search Modal
  searchModalHeader: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  searchModalInput: { flex: 1, borderRadius: BORDER_RADIUS.md, borderWidth: 1, padding: SPACING.md, fontSize: TYPOGRAPHY.fontSize.md },
  searchModalButton: { width: 48, height: 48, borderRadius: BORDER_RADIUS.round, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  searchResultContent: { paddingBottom: SPACING.md, gap: SPACING.md },
  searchResultItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, padding: SPACING.md, borderRadius: BORDER_RADIUS.md, borderWidth: 1 },
  searchResultArtwork: { width: 56, height: 56, borderRadius: BORDER_RADIUS.md },
  searchResultInfo: { flex: 1, minWidth: 0, gap: SPACING.xs },
  searchResultTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  searchResultAuthor: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.regular },
  searchResultMeta: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: TYPOGRAPHY.fontWeight.regular },
  searchEmpty: { alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.md },
  emptyText: { fontSize: TYPOGRAPHY.fontSize.md, textAlign: 'center' },
});

export default PodcastScreen;