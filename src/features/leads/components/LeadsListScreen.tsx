/**
 * LeadsListScreen.tsx
 *
 * The main screen of the app — displays all incoming Meta leads in real time.
 *
 * Layout:
 *   ┌─────────────────────────────┐
 *   │  Header (title + status dot)│
 *   │  Connection status bar      │
 *   ├─────────────────────────────┤
 *   │  Lead card (newest first)   │
 *   │  Lead card                  │
 *   │  Lead card                  │
 *   │  ...                        │
 *   ├─────────────────────────────┤
 *   │  Empty state (if no leads)  │
 *   └─────────────────────────────┘
 */

import { useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLeads } from '@/features/leads/hooks/useLeads';
import { LeadCard } from '@/features/leads/components/LeadCard';
import type { Lead, ConnectionStatus } from '@/features/leads/types';

// ─────────────────────────────────────────────────────────────────
// Status dot config — shows connection health at a glance
// ─────────────────────────────────────────────────────────────────
const STATUS_COLORS: Record<ConnectionStatus, string> = {
  connected: '#22c55e',     // green
  connecting: '#f59e0b',    // amber
  disconnected: '#6b7280',  // gray
  error: '#ef4444',         // red
};

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  connected: 'Live',
  connecting: 'Connecting…',
  disconnected: 'Disconnected',
  error: 'Connection error',
};

export function LeadsListScreen() {
  const { leads, status, clearLeads } = useLeads();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  // Track which lead IDs are "new" (just arrived this session)
  // The first lead in the array is always the most recent one
  const firstLeadId = leads[0]?.id;

  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;
  const borderColor = isDark ? Colors.dark.backgroundSelected : Colors.light.backgroundSelected;
  const statusColor = STATUS_COLORS[status];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>

        {/* ── Header ──────────────────────────────────────────── */}
        <View style={[styles.header, { borderBottomColor: borderColor }]}>
          <View style={styles.headerLeft}>
            <ThemedText type="subtitle" style={styles.headerTitle}>
              Meta Leads
            </ThemedText>
            {leads.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: isDark ? Colors.dark.backgroundElement : Colors.light.backgroundElement }]}>
                <ThemedText type="smallBold">{leads.length}</ThemedText>
              </View>
            )}
          </View>

          <View style={styles.headerRight}>
            {/* Connection status dot + label */}
            <View style={styles.statusPill}>
              <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
              <ThemedText type="small" style={{ color: statusColor }}>
                {STATUS_LABELS[status]}
              </ThemedText>
            </View>

            {/* Clear button — only visible when there are leads */}
            {leads.length > 0 && (
              <TouchableOpacity onPress={clearLeads} style={styles.clearButton} accessibilityLabel="Clear all leads">
                <ThemedText type="small" style={{ color: textSecondary }}>
                  Clear
                </ThemedText>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Leads List ──────────────────────────────────────── */}
        <FlatList<Lead>
          data={leads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            leads.length === 0 && styles.listContentEmpty,
          ]}
          // Render each lead as a LeadCard
          // Mark the very first (newest) card as `isNew` to trigger animation
          renderItem={({ item, index }) => (
            <LeadCard
              lead={item}
              isNew={index === 0 && item.id === firstLeadId}
            />
          )}
          // Show empty state when there are no leads yet
          ListEmptyComponent={<EmptyState status={status} />}
          // Scroll to top automatically when a new lead is prepended
          // (FlatList already starts from top when data[0] changes)
          showsVerticalScrollIndicator={false}
        />

      </SafeAreaView>
    </ThemedView>
  );
}

// ─────────────────────────────────────────────────────────────────
// Empty State — shown when no leads have arrived yet
// ─────────────────────────────────────────────────────────────────
function EmptyState({ status }: { status: ConnectionStatus }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const textSecondary = isDark ? Colors.dark.textSecondary : Colors.light.textSecondary;

  return (
    <View style={styles.emptyState}>
      {/* Large icon */}
      <ThemedText style={styles.emptyIcon}>📋</ThemedText>

      <ThemedText type="smallBold" style={styles.emptyTitle}>
        Waiting for leads…
      </ThemedText>

      <ThemedText type="small" style={[styles.emptySubtitle, { color: textSecondary }]}>
        {status === 'connected'
          ? 'Go to the Meta Lead Testing Tool and submit a test lead. It will appear here instantly.'
          : status === 'connecting'
          ? 'Connecting to the leads server…'
          : 'Server is offline. Make sure the backend is running.'}
      </ThemedText>

      {/* Mini guide */}
      {status === 'connected' && (
        <View style={[styles.guide, { backgroundColor: isDark ? Colors.dark.backgroundElement : Colors.light.backgroundElement }]}>
          <ThemedText type="small" style={[styles.guideStep, { color: textSecondary }]}>
            1. Open Meta for Developers → your App
          </ThemedText>
          <ThemedText type="small" style={[styles.guideStep, { color: textSecondary }]}>
            2. Go to Lead Ads → Lead Ads Testing
          </ThemedText>
          <ThemedText type="small" style={[styles.guideStep, { color: textSecondary }]}>
            3. Select your page and form → Submit
          </ThemedText>
        </View>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  headerTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 28,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clearButton: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },

  // List
  listContent: {
    padding: Spacing.three,
    paddingBottom: Platform.select({ ios: 100, android: 120 }) ?? 80,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.two,
  },
  emptyIcon: {
    fontSize: 56,
    marginBottom: Spacing.two,
  },
  emptyTitle: {
    fontSize: 18,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  guide: {
    marginTop: Spacing.three,
    padding: Spacing.three,
    borderRadius: 12,
    gap: Spacing.one,
    alignSelf: 'stretch',
  },
  guideStep: {
    lineHeight: 22,
  },
});
