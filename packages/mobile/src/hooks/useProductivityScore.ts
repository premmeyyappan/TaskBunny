import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchScore, updateScoreFromWs } from '../store/slices/analytics.slice';
import { wsService } from '../services/websocket.service';

export function useProductivityScore() {
  const dispatch = useAppDispatch();
  const { score, loading, error } = useAppSelector((s) => s.analytics);

  useEffect(() => {
    dispatch(fetchScore());

    // Listen for real-time score pushes over WebSocket
    const unsubscribe = wsService.subscribe((event) => {
      if (event.type === 'score_updated') {
        dispatch(updateScoreFromWs(event.payload));
      }
    });

    return unsubscribe;
  }, [dispatch]);

  return { score, loading, error };
}
