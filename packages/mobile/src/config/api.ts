// In production, override with your deployed server URL
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
export const WS_BASE_URL  = process.env.EXPO_PUBLIC_WS_URL  ?? 'ws://localhost:3000/ws';
