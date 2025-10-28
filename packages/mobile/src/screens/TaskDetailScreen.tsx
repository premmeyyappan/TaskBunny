import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '../store';
import { createTask, updateTask } from '../store/slices/tasks.slice';
import { queueAndSync } from '../store/slices/sync.slice';
import { makeEvent } from '../utils/eventFactory';
import { getLocalVectorClock } from '../services/sync.service';
import { EventType } from '@taskbunny/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function TaskDetailScreen() {
  const { params } = useRoute<any>();
  const navigation = useNavigation();
  const dispatch   = useAppDispatch();
  const task       = useAppSelector((s) => s.tasks.items.find((t) => t.id === params?.taskId));

  const [title, setTitle]   = useState(task?.title ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const [deviceId, vc] = await Promise.all([
      AsyncStorage.getItem('@taskbunny/device_id').then((d) => d ?? 'unknown'),
      getLocalVectorClock(),
    ]);
    const userId = (await AsyncStorage.getItem('@taskbunny/user_id')) ?? '';

    if (task) {
      await dispatch(updateTask({ id: task.id, input: { title, vectorClock: vc } }));
      const event = makeEvent(userId, deviceId, EventType.TASK_RESUMED, vc, { taskId: task.id });
      dispatch(queueAndSync({ events: [event], deviceId }));
    } else {
      const created = await dispatch(createTask({ title })).unwrap();
      const event = makeEvent(userId, deviceId, EventType.TASK_STARTED, vc, { taskId: created.id });
      dispatch(queueAndSync({ events: [event], deviceId }));
    }

    setSaving(false);
    navigation.goBack();
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Task title"
        autoFocus
      />
      <TouchableOpacity style={[styles.btn, saving && styles.btnDisabled]} onPress={save} disabled={saving}>
        <Text style={styles.btnText}>{saving ? 'Saving…' : task ? 'Save Changes' : 'Create Task'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F9FAFB' },
  content:    { padding: 24 },
  label:      { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  input:      { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#D1D5DB', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 24 },
  btn:        { backgroundColor: '#4F46E5', borderRadius: 8, paddingVertical: 14, alignItems: 'center' },
  btnDisabled: { opacity: 0.6 },
  btnText:    { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
