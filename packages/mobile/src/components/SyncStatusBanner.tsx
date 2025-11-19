import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSync } from '../hooks/useSync';

export function SyncStatusBanner() {
  const { status, pendingCount, lastSyncedAt, manualSync } = useSync();

  if (status === 'idle' && pendingCount === 0) return null;

  const label =
    status === 'syncing'  ? 'Syncing…' :
    status === 'offline'  ? `Offline — ${pendingCount} events queued` :
    status === 'error'    ? 'Sync failed — tap to retry' :
    `${pendingCount} events pending`;

  return (
    <TouchableOpacity style={[styles.banner, styles[status]]} onPress={manualSync}>
      <Text style={styles.text}>{label}</Text>
      {lastSyncedAt && status === 'idle' && (
        <Text style={styles.sub}>
          Last synced {new Date(lastSyncedAt).toLocaleTimeString()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner:  { paddingHorizontal: 16, paddingVertical: 8, alignItems: 'center' },
  syncing: { backgroundColor: '#4F46E5' },
  offline: { backgroundColor: '#6B7280' },
  error:   { backgroundColor: '#EF4444' },
  idle:    { backgroundColor: '#10B981' },
  text:    { color: '#FFF', fontWeight: '600', fontSize: 13 },
  sub:     { color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 2 },
});
