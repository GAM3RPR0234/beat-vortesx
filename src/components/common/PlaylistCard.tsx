import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/constants/theme';

interface PlaylistCardProps {
  title: string;
  description: string;
  artwork: string;
  trackCount: number;
  onPress: () => void;
  index?: number;
}

export function PlaylistCard({ title, description, artwork, trackCount, onPress, index = 0 }: PlaylistCardProps) {
  const imageAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.timing(imageAnim, {
      toValue: 1,
      duration: ANIMATION.duration.normal + index * 50,
      delay: index * 50,
      easing: ANIMATION.easing.easeOut,
      useNativeDriver: true,
    }).start();
  }, [index]);

  return (
    <Animated.View
      style={[
        styles.playlistCard,
        { opacity: imageAnim, transform: [{ translateY: imageAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] },
      ]}
    >
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        <View style={styles.playlistArtworkContainer}>
          <Image source={{ uri: artwork }} style={styles.playlistArtwork} resizeMode="cover" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={styles.playlistArtworkGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
          />
          <View style={styles.playlistPlayButton}>
            <Ionicons name="play" size={32} color={COLORS.textOnPrimary} />
          </View>
        </View>
        <View style={styles.playlistInfo}>
          <Text style={styles.playlistTitle} numberOfLines={1}>{title}</Text>
          <Text style={styles.playlistDescription} numberOfLines={1}>{description}</Text>
          <Text style={styles.playlistTrackCount}>{trackCount} canciones</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  playlistCard: {
    width: 200,
  },
  playlistArtworkContainer: {
    position: 'relative',
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
  },
  playlistArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  playlistArtworkGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  playlistPlayButton: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    width: 52,
    height: 52,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  playlistInfo: {
    padding: SPACING.md,
    paddingTop: SPACING.sm,
  },
  playlistTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  playlistDescription: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  playlistTrackCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.primary,
  },
});