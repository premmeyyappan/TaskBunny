import React, { useEffect } from 'react';
import { View, FlatList, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchTasks } from '../store/slices/tasks.slice';
import { TaskCard } from '../components/TaskCard';
import type { Task } from '@taskbunny/shared';

export function TaskListScreen() {
  const dispatch = useAppDispatch();
  const { items, loading } = useAppSelector((s) => s.tasks);
  const navigation = useNavigation<any>();

  useEffect(() => { dispatch(fetchTasks()); }, [dispatch]);

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        renderItem={({ item }) => (
          <TaskCard task={item} onPress={(t) => navigation.navigate('TaskDetail', { taskId: t.id })} />
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No tasks yet</Text>
            </View>
          )
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('TaskDetail', { taskId: null })}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F9FAFB' },
  list:       { padding: 16, paddingBottom: 80 },
  empty:      { alignItems: 'center', marginTop: 80 },
  emptyText:  { color: '#9CA3AF', fontSize: 16 },
  fab:        { position: 'absolute', right: 24, bottom: 32, width: 56, height: 56, borderRadius: 28, backgroundColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', elevation: 4 },
  fabText:    { color: '#FFF', fontSize: 28, lineHeight: 32 },
});
