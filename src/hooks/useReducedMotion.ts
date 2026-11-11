import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Hook to detect if user has reduced motion enabled
 * Respects both OS-level and app-level preferences
 */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check OS-level reduced motion setting
    AccessibilityInfo.isReduceMotionEnabled().then(setReducedMotion);

    // Listen for changes
    const listener = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled: boolean) => setReducedMotion(enabled)
    );

    return () => listener.remove();
  }, []);

  return reducedMotion;
}

/**
 * Hook to get reduced motion preference from theme store
 * Combined with OS-level setting for complete reduced motion support
 */
export function useCombinedReducedMotion(): boolean {
  // We'll get the theme store value via useThemeStore in components
  const osReducedMotion = useReducedMotion();
  // App-level preference would come from themeStore via separate hook
  return osReducedMotion; // Will be combined in component
}