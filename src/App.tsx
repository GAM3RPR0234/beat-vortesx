import React from 'react';
import { StyleSheet, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppNavigator } from '@/navigation/AppNavigator';
import { useThemeStore } from '@/store/themeStore';
import { MiniPlayer } from '@/screens/PlayerScreen';
import { SplashScreen } from '@/screens/SplashScreen';
import { lastfmService } from '@/services/lastfmService';
import { discordService } from '@/services/discordService';
import { podcastService } from '@/services/podcastService';
import { audioService } from '@/services/audioService';

export default function App() {
  const { isDark } = useThemeStore();
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    // Initialize external services
    lastfmService.initialize();
    discordService.initialize();
    podcastService.initialize();
    audioService.initialize();
  }, []);

  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor="#0a0a0f" />
        <NavigationContainer>
          <AppNavigator />
        </NavigationContainer>
        <MiniPlayer onExpand={() => {}} />
        {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
});