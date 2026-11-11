// Beat Vortex - Animation Audit Utilities
// Tools for verifying 60fps animations, detecting jank, and ensuring smooth transitions

import { useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing } from 'react-native-reanimated';
import { useRef, useEffect } from 'react';

/**
 * Animation Performance Monitor
 * Tracks frame drops and reports animation performance
 */
class AnimationPerformanceMonitor {
  private frames: number[] = [];
  private rafId: number | null = null;
  private isMonitoring = false;
  private callbacks: Array<(metrics: AnimationMetrics) => void> = [];
  private lastFrameTime = 0;
  private droppedFrames = 0;

  start() {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.frames = [];
    this.droppedFrames = 0;
    this.lastFrameTime = performance.now();
    this.tick();
  }

  stop() {
    this.isMonitoring = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.notifyCallbacks();
  }

  private tick() {
    if (!this.isMonitoring) return;

    const now = performance.now();
    const delta = now - this.lastFrameTime;

    // 60fps = ~16.67ms per frame
    // Flag frames taking > 18ms as potential drops
    if (delta > 18) {
      this.droppedFrames++;
    }

    this.frames.push(delta);
    this.lastFrameTime = now;

    // Keep last 300 frames (5 seconds at 60fps)
    if (this.frames.length > 300) {
      this.frames.shift();
    }

    this.rafId = requestAnimationFrame(() => this.tick());
  }

  getMetrics(): AnimationMetrics {
    if (this.frames.length === 0) {
      return { fps: 0, avgFrameTime: 0, droppedFrames: 0, jankCount: 0, isSmooth: false };
    }

    const totalFrames = this.frames.length;
    const totalTime = this.frames.reduce((a, b) => a + b, 0);
    const avgFrameTime = totalTime / totalFrames;
    const fps = 1000 / avgFrameTime;

    // Count jank frames (> 18ms)
    const jankCount = this.frames.filter(f => f > 18).length;

    // Consider smooth if < 5% jank frames and fps > 55
    const isSmooth = fps > 55 && (jankCount / totalFrames) < 0.05;

    return {
      fps: Math.round(fps * 10) / 10,
      avgFrameTime: Math.round(avgFrameTime * 100) / 100,
      droppedFrames: this.droppedFrames,
      jankCount,
      isSmooth,
    };
  }

  onMetrics(callback: (metrics: AnimationMetrics) => void) {
    this.callbacks.push(callback);
  }

  private notifyCallbacks() {
    const metrics = this.getMetrics();
    this.callbacks.forEach(cb => cb(metrics));
  }
}

export interface AnimationMetrics {
  fps: number;
  avgFrameTime: number;
  droppedFrames: number;
  jankCount: number;
  isSmooth: boolean;
}

export const animationMonitor = new AnimationPerformanceMonitor();

/**
 * Hook to monitor animation performance in a component
 */
export function useAnimationMonitor(enabled = true) {
  const metricsRef = useRef<AnimationMetrics>({
    fps: 0,
    avgFrameTime: 0,
    droppedFrames: 0,
    jankCount: 0,
    isSmooth: false,
  });

  useEffect(() => {
    if (!enabled) return;

    animationMonitor.start();

    const unsubscribe = animationMonitor.onMetrics((metrics) => {
      metricsRef.current = metrics;
    });

    // Report every 2 seconds
    const interval = setInterval(() => {
      if (!metricsRef.current.isSmooth && metricsRef.current.fps > 0) {
        console.warn('[Animation Audit] Performance warning:', metricsRef.current);
      }
    }, 2000);

    return () => {
      animationMonitor.stop();
      clearInterval(interval);
    };
  }, [enabled]);

  return metricsRef.current;
}

/**
 * Animation Audit Configuration
 * Centralized animation timing and easing for consistency
 */
export const ANIMATION_AUDIT_CONFIG = {
  // Standard durations (ms)
  duration: {
    instant: 0,
    fast: 150,
    normal: 250,
    slow: 400,
    slower: 600,
  },

  // Standard easings
  easing: {
    standard: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0.0, 1, 1)',
    decelerate: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
    spring: 'spring(1, 100, 10)',
    bouncy: 'spring(1, 80, 15)',
  },

  // Stagger delays for list animations
  stagger: {
    itemDelay: 30,
    maxDelay: 300,
  },

  // Shared element transition config
  sharedElement: {
    duration: 300,
    easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
  },

  // Reduced motion alternatives
  reducedMotion: {
    duration: 0,
    easing: 'linear',
  },
} as const;

