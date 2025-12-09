import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTimeSeries } from '../hooks/useTimeSeries';
import { TrendChart } from '../components/TrendChart';

const WINDOWS = [7, 30, 90] as const;

export function AnalyticsScreen() {
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  const trend = useTimeSeries(windowDays);

  const totalEvents    = trend.reduce((s, b) => s + Number(b.eventsCount), 0);
  const totalCompleted = trend.reduce((s, b) => s + Number(b.tasksCompleted), 0);
  const avgScore       = trend.length
    ? (trend.reduce((s, b) => s + Number(b.score), 0) / trend.length).toFixed(1)
    : '—';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Behavioral Analytics</Text>

      <View style={styles.windowSelector}>
        {WINDOWS.map((w) => (
          <TouchableOpacity
            key={w}
            style={[styles.pill, windowDays === w && styles.pillActive]}
            onPress={() => setWindowDays(w)}
          >
            <Text style={[styles.pillText, windowDays === w && styles.pillTextActive]}>
              {w}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TrendChart data={trend} windowDays={windowDays} />

      <View style={styles.statsGrid}>
        <StatCard label="Avg Score"       value={String(avgScore)} />
        <StatCard label="Tasks Completed" value={String(totalCompleted)} />
        <StatCard label="Events Tracked"  value={String(totalEvents)} />
      </View>
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#F9FAFB' },
  content:        { padding: 16 },
  heading:        { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 16 },
  windowSelector: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  pill:           { paddingVertical: 6, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#E5E7EB' },
  pillActive:     { backgroundColor: '#4F46E5' },
  pillText:       { color: '#374151', fontWeight: '600' },
  pillTextActive: { color: '#FFF' },
  statsGrid:      { flexDirection: 'row', gap: 12, marginTop: 16 },
  card:           { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, alignItems: 'center' },
  cardValue:      { fontSize: 24, fontWeight: '700', color: '#111827' },
  cardLabel:      { fontSize: 12, color: '#6B7280', marginTop: 4, textAlign: 'center' },
});
