import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export function useNetworkStatus(): { isOnline: boolean; isConnected: boolean | null } {
  const [state, setState] = useState<NetInfoState | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(setState);
    NetInfo.fetch().then(setState);
    return unsubscribe;
  }, []);

  return {
    isOnline:    state?.isConnected === true && state?.isInternetReachable === true,
    isConnected: state?.isConnected ?? null,
  };
}