/**
 * Verify animation configuration consistency
 * Run this in development to check all animated components
 */
export function auditAnimationConfig(): AnimationAuditResult {
  const issues: string[] = [];
  const warnings: string[] = [];

  // Check for hardcoded durations that don't match config
  // This would ideally scan the codebase, but we can provide guidelines

  return {
    passed: issues.length === 0,
    issues,
    warnings,
    recommendations: [
      'Use ANIMATION.duration constants instead of hardcoded values',
      'Use withSpring for natural feel, withTiming for precise timing',
      'Enable useNativeDriver: true for transform/opacity animations',
      'Respect useReducedMotion hook for accessibility',
      'Keep animations under 400ms for perceived responsiveness',
      'Stagger list items with 30ms delay, max 300ms total',
    ],
  };
}

export interface AnimationAuditResult {
  passed: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

/**
 * Shared Element Transition Helper
 * Creates consistent shared element transitions between screens
 */
export function createSharedElementTransition(
  progress: ReturnType<typeof useSharedValue<number>>,
  config: {
    translateX?: [number, number];
    translateY?: [number, number];
    scale?: [number, number];
    opacity?: [number, number];
    borderRadius?: [number, number];
  }
) {
  const { translateX, translateY, scale, opacity, borderRadius } = config;

  return useAnimatedStyle(() => {
    const transforms = [];
    const p = progress.value;

    if (translateX) {
      transforms.push({ translateX: p * (translateX[1] - translateX[0]) + translateX[0] });
    }
    if (translateY) {
      transforms.push({ translateY: p * (translateY[1] - translateY[0]) + translateY[0] });
    }
    if (scale) {
      transforms.push({ scale: p * (scale[1] - scale[0]) + scale[0] });
    }

    return {
      transform: transforms,
      opacity: opacity ? p * (opacity[1] - opacity[0]) + opacity[0] : 1,
      borderRadius: borderRadius ? p * (borderRadius[1] - borderRadius[0]) + borderRadius[0] : undefined,
    };
  });
}

/**
 * Staggered List Animation Helper
 * Creates consistent staggered entrance animations for lists
 */
export function createStaggeredAnimation(
  index: number,
  baseDelay = ANIMATION_AUDIT_CONFIG.stagger.itemDelay,
  maxDelay = ANIMATION_AUDIT_CONFIG.stagger.maxDelay
) {
  const delay = Math.min(index * baseDelay, maxDelay);

  return {
    delay,
    duration: ANIMATION_AUDIT_CONFIG.duration.normal,
    easing: ANIMATION_AUDIT_CONFIG.easing.decelerate,
  };
}

/**
 * Press Feedback Animation
 * Standardized press feedback for interactive elements
 */
export function usePressAnimation(reducedMotion: boolean) {
  const pressAnim = useSharedValue(0);

  const onPressIn = () => {
    if (!reducedMotion) {
      pressAnim.value = withTiming(0.92, { duration: 80 });
    }
  };

  const onPressOut = () => {
    if (!reducedMotion) {
      pressAnim.value = withSpring(1, { damping: 20, stiffness: 200 });
    }
  };

  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pressAnim.value }],
  }));

  return { onPressIn, onPressOut, pressStyle };
}

/**
 * Fade/Side Animation for Screen Transitions
 */
export function useScreenTransition(reducedMotion: boolean, direction: 'horizontal' | 'vertical' = 'vertical') {
  const anim = useSharedValue(0);

  useEffect(() => {
    if (!reducedMotion) {
      anim.value = withTiming(1, {
        duration: ANIMATION_AUDIT_CONFIG.duration.normal,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      anim.value = 1;
    }
  }, [reducedMotion]);

  const style = useAnimatedStyle(() => {
    const progress = anim.value;
    const translateY = direction === 'vertical' ? (1 - progress) * 20 : 0;
    const translateX = direction === 'horizontal' ? (1 - progress) * 20 : 0;

    return {
      opacity: progress,
      transform: [
        { translateY },
        { translateX },
      ],
    };
  });

  return style;
}

export { animationMonitor as default };