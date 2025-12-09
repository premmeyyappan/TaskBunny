import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { fetchTrend } from '../store/slices/analytics.slice';

export function useTimeSeries(windowDays: number = 30) {
  const dispatch = useAppDispatch();
  const trend    = useAppSelector((s) => s.analytics.trend);

  useEffect(() => {
    dispatch(fetchTrend(windowDays));
  }, [dispatch, windowDays]);

  return trend;
}
