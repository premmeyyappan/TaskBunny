import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { VictoryLine, VictoryChart, VictoryAxis, VictoryTheme } from 'victory-native';
import type { TimeSeriesBucket } from '@taskbunny/shared';

interface Props {
  data: TimeSeriesBucket[];
  windowDays?: number;
}

export function TrendChart({ data, windowDays = 30 }: Props) {
  if (data.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No trend data yet</Text>
      </View>
    );
  }

  const chartData = data.map((d, i) => ({ x: i, y: Number(d.score) }));
  const width = Dimensions.get('window').width - 32;

  return (
    <View>
      <Text style={styles.title}>{windowDays}-Day Productivity Trend</Text>
      <VictoryChart
        theme={VictoryTheme.material}
        width={width}
        height={200}
        padding={{ top: 20, bottom: 40, left: 50, right: 20 }}
      >
        <VictoryAxis
          tickFormat={(t: number) => {
            const bucket = data[t];
            return bucket ? new Date(bucket.bucket).toLocaleDateString('en', { month: 'short', day: 'numeric' }) : '';
          }}
          tickCount={5}
          style={{ tickLabels: { fontSize: 10, angle: -30 } }}
        />
        <VictoryAxis
          dependentAxis
          domain={[0, 100]}
          tickFormat={(t: number) => `${t}`}
          style={{ tickLabels: { fontSize: 10 } }}
        />
        <VictoryLine
          data={chartData}
          style={{ data: { stroke: '#4F46E5', strokeWidth: 2 } }}
          interpolation="monotoneX"
        />
      </VictoryChart>
    </View>
  );
}

const styles = StyleSheet.create({
  title:     { fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 },
  empty:     { height: 200, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#9CA3AF' },
});
