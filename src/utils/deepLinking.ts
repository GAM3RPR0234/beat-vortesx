import { Linking, Platform } from 'react-native';
import { useNavigation, NavigationProp } from '@react-navigation/native';
import { useEffect } from 'react';
import { RootStackParamList } from '@/navigation/types';

/**
 * Deep Linking Handler
 * Handles beatvortex:// URLs for navigation from external sources
 * Supports: track, album, artist, playlist, podcast, search
 */

export type DeepLinkRoute =
  | { type: 'track'; id: string }
  | { type: 'album'; id: string }
  | { type: 'artist'; id: string }
  | { type: 'playlist'; id: string }
  | { type: 'podcast'; id: string }
  | { type: 'episode'; podcastId: string; episodeId: string }
  | { type: 'search'; query: string }
  | { type: 'settings'; section?: string }
  | { type: 'library'; tab?: string }
  | { type: 'home' }
  | { type: 'discovery'; tab?: 'radio' | 'mixes' | 'moods' | 'new-releases' }
  | { type: 'unknown'; url: string };

/**
 * Parse a deep link URL into a structured route
 */
export function parseDeepLink(url: string): DeepLinkRoute {
  const scheme = 'beatvortex://';

  if (!url.startsWith(scheme)) {
    return { type: 'unknown', url };
  }

  const path = url.slice(scheme.length);
  const [route, ...params] = path.split('?');
  const queryString = params.join('?');

  const queryParams = new URLSearchParams(queryString);
  const getParam = (key: string) => queryParams.get(key) || undefined;

  switch (route) {
    case 'track':
      return { type: 'track', id: getParam('id') || path.split('/')[1] || '' };

    case 'album':
      return { type: 'album', id: getParam('id') || path.split('/')[1] || '' };

    case 'artist':
      return { type: 'artist', id: getParam('id') || path.split('/')[1] || '' };

    case 'playlist':
      return { type: 'playlist', id: getParam('id') || path.split('/')[1] || '' };

    case 'podcast':
      return { type: 'podcast', id: getParam('id') || path.split('/')[1] || '' };

    case 'episode':
      return {
        type: 'episode',
        podcastId: getParam('podcastId') || '',
        episodeId: getParam('episodeId') || '',
      };

    case 'search':
      return { type: 'search', query: getParam('q') || getParam('query') || '' };

    case 'settings':
      return { type: 'settings', section: getParam('section') };

    case 'library':
      return { type: 'library', tab: getParam('tab') };

    case 'home':
    case '':
      return { type: 'home' };

    case 'discovery':
      return { type: 'discovery', tab: getParam('tab') as any };

    default:
      return { type: 'unknown', url };
  }
}

/**
 * Navigate to a deep link route using the navigation prop
 */
export function navigateDeepLink(
  navigation: NavigationProp<RootStackParamList>,
  route: DeepLinkRoute
): boolean {
  switch (route.type) {
    case 'track':
      if (route.id) {
        navigation.navigate('Player', { trackId: route.id, autoplay: true });
        return true;
      }
      return false;

    case 'album':
      if (route.id) {
        navigation.navigate('Library', { screen: 'Albums', params: { albumId: route.id } });
        return true;
      }
      return false;

    case 'artist':
      if (route.id) {
        navigation.navigate('Library', { screen: 'Artists', params: { artistId: route.id } });
        return true;
      }
      return false;

    case 'playlist':
      if (route.id) {
        navigation.navigate('PlaylistManager', { playlistId: route.id });
        return true;
      }
      return false;

    case 'podcast':
      if (route.id) {
        navigation.navigate('Podcasts', { podcastId: route.id });
        return true;
      }
      return false;

    case 'episode':
      if (route.podcastId && route.episodeId) {
        navigation.navigate('Podcasts', {
          podcastId: route.podcastId,
          episodeId: route.episodeId
        });
        return true;
      }
      return false;

    case 'search':
      navigation.navigate('Search', { initialQuery: route.query });
      return true;

    case 'settings':
      navigation.navigate('Settings', { section: route.section });
      return true;

    case 'library':
      navigation.navigate('Library', {
        initialTab: route.tab as 'tracks' | 'albums' | 'artists' | 'playlists' | 'podcasts' | 'offline' | 'history'
      });
      return true;

    case 'home':
      navigation.navigate('Main');
      return true;

    case 'discovery':
      navigation.navigate('Discovery', { initialTab: route.tab });
      return true;

    default:
      return false;
  }
}

/**
 * Hook to handle incoming deep links
 */
export function useDeepLinking() {
  const navigation = useNavigation<any>();

  useEffect(() => {
    // Handle initial URL (app launched from link)
    const handleInitialUrl = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        const route = parseDeepLink(url);
        // Delay navigation until navigation is ready
        setTimeout(() => navigateDeepLink(navigation, route), 100);
      }
    };

    handleInitialUrl();

    // Handle URLs while app is running
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const route = parseDeepLink(url);
      navigateDeepLink(navigation, route);
    });

    return () => subscription.remove();
  }, [navigation]);
}

/**
 * Generate a deep link URL for sharing
 */
export function generateDeepLink(route: DeepLinkRoute): string {
  const base = 'beatvortex://';

  switch (route.type) {
    case 'track':
      return `${base}track?id=${encodeURIComponent(route.id)}`;

    case 'album':
      return `${base}album?id=${encodeURIComponent(route.id)}`;

    case 'artist':
      return `${base}artist?id=${encodeURIComponent(route.id)}`;

    case 'playlist':
      return `${base}playlist?id=${encodeURIComponent(route.id)}`;

    case 'podcast':
      return `${base}podcast?id=${encodeURIComponent(route.id)}`;

    case 'episode':
      return `${base}episode?podcastId=${encodeURIComponent(route.podcastId)}&episodeId=${encodeURIComponent(route.episodeId)}`;

    case 'search':
      return `${base}search?q=${encodeURIComponent(route.query)}`;

    case 'settings':
      return route.section
        ? `${base}settings?section=${encodeURIComponent(route.section)}`
        : `${base}settings`;

    case 'library':
      return route.tab
        ? `${base}library?tab=${encodeURIComponent(route.tab)}`
        : `${base}library`;

    case 'home':
      return `${base}home`;

    case 'discovery':
      return route.tab
        ? `${base}discovery?tab=${encodeURIComponent(route.tab)}`
        : `${base}discovery`;

    default:
      return base;
  }
}

/**
 * Share a track/playlist/artist via system share sheet
 */
export async function shareContent(
  type: 'track' | 'album' | 'artist' | 'playlist',
  data: { id: string; title: string; artist?: string; artwork?: string }
): Promise<void> {
  const { Share } = await import('react-native');

  const deepLink = generateDeepLink({ type, id: data.id } as DeepLinkRoute);
  const webLink = `https://beatvortex.app/${type}/${data.id}`;

  await Share.share({
    title: data.title,
    message: data.artist ? `${data.title} by ${data.artist}` : data.title,
    url: Platform.OS === 'web' ? webLink : deepLink,
  });
}