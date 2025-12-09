import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useAppDispatch } from '../store';
import { useProductivityScore } from '../hooks/useProductivityScore';
import { refreshScore } from '../store/slices/analytics.slice';
import { ProductivityGauge } from '../components/ProductivityGauge';
import { SyncStatusBanner } from '../components/SyncStatusBanner';

export function DashboardScreen() {
  const dispatch        = useAppDispatch();
  const { score, loading } = useProductivityScore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <SyncStatusBanner />
      <Text style={styles.heading}>Productivity Score</Text>
      <Text style={styles.subheading}>Trailing 7 days</Text>

      {loading && !score && <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />}

      {score && <ProductivityGauge score={score} />}

      {!loading && (
        <TouchableOpacity
          style={styles.refreshBtn}
          onPress={() => dispatch(refreshScore())}
        >
          <Text style={styles.refreshText}>Recalculate</Text>
        </TouchableOpacity>
      )}

      {score && (
        <View style={styles.statRow}>
          <Stat label="Completion"  value={`${(score.completionRate * 100).toFixed(0)}%`} />
          <Stat label="Velocity"    value={`${(score.velocityIndex  * 100).toFixed(0)}%`} />
          <Stat label="Consistency" value={`${(score.consistencyScore * 100).toFixed(0)}%`} />
        </View>
      )}
    </ScrollView>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F9FAFB' },
  content:     { padding: 16 },
  heading:     { fontSize: 22, fontWeight: '700', color: '#111827', marginTop: 8 },
  subheading:  { fontSize: 13, color: '#6B7280', marginBottom: 16 },
  refreshBtn:  { alignSelf: 'center', marginTop: 8, paddingVertical: 8, paddingHorizontal: 20, backgroundColor: '#EEF2FF', borderRadius: 20 },
  refreshText: { color: '#4F46E5', fontWeight: '600' },
  statRow:     { flexDirection: 'row', justifyContent: 'space-around', marginTop: 24, backgroundColor: '#FFF', borderRadius: 12, padding: 16 },
  stat:        { alignItems: 'center' },
  statValue:   { fontSize: 22, fontWeight: '700', color: '#111827' },
  statLabel:   { fontSize: 12, color: '#6B7280', marginTop: 2 },
});
