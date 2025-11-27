import { useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppDispatch, useAppSelector } from '../store';
import { triggerSync, setStatus } from '../store/slices/sync.slice';
import { useNetworkStatus } from './useNetworkStatus';

export function useSync() {
  const dispatch    = useAppDispatch();
  const syncState   = useAppSelector((s) => s.sync);
  const { isOnline } = useNetworkStatus();

  // Trigger sync whenever the app comes online
  useEffect(() => {
    if (!isOnline) {
      dispatch(setStatus('offline'));
      return;
    }
    AsyncStorage.getItem('@taskbunny/device_id').then((deviceId) => {
      if (deviceId) dispatch(triggerSync(deviceId));
    });
  }, [isOnline, dispatch]);

  const manualSync = useCallback(() => {
    AsyncStorage.getItem('@taskbunny/device_id').then((deviceId) => {
      if (deviceId) dispatch(triggerSync(deviceId));
    });
  }, [dispatch]);

  return { ...syncState, isOnline, manualSync };
}
