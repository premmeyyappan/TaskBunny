import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import tasksReducer    from './slices/tasks.slice';
import analyticsReducer from './slices/analytics.slice';
import syncReducer     from './slices/sync.slice';

export const store = configureStore({
  reducer: {
    tasks:     tasksReducer,
    analytics: analyticsReducer,
    sync:      syncReducer,
  },
});

export type RootState    = ReturnType<typeof store.getState>;
export type AppDispatch  = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
