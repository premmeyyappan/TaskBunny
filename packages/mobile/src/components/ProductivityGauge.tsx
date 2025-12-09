import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ProductivityScore } from '@taskbunny/shared';

interface Props {
  score: ProductivityScore;
}

const BAR_LABELS: Array<{ key: keyof ProductivityScore; label: string; weight: number }> = [
  { key: 'completionRate',   label: 'Completion',   weight: 35 },
  { key: 'velocityIndex',    label: 'Velocity',     weight: 25 },
  { key: 'focusDepth',       label: 'Focus',        weight: 20 },
  { key: 'consistencyScore', label: 'Consistency',  weight: 15 },
  { key: 'overdueRatio',     label: 'On-time',      weight: 5  },
];

export function ProductivityGauge({ score }: Props) {
  const colour =
    score.score >= 75 ? '#10B981' :
    score.score >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <View style={styles.container}>
      <Text style={[styles.score, { color: colour }]}>{score.score.toFixed(0)}</Text>
      <Text style={styles.label}>/ 100</Text>
      <View style={styles.bars}>
        {BAR_LABELS.map(({ key, label, weight }) => {
          const value = (score[key] as number) ?? 0;
          return (
            <View key={key} style={styles.row}>
              <Text style={styles.barLabel}>{label}</Text>
              <View style={styles.track}>
                <View style={[styles.fill, { width: `${value * 100}%`, backgroundColor: colour }]} />
              </View>
              <Text style={styles.barPct}>{(value * 100).toFixed(0)}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 20 },
  score:     { fontSize: 72, fontWeight: '700' },
  label:     { fontSize: 18, color: '#6B7280', marginTop: -8 },
  bars:      { width: '100%', marginTop: 24, gap: 10 },
  row:       { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel:  { width: 80, fontSize: 12, color: '#374151' },
  track:     { flex: 1, height: 8, backgroundColor: '#E5E7EB', borderRadius: 4, overflow: 'hidden' },
  fill:      { height: '100%', borderRadius: 4 },
  barPct:    { width: 36, fontSize: 12, color: '#6B7280', textAlign: 'right' },
});
