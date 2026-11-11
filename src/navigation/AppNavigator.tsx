// Beat Vortex - App Navigator
// Bottom tabs + stack navigation with floating bottom bar + deep linking

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { getInitialURL } from 'expo-linking';
import { View, StyleSheet } from 'react-native';
import { useThemeStore } from '@/store/themeStore';
import { HomeScreen } from '@/screens/HomeScreen';
import { SearchScreen } from '@/screens/SearchScreen';
import { LibraryScreen } from '@/screens/LibraryScreen';
import { SettingsScreen } from '@/screens/SettingsScreen';
import { PlayerScreen } from '@/screens/PlayerScreen';
import { DownloadsScreen } from '@/screens/DownloadsScreen';
import { EqualizerScreen } from '@/screens/EqualizerScreen';
import { PodcastScreen } from '@/screens/PodcastScreen';
import { PlaylistManagerScreen } from '@/screens/PlaylistManagerScreen';
import { DiscoveryScreen } from '@/screens/DiscoveryScreen';
import { M3UImportScreen } from '@/screens/M3UImportScreen';
import { LastFmSettingsScreen } from '@/screens/LastFmSettingsScreen';
import { DiscordSettingsScreen } from '@/screens/DiscordSettingsScreen';
import { LegalScreen } from '@/screens/LegalScreen';
import { FloatingBottomTabs } from '@/components/navigation/FloatingBottomTabs';
import { useColors } from '@/hooks/useColors';
import { parseDeepLink } from '@/utils/deepLinking';
import { RootStackParamList } from '@/navigation/types';
import { WidgetProvider } from '@/components/widgets/WidgetProvider';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const colors = useColors();
  const { themeMode } = useThemeStore();
  const [activeTab, setActiveTab] = React.useState('Home');
  const [tabsHidden, setTabsHidden] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);

  React.useEffect(() => {
    // Check if app was launched from a deep link
    getInitialURL().then((url: string | null) => {
      if (url) {
        const route = parseDeepLink(url);
        if (route.type === 'home') {
          setActiveTab('Home');
        }
      }
    });
    setIsReady(true);
  }, []);

  if (!isReady) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
    );
  }

  return (
    <WidgetProvider>
      <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            headerStyle: {
              backgroundColor: colors.surface,
            },
            headerTitleStyle: {
              color: colors.textPrimary,
              fontWeight: '700',
            },
            headerTintColor: colors.primary,
            headerBackTitleVisible: false,
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen
            name="Player"
            component={PlayerScreen}
            options={{
              headerShown: false,
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
          <Stack.Screen
            name="Equalizer"
            component={EqualizerScreen}
            options={{
              headerTitle: 'Ecualizador',
              presentation: 'modal',
            }}
          />
          <Stack.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ headerTitle: 'Configuración' }}
          />
          <Stack.Screen
            name="Podcasts"
            component={PodcastScreen}
            options={{ headerTitle: 'Podcasts' }}
          />
          <Stack.Screen
            name="PlaylistManager"
            component={PlaylistManagerScreen}
            options={{ headerTitle: 'Playlists', presentation: 'modal' }}
          />
          <Stack.Screen
            name="Discovery"
            component={DiscoveryScreen}
            options={{ headerTitle: 'Discover' }}
          />
          <Stack.Screen
            name="M3UImport"
            component={M3UImportScreen}
            options={{ headerTitle: 'Importar M3U', presentation: 'modal' }}
          />
          <Stack.Screen
            name="LastFmSettings"
            component={LastFmSettingsScreen}
            options={{ headerTitle: 'Last.fm' }}
          />
          <Stack.Screen
            name="DiscordSettings"
            component={DiscordSettingsScreen}
            options={{ headerTitle: 'Discord Rich Presence' }}
          />
          <Stack.Screen
            name="Legal"
            component={LegalScreen}
            options={{ headerTitle: 'Legal' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </WidgetProvider>
  );
}

function MainTabs() {
  const colors = useColors();
  const [activeTab, setActiveTab] = React.useState('Home');

  const handleTabPress = (tabName: string) => {
    setActiveTab(tabName);
  };

  // Determine if we should hide tabs based on active route
  // For now, always show on main tabs
  const hidden = false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Tab Content */}
      <View style={StyleSheet.absoluteFill}>
        {activeTab === 'Home' && <HomeScreen />}
        {activeTab === 'Search' && <SearchScreen />}
        {activeTab === 'Library' && <LibraryScreen />}
        {activeTab === 'Podcasts' && <PodcastScreen />}
        {activeTab === 'Downloads' && <DownloadsScreen />}
      </View>

      {/* Floating Bottom Tabs */}
      <FloatingBottomTabs
        activeTab={activeTab}
        onTabPress={handleTabPress}
        hidden={hidden}
      />
    </View>
  );
}