// Beat Vortex - Haptics Hook
// Wrapper around expo-haptics for consistent haptic feedback

import { useCallback } from 'react';
import {
  impactAsync,
  notificationAsync,
  selectionAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType
} from 'expo-haptics';

export type HapticImpactStyle = 'light' | 'medium' | 'heavy';
export type HapticNotificationType = 'success' | 'warning' | 'error';

export interface HapticsAPI {
  lightImpact: () => Promise<void>;
  mediumImpact: () => Promise<void>;
  heavyImpact: () => Promise<void>;
  successNotification: () => Promise<void>;
  warningNotification: () => Promise<void>;
  errorNotification: () => Promise<void>;
  selectionChanged: () => Promise<void>;
  impact: (style: HapticImpactStyle) => Promise<void>;
  notification: (type: HapticNotificationType) => Promise<void>;
}

export function useHaptics(): HapticsAPI {
  const lightImpact = useCallback(async () => {
    try {
      await impactAsync(ImpactFeedbackStyle.Light);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  }, []);

  const mediumImpact = useCallback(async () => {
    try {
      await impactAsync(ImpactFeedbackStyle.Medium);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  }, []);

  const heavyImpact = useCallback(async () => {
    try {
      await impactAsync(ImpactFeedbackStyle.Heavy);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  }, []);

  const successNotification = useCallback(async () => {
    try {
      await notificationAsync(NotificationFeedbackType.Success);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  }, []);

  const warningNotification = useCallback(async () => {
    try {
      await notificationAsync(NotificationFeedbackType.Warning);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  }, []);

  const errorNotification = useCallback(async () => {
    try {
      await notificationAsync(NotificationFeedbackType.Error);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  }, []);

  const selectionChanged = useCallback(async () => {
    try {
      await selectionAsync();
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  }, []);

  const impact = useCallback(async (style: HapticImpactStyle) => {
    const styleMap = {
      light: ImpactFeedbackStyle.Light,
      medium: ImpactFeedbackStyle.Medium,
      heavy: ImpactFeedbackStyle.Heavy,
    };
    try {
      await impactAsync(styleMap[style]);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  }, []);

  const notification = useCallback(async (type: HapticNotificationType) => {
    const typeMap = {
      success: NotificationFeedbackType.Success,
      warning: NotificationFeedbackType.Warning,
      error: NotificationFeedbackType.Error,
    };
    try {
      await notificationAsync(typeMap[type]);
    } catch (e) {
      // Silently fail on unsupported platforms
    }
  }, []);

  return {
    lightImpact,
    mediumImpact,
    heavyImpact,
    successNotification,
    warningNotification,
    errorNotification,
    selectionChanged,
    impact,
    notification,
  };
}

// Export individual functions for non-hook usage
export const haptics = {
  lightImpact: () => impactAsync(ImpactFeedbackStyle.Light).catch(() => {}),
  mediumImpact: () => impactAsync(ImpactFeedbackStyle.Medium).catch(() => {}),
  heavyImpact: () => impactAsync(ImpactFeedbackStyle.Heavy).catch(() => {}),
  successNotification: () => notificationAsync(NotificationFeedbackType.Success).catch(() => {}),
  warningNotification: () => notificationAsync(NotificationFeedbackType.Warning).catch(() => {}),
  errorNotification: () => notificationAsync(NotificationFeedbackType.Error).catch(() => {}),
  selectionChanged: () => selectionAsync().catch(() => {}),
};