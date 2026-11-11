// Beat Vortex - Floating Bottom Navigation
// Modern pill-style bottom bar with blur background and smooth animations

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useSharedValue, useAnimatedStyle, withSpring, withTiming, interpolateColor } from 'react-native-reanimated';
import { useColors, useReducedMotion } from '@/hooks/useColors';
import { SPACING, BORDER_RADIUS } from '@/constants/theme';

interface TabItem {
  name: string;
  label: string;
  icon: string;
  focusedIcon: string;
}

const TABS: TabItem[] = [
  { name: 'Home', label: 'Inicio', icon: 'home-outline' as any, focusedIcon: 'home' as any },
  { name: 'Search', label: 'Buscar', icon: 'search-outline' as any, focusedIcon: 'search' as any },
  { name: 'Library', label: 'Biblioteca', icon: 'musical-notes-outline' as any, focusedIcon: 'musical-notes' as any },
  { name: 'Podcasts', label: 'Podcasts', icon: 'radio-outline' as any, focusedIcon: 'radio' as any },
  { name: 'Downloads', label: 'Descargas', icon: 'download-outline' as any, focusedIcon: 'download' as any },
];

interface FloatingBottomTabsProps {
  activeTab: string;
  onTabPress: (tabName: string) => void;
  hidden?: boolean;
}

export function FloatingBottomTabs({ activeTab, onTabPress, hidden = false }: FloatingBottomTabsProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();

  // Shared values for animations
  const activeIndex = useSharedValue(TABS.findIndex(t => t.name === activeTab));
  const tabPressAnim = useSharedValue(0);
  const hideAnim = useSharedValue(hidden ? 1 : 0);

  // Update active index when activeTab changes
  React.useEffect(() => {
    const newIndex = TABS.findIndex(t => t.name === activeTab);
    if (newIndex !== -1) {
      activeIndex.value = newIndex;
    }
  }, [activeTab]);

  // Handle hide/show animation
  React.useEffect(() => {
    hideAnim.value = withSpring(hidden ? 1 : 0, { damping: 20, stiffness: 200 });
  }, [hidden]);

  // Animated styles
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolateColor(hideAnim.value, [0, 1], [0, 100]) }],
    opacity: interpolateColor(hideAnim.value, [0, 1], [1, 0]),
  }));

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = 72; // Approximate tab width
    return {
      transform: [{
        translateX: interpolateColor(
          activeIndex.value,
          [0, 1, 2, 3, 4],
          [0, tabWidth, tabWidth * 2, tabWidth * 3, tabWidth * 4]
        )
      }],
    };
  }, []);

  const pressScaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolateColor(tabPressAnim.value, [0, 1], [1, 0.92]) }],
  }));

  const handleTabPress = (index: number, tabName: string) => {
    if (reducedMotion) {
      onTabPress(tabName);
      return;
    }

    // Haptic feedback would go here
    tabPressAnim.value = withTiming(1, { duration: 80 }, () => {
      tabPressAnim.value = withTiming(0, { duration: 80 });
    });
    activeIndex.value = withSpring(index, { damping: 20, stiffness: 200 });
    onTabPress(tabName);
  };

  return (
    <Animated.View style={[styles.container, containerStyle]} pointerEvents={hidden ? 'none' : 'auto'}>
      <BlurView intensity={90} style={styles.blur}>
        <View style={styles.tabBar}>
          {/* Active indicator */}
          <Animated.View style={[styles.indicator, indicatorStyle]} />

          {TABS.map((tab, index) => (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => handleTabPress(index, tab.name)}
              accessibilityRole="button"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected: activeTab === tab.name }}
            >
              <Animated.View style={pressScaleStyle}>
                <Ionicons
                  name={(activeTab === tab.name ? tab.focusedIcon : tab.icon) as any}
                  size={26}
                  color={activeTab === tab.name ? colors.primary : colors.textMuted}
                />
                <Text style={[
                  styles.tabLabel,
                  activeTab === tab.name ? styles.tabLabelActive : styles.tabLabelInactive,
                ]}>
                  {tab.label}
                </Text>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: SPACING.md,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 100,
  },
  blur: {
    borderRadius: BORDER_RADIUS.xxl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: SPACING.sm,
  },
  indicator: {
    position: 'absolute',
    bottom: 0,
    width: 72,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#00d4ff', // Will be overridden by dynamic colors
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xs,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tabLabelActive: {
    color: '#00d4ff', // Will be overridden
  },
  tabLabelInactive: {
    color: '#78788c', // Will be overridden
  },
});