/**
 * LeadCard.tsx
 *
 * Renders a single lead as a styled card.
 *
 * Features:
 *  - Animated entrance (slides in from the top + fade)
 *  - Avatar circle with the lead's initials
 *  - Name, email, phone fields
 *  - Relative time ("2 minutes ago") instead of raw ISO string
 *  - Respects the app's light/dark theme via useTheme()
 */

import { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { Lead } from '@/features/leads/types';

// ─────────────────────────────────────────────────────────────────
// Brand accent color — used for avatar background and "NEW" badge
// ─────────────────────────────────────────────────────────────────
const ACCENT = '#208AEF';

interface LeadCardProps {
  lead: Lead;
  /** If true, plays the slide-in animation (first render of this lead) */
  isNew?: boolean;
}

export function LeadCard({ lead, isNew = false }: LeadCardProps) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // Animation values — start translated up and transparent, animate to normal
  const translateY = useRef(new Animated.Value(isNew ? -30 : 0)).current;
  const opacity = useRef(new Animated.Value(isNew ? 0 : 1)).current;

  useEffect(() => {
    if (!isNew) return;

    // Slide down from above and fade in simultaneously
    const useNativeDriver = Platform.OS !== 'web';

    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver,
        damping: 15,
        stiffness: 120,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver,
      }),
    ]).start();
  }, []);

  const cardBg = isDark ? Colors.dark.backgroundElement : Colors.light.backgroundElement;
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const borderColor = isDark ? Colors.dark.backgroundSelected : Colors.light.backgroundSelected;

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      {/* Left: Avatar circle with initials */}
      <View style={[styles.avatar, { backgroundColor: ACCENT }]}>
        <ThemedText style={styles.avatarText}>
          {getInitials(lead.name)}
        </ThemedText>
      </View>

      {/* Right: Lead details */}
      <View style={styles.details}>
        {/* Top row: name + NEW badge */}
        <View style={styles.nameRow}>
          <ThemedText type="smallBold" style={styles.name} numberOfLines={1}>
            {lead.name}
          </ThemedText>
          {isNew && (
            <View style={styles.newBadge}>
              <ThemedText style={styles.newBadgeText}>NEW</ThemedText>
            </View>
          )}
        </View>

        {/* Email */}
        {lead.email ? (
          <ThemedText type="small" style={[styles.meta, { color: textSecondary }]} numberOfLines={1}>
            ✉ {lead.email}
          </ThemedText>
        ) : null}

        {/* Phone */}
        {lead.phone ? (
          <ThemedText type="small" style={[styles.meta, { color: textSecondary }]} numberOfLines={1}>
            ✆ {lead.phone}
          </ThemedText>
        ) : null}

        {/* Timestamp */}
        <ThemedText type="small" style={[styles.time, { color: textSecondary }]}>
          {formatRelativeTime(lead.receivedAt)}
        </ThemedText>
      </View>
    </Animated.View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

/** Gets up-to-2-letter initials from a full name. "John Doe" → "JD" */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Converts an ISO timestamp to a human-friendly relative string.
 * e.g. "just now", "2 minutes ago", "1 hour ago"
 */
function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  return `${hours} hour${hours > 1 ? 's' : ''} ago`;
}

// ─────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: Spacing.two,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  details: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  name: {
    flexShrink: 1,
  },
  newBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  newBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  meta: {
    fontSize: 13,
  },
  time: {
    fontSize: 11,
    marginTop: 2,
  },
});
