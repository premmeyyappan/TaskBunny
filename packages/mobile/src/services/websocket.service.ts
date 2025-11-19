import { WS_BASE_URL } from '../config/api';

type SocketEvent =
  | { type: 'sync_complete'; payload: { applied: number; serverTimestamp: string } }
  | { type: 'score_updated'; payload: { score: number; computedAt: string } }
  | { type: 'task_updated'; payload: { taskId: string; status: string } }
  | { type: 'pong' }
  | { type: 'error'; message: string };

type MessageHandler = (event: SocketEvent) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: MessageHandler[] = [];
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string | null = null;

  connect(token: string): void {
    this.token = token;
    this.openSocket();
  }

  private openSocket(): void {
    if (!this.token) return;
    const url = `${WS_BASE_URL}?token=${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
      this.ws!.send(JSON.stringify({ type: 'subscribe_score' }));
    };

    this.ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as SocketEvent;
        this.handlers.forEach((h) => h(event));
      } catch { /* ignore malformed messages */ }
    };

    this.ws.onclose = () => {
      // Exponential backoff reconnect (simple: fixed 3s)
      this.reconnectTimer = setTimeout(() => this.openSocket(), 3000);
    };
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.push(handler);
    return () => { this.handlers = this.handlers.filter((h) => h !== handler); };
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export const wsService = new WebSocketService();
