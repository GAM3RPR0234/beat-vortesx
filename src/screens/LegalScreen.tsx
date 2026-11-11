import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { SPACING, BORDER_RADIUS, TYPOGRAPHY, ANIMATION, LEGAL } from '@/constants/theme';

export function LegalScreen() {
  const colors = useColors();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <LinearGradient
          colors={[colors.primary, colors.secondary]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        />
        <View style={styles.headerContent}>
          <Ionicons name="shield-checkmark" size={48} color={colors.textOnPrimary} />
          <Text style={styles.headerTitle}>{LEGAL.appName}</Text>
          <Text style={styles.headerSubtitle}>{LEGAL.disclaimer.title}</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={[styles.introCard, { backgroundColor: colors.surface }]}>
          <View style={styles.introIcon}>
            <Ionicons name="information-circle" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.introTitle, { color: colors.textPrimary }]}>Información Legal Importante</Text>
          <Text style={[styles.introText, { color: colors.textSecondary }]}>
            Lee atentamente los siguientes términos antes de usar Beat Vortex.
            Al continuar, confirmas que has leído, entendido y aceptado estos términos.
          </Text>
        </View>

        {LEGAL.disclaimer.sections.map((section, index) => (
          <View key={index} style={[styles.section, { backgroundColor: colors.surface }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{section.title}</Text>
            </View>
            <Text style={[styles.sectionContent, { color: colors.textSecondary }]}>{section.content}</Text>
          </View>
        ))}

        <View style={[styles.keyPoints, { backgroundColor: colors.surface }]}>
          <Text style={[styles.keyPointsTitle, { color: colors.textPrimary }]}>Puntos Clave</Text>
          <View style={styles.keyPointsList}>
            {[
              { icon: 'checkmark-circle' as const, text: '100% Gratuita y de código abierto', color: colors.success },
              { icon: 'shield-checkmark' as const, text: 'Sin servidores centrales · Todo local', color: colors.primary },
              { icon: 'lock-closed' as const, text: 'Sin cuentas, sin registro, sin rastreo', color: colors.primary },
              { icon: 'wifi-outline' as const, text: 'Funciona completamente offline', color: colors.warning },
              { icon: 'logo-github' as const, text: 'Código auditable en GitHub', color: colors.textSecondary },
              { icon: 'warning' as const, text: 'Usuario responsable del uso legal del contenido', color: colors.error },
            ].map((item, index) => (
              <View key={index} style={styles.keyPoint}>
                <View style={[styles.keyPointIcon, { backgroundColor: `${item.color}20` }]}>
                  <Ionicons name={item.icon} size={20} color={item.color} />
                </View>
                <Text style={[styles.keyPointText, { color: colors.textPrimary }]}>{item.text}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.disclaimerBox, { backgroundColor: colors.surfaceOverlay, borderColor: colors.border }]}>
          <Text style={[styles.disclaimerTitle, { color: colors.textPrimary }]}>⚠ Descargo de Responsabilidad</Text>
          <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
            Beat Vortex es una herramienta de reproducción local. No aloja, distribuye ni transmite
            contenido protegido por derechos de autor. El usuario es el único responsable de
            cumplir con las leyes de propiedad intelectual de su jurisdicción. Los desarrolladores
            no se hacen responsables del uso indebido de esta aplicación.
          </Text>
        </View>

        <View style={[styles.versionInfo, { backgroundColor: colors.surface }]}>
          <Text style={[styles.versionText, { color: colors.textPrimary }]}>Versión 1.0.0</Text>
          <Text style={[styles.buildText, { color: colors.textMuted }]}>Build: 2026.11.08</Text>
          <Text style={[styles.licenseText, { color: colors.textMuted }]}>Licencia: MIT · Código abierto</Text>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Beat Vortex · Cliente de reproducción independiente
        </Text>
        <Text style={[styles.footerLegal, { color: colors.textMuted }]}>
          No afiliado a Google LLC, YouTube, Spotify ni sus filiales
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: SPACING.xxxl,
  },
  header: {
    position: 'relative',
    paddingTop: SPACING.xxxl,
    paddingBottom: SPACING.xl,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderBottomLeftRadius: BORDER_RADIUS.xxl,
    borderBottomRightRadius: BORDER_RADIUS.xxl,
  },
  headerContent: {
    position: 'relative',
    zIndex: 1,
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.heavy,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  content: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.lg,
  },
  introCard: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: '#00d4ff20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  introTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  introText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md,
  },
  section: {
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  sectionContent: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md,
  },
  keyPoints: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  keyPointsTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.md,
  },
  keyPointsList: {
    gap: SPACING.md,
  },
  keyPoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
  },
  keyPointIcon: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyPointText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    flex: 1,
  },
  disclaimerBox: {
    backgroundColor: 'rgba(255,51,68,0.1)',
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#ff3344',
    padding: SPACING.lg,
    marginBottom: SPACING.xl,
  },
  disclaimerTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#ff3344',
    marginBottom: SPACING.sm,
  },
  disclaimerText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
    lineHeight: TYPOGRAPHY.lineHeight.relaxed * TYPOGRAPHY.fontSize.md,
  },
  versionInfo: {
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
  },
  versionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  buildText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  licenseText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
  footer: {
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
    borderTopWidth: 1,
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  footerLegal: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.regular,
  },
});