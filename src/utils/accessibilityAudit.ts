// Beat Vortex - Accessibility Audit Utilities
// Tools for verifying WCAG AA compliance, dynamic type scaling, and screen reader support

import { useColorScheme } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useThemeStore } from '@/store/themeStore';

/**
 * WCAG 2.1 Contrast Ratio Calculator
 * Returns contrast ratio between two colors (1-21)
 * AA requires 4.5:1 for normal text, 3:1 for large text (18pt+ or 14pt+ bold)
 * AAA requires 7:1 for normal text, 4.5:1 for large text
 */
function calculateContrastRatio(color1: string, color2: string): number {
  const lum1 = getRelativeLuminance(color1);
  const lum2 = getRelativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Parse color string to RGB values
 */
function parseColor(color: string): { r: number; g: number; b: number } | null {
  // Hex colors
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
    if (hex.length === 8) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // RGB/RGBA colors
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
    };
  }

  return null;
}

/**
 * Calculate relative luminance per WCAG
 */
function getRelativeLuminance(color: string): number {
  const rgb = parseColor(color);
  if (!rgb) return 0;

  const { r, g, b } = rgb;
  const [rs, gs, bs] = [r, g, b].map(c => {
    const srgb = c / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : Math.pow((srgb + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Check if contrast meets WCAG level
 */
function meetsContrastRequirement(
  foreground: string,
  background: string,
  level: 'AA' | 'AAA' = 'AA',
  isLargeText = false
): boolean {
  const ratio = calculateContrastRatio(foreground, background);

  if (level === 'AAA') {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Accessibility Audit Configuration
 */
export const ACCESSIBILITY_AUDIT_CONFIG = {
  // Dynamic type scale limits
  fontScale: {
    min: 0.85,
    max: 1.3,
    default: 1.0,
  },

  // Minimum touch target size (dp)
  minTouchTarget: 48,

  // Contrast requirements
  contrast: {
    normalText: { AA: 4.5, AAA: 7 },
    largeText: { AA: 3, AAA: 4.5 },
    uiComponents: { AA: 3, AAA: 4.5 },
  },

  // Spacing minimums
  spacing: {
    minInteractiveGap: 8, // Minimum gap between interactive elements
  },

  // Animation limits for reduced motion
  reducedMotion: {
    maxDuration: 0,
    disableParallax: true,
    disableAutoPlay: true,
  },
} as const;

/**
 * Audit result for a single element
 */
export interface ElementAuditResult {
  element: string;
  passed: boolean;
  issues: AccessibilityIssue[];
}

export interface AccessibilityIssue {
  type: 'contrast' | 'touchTarget' | 'label' | 'role' | 'focus' | 'dynamicType' | 'language';
  severity: 'error' | 'warning' | 'info';
  message: string;
  wcagCriterion?: string;
  recommendation?: string;
}

/**
 * Full screen audit result
 */
export interface ScreenAuditResult {
  screenName: string;
  passed: boolean;
  elementResults: ElementAuditResult[];
  summary: {
    totalIssues: number;
    errors: number;
    warnings: number;
    info: number;
  };
}

/**
 * Hook to check accessibility of current theme
 */
export function useAccessibilityAudit() {
  const colors = useColors();
  const { fontScale, animationScale } = useThemeStore();
  const colorScheme = useColorScheme();

  // Audit current theme colors
  const auditThemeColors = (): ElementAuditResult[] => {
    const results: ElementAuditResult[] = [];

    // Check primary text on background
    results.push(auditContrast(
      'Primary Text on Background',
      colors.textPrimary,
      colors.background,
      false
    ));

    // Check secondary text on background
    results.push(auditContrast(
      'Secondary Text on Background',
      colors.textMuted,
      colors.background,
      false
    ));

    // Check primary button text on primary background
    results.push(auditContrast(
      'Primary Button Text',
      colors.textOnPrimary,
      colors.primary,
      false
    ));

    // Check surface text on surface background
    results.push(auditContrast(
      'Surface Text on Surface Background',
      colors.textPrimary,
      colors.surface,
      false
    ));

    // Check border visibility
    results.push(auditContrast(
      'Border on Background',
      colors.border,
      colors.background,
      false
    ));

    // Check disabled state contrast
    results.push(auditContrast(
      'Disabled Text on Background',
      colors.textDisabled,
      colors.background,
      false
    ));

    return results;
  };

  // Audit font scale
  const auditFontScale = (): AccessibilityIssue[] => {
    const issues: AccessibilityIssue[] = [];

    if (fontScale < ACCESSIBILITY_AUDIT_CONFIG.fontScale.min) {
      issues.push({
        type: 'dynamicType',
        severity: 'warning',
        message: `Font scale (${fontScale}) below minimum (${ACCESSIBILITY_AUDIT_CONFIG.fontScale.min})`,
        wcagCriterion: '1.4.4 Resize Text',
        recommendation: `Increase font scale to at least ${ACCESSIBILITY_AUDIT_CONFIG.fontScale.min}`,
      });
    }

    if (fontScale > ACCESSIBILITY_AUDIT_CONFIG.fontScale.max) {
      issues.push({
        type: 'dynamicType',
        severity: 'warning',
        message: `Font scale (${fontScale}) exceeds maximum (${ACCESSIBILITY_AUDIT_CONFIG.fontScale.max})`,
        wcagCriterion: '1.4.4 Resize Text',
        recommendation: `Decrease font scale to at most ${ACCESSIBILITY_AUDIT_CONFIG.fontScale.max}`,
      });
    }

    return issues;
  };

  // Audit animation scale for reduced motion
  const auditAnimationScale = (): AccessibilityIssue[] => {
    const issues: AccessibilityIssue[] = [];

    // Check if reduced motion is respected (animationScale = 0)
    // This would be checked per-component, but we can flag the setting
    if (animationScale === 0) {
      issues.push({
        type: 'language',
        severity: 'info',
        message: 'Reduced motion enabled - animations disabled',
        wcagCriterion: '2.3.3 Animation from Interactions',
        recommendation: 'Ensure all animations respect reduced motion setting',
      });
    }

    return issues;
  };

  return {
    auditThemeColors,
    auditFontScale,
    auditAnimationScale,
    colors,
    fontScale,
    animationScale,
    colorScheme,
  };
}

/**
 * Audit a single contrast pair
 */
function auditContrast(
  name: string,
  foreground: string,
  background: string,
  isLargeText: boolean
): ElementAuditResult {
  const aaNormal = meetsContrastRequirement(foreground, background, 'AA', false);
  const aaLarge = meetsContrastRequirement(foreground, background, 'AA', true);
  const aaaNormal = meetsContrastRequirement(foreground, background, 'AAA', false);
  const aaaLarge = meetsContrastRequirement(foreground, background, 'AAA', true);
  const ratio = calculateContrastRatio(foreground, background);

  const issues: AccessibilityIssue[] = [];
  const required = isLargeText ? 3 : 4.5;
  const passed = ratio >= required;

  if (!passed) {
    issues.push({
      type: 'contrast',
      severity: 'error',
      message: `Contrast ratio ${ratio.toFixed(2)}:1 fails WCAG AA (requires ${required}:1)`,
      wcagCriterion: '1.4.3 Contrast (Minimum)',
      recommendation: `Adjust colors to achieve at least ${required}:1 contrast ratio`,
    });
  } else if (ratio < 7) {
    issues.push({
      type: 'contrast',
      severity: 'warning',
      message: `Contrast ratio ${ratio.toFixed(2)}:1 passes AA but not AAA`,
      wcagCriterion: '1.4.6 Contrast (Enhanced)',
      recommendation: 'Consider increasing contrast for AAA compliance',
    });
  }

  return {
    element: name,
    passed,
    issues,
  };
}

/**
 * Generate accessibility report for a screen
 */
export function generateScreenAuditReport(
  screenName: string,
  elementResults: ElementAuditResult[]
): ScreenAuditResult {
  const allIssues = elementResults.flatMap(r => r.issues);
  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const info = allIssues.filter(i => i.severity === 'info').length;

  return {
    screenName,
    passed: errors === 0,
    elementResults,
    summary: {
      totalIssues: allIssues.length,
      errors,
      warnings,
      info,
    },
  };
}

/**
 * Check if component has required accessibility props
 */
export function auditComponentAccessibility(
  componentName: string,
  props: {
    accessibilityLabel?: string;
    accessibilityRole?: string;
    accessibilityState?: Record<string, boolean>;
    accessibilityHint?: string;
    accessibilityActions?: string[];
    onPress?: () => void;
    onLongPress?: () => void;
    style?: any;
    testID?: string;
  }
): ElementAuditResult {
  const issues: AccessibilityIssue[] = [];

  // Check for interactive elements without accessibility role
  if ((props.onPress || props.onLongPress) && !props.accessibilityRole) {
    issues.push({
      type: 'role',
      severity: 'error',
      message: 'Interactive element missing accessibilityRole',
      wcagCriterion: '4.1.2 Name, Role, Value',
      recommendation: 'Add accessibilityRole="button" (or link, adjustable, etc.)',
    });
  }

  // Check for missing accessibility label on interactive elements
  if ((props.onPress || props.onLongPress) && !props.accessibilityLabel) {
    issues.push({
      type: 'label',
      severity: 'error',
      message: 'Interactive element missing accessibilityLabel',
      wcagCriterion: '4.1.2 Name, Role, Value',
      recommendation: 'Add descriptive accessibilityLabel',
    });
  }

  // Check touch target size
  if (props.style) {
    const style = Array.isArray(props.style) ? props.style[props.style.length - 1] : props.style;
    const height = style.height || style.minHeight;
    const width = style.width || style.minWidth;

    if (height && height < ACCESSIBILITY_AUDIT_CONFIG.minTouchTarget) {
      issues.push({
        type: 'touchTarget',
        severity: 'error',
        message: `Touch target height (${height}dp) below minimum ${ACCESSIBILITY_AUDIT_CONFIG.minTouchTarget}dp`,
        wcagCriterion: '2.5.5 Target Size',
        recommendation: `Increase height to at least ${ACCESSIBILITY_AUDIT_CONFIG.minTouchTarget}dp`,
      });
    }

    if (width && width < ACCESSIBILITY_AUDIT_CONFIG.minTouchTarget) {
      issues.push({
        type: 'touchTarget',
        severity: 'error',
        message: `Touch target width (${width}dp) below minimum ${ACCESSIBILITY_AUDIT_CONFIG.minTouchTarget}dp`,
        wcagCriterion: '2.5.5 Target Size',
        recommendation: `Increase width to at least ${ACCESSIBILITY_AUDIT_CONFIG.minTouchTarget}dp`,
      });
    }
  }

  // Check for missing accessibility hint on complex interactions
  if (props.onLongPress && !props.accessibilityHint) {
    issues.push({
      type: 'label',
      severity: 'warning',
      message: 'Long press action missing accessibilityHint',
      wcagCriterion: '3.3.2 Labels or Instructions',
      recommendation: 'Add accessibilityHint describing the long press action',
    });
  }

  // Check for accessibility actions
  if (props.accessibilityActions && props.accessibilityActions.length > 0 && !props.accessibilityHint) {
    issues.push({
      type: 'label',
      severity: 'info',
      message: 'Custom accessibility actions present but no hint provided',
      wcagCriterion: '3.3.2 Labels or Instructions',
      recommendation: 'Add accessibilityHint describing available actions',
    });
  }

  return {
    element: componentName,
    passed: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

/**
 * Accessibility testing utilities for development
 */
export const AccessibilityTestUtils = {
  /**
   * Log all accessibility issues for a screen
   */
  logScreenAudit(report: ScreenAuditResult) {
    console.group(`[Accessibility Audit] ${report.screenName}`);
    console.log(`Passed: ${report.passed}`);
    console.log(`Issues: ${report.summary.totalIssues} (${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.info} info)`);

    report.elementResults.forEach(element => {
      if (element.issues.length > 0) {
        console.group(`${element.element} - ${element.passed ? 'PASS' : 'FAIL'}`);
        element.issues.forEach(issue => {
          const prefix = issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️';
          console.log(`${prefix} [${issue.type}] ${issue.message}`);
          if (issue.wcagCriterion) console.log(`   WCAG: ${issue.wcagCriterion}`);
          if (issue.recommendation) console.log(`   Fix: ${issue.recommendation}`);
        });
        console.groupEnd();
      }
    });
    console.groupEnd();
  },

  /**
   * Quick contrast check for any two colors
   */
  checkContrast(foreground: string, background: string, isLargeText = false) {
    const ratio = calculateContrastRatio(foreground, background);
    const aaPass = meetsContrastRequirement(foreground, background, 'AA', isLargeText);
    const aaaPass = meetsContrastRequirement(foreground, background, 'AAA', isLargeText);

    return {
      ratio: Math.round(ratio * 100) / 100,
      aa: aaPass,
      aaa: aaaPass,
      required: isLargeText ? 3 : 4.5,
    };
  },

  /**
   * Test font scale bounds
   */
  testFontScale(scale: number) {
    return {
      valid: scale >= ACCESSIBILITY_AUDIT_CONFIG.fontScale.min && scale <= ACCESSIBILITY_AUDIT_CONFIG.fontScale.max,
      min: ACCESSIBILITY_AUDIT_CONFIG.fontScale.min,
      max: ACCESSIBILITY_AUDIT_CONFIG.fontScale.max,
      current: scale,
    };
  },
};