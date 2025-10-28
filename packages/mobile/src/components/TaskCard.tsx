import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import type { Task } from '@taskbunny/shared';

interface Props {
  task: Task;
  onPress: (task: Task) => void;
}

const PRIORITY_COLOURS: Record<number, string> = {
  1: '#EF4444', 2: '#F59E0B', 3: '#3B82F6', 4: '#9CA3AF',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending', in_progress: 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
};

export function TaskCard({ task, onPress }: Props) {
  const isOverdue = task.dueAt && new Date(task.dueAt) < new Date() && task.status !== 'completed';

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(task)} activeOpacity={0.7}>
      <View style={[styles.priorityBar, { backgroundColor: PRIORITY_COLOURS[task.priority] ?? '#9CA3AF' }]} />
      <View style={styles.content}>
        <Text style={[styles.title, task.status === 'completed' && styles.done]}>{task.title}</Text>
        <View style={styles.meta}>
          <Text style={styles.status}>{STATUS_LABELS[task.status] ?? task.status}</Text>
          {task.storyPoints && <Text style={styles.points}>{task.storyPoints}pt</Text>}
          {isOverdue && <Text style={styles.overdue}>Overdue</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card:        { flexDirection: 'row', backgroundColor: '#FFF', borderRadius: 8, marginVertical: 4, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, overflow: 'hidden' },
  priorityBar: { width: 4 },
  content:     { flex: 1, padding: 12 },
  title:       { fontSize: 15, fontWeight: '500', color: '#111827' },
  done:        { textDecorationLine: 'line-through', color: '#9CA3AF' },
  meta:        { flexDirection: 'row', gap: 8, marginTop: 4 },
  status:      { fontSize: 12, color: '#6B7280' },
  points:      { fontSize: 12, color: '#4F46E5', fontWeight: '600' },
  overdue:     { fontSize: 12, color: '#EF4444', fontWeight: '600' },
});
