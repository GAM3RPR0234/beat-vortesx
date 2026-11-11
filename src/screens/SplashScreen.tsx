import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, useReducedMotion } from '@/hooks/useColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION } from '@/constants/theme';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const colors = useColors();
  const reducedMotion = useReducedMotion();
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;
  const glowAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (reducedMotion) {
      // Skip animations entirely when reduced motion is enabled
      fadeAnim.setValue(1);
      scaleAnim.setValue(1);
      glowAnim.setValue(1);

      const timer = setTimeout(() => {
        fadeAnim.setValue(0);
        setTimeout(() => onComplete(), 100);
      }, 1500); // Shorter duration for reduced motion

      return () => clearTimeout(timer);
    }

    // Animación de entrada del logo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: ANIMATION.duration.slow,
        easing: Easing.bezier(0.175, 0.885, 0.32, 1.275),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: ANIMATION.duration.slow,
        easing: Easing.bezier(0.175, 0.885, 0.32, 1.275),
        useNativeDriver: true,
      }),
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: ANIMATION.duration.slow * 1.5,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Transición a la app principal después de la animación
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: ANIMATION.duration.normal,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) onComplete();
      });
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete, reducedMotion]);

  return (
    <Animated.View
      style={[
        styles.container,
        { opacity: fadeAnim, backgroundColor: colors.background },
      ]}
    >
      <LinearGradient
        colors={colors.gradientNeon}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <Animated.View
        style={[
          styles.glowRing,
          {
            opacity: glowAnim,
            borderColor: colors.primary,
            transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1.5] }) }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.logoContainer,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={[
          styles.logoGlow,
          { backgroundColor: colors.primary + '1a' }
        ]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.tagline,
          { opacity: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) },
        ]}
      >
        <Text style={[
          styles.taglineText,
          { color: colors.textMuted }
        ]}>Tu vortex musical</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.15,
  },
  glowRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 2,
  },
  logoContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  logoGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: BORDER_RADIUS.round,
  },
  tagline: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
  },
  taglineText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
});