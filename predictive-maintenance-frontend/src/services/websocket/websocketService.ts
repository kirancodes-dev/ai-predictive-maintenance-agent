import { WS_BASE_URL, WEBSOCKET_RECONNECT_DELAY, WEBSOCKET_MAX_RETRIES } from '../../utils/constants';

type MessageHandler = (data: unknown) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private retryCount = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  connect(path: string): void {
    const token = localStorage.getItem('auth_token');
    const url = `${WS_BASE_URL}${path}${token ? `?token=${encodeURIComponent(token)}` : ''}`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      this.retryCount = 0;
    };

    this.socket.onmessage = event => {
      const parsed = JSON.parse(event.data as string) as { type: string; payload: unknown };
      const { type, payload } = parsed;
      this.handlers.get(type)?.forEach(handler => handler(payload));
    };

    this.socket.onclose = () => {
      this.scheduleReconnect(path);
    };

    this.socket.onerror = () => {
      this.socket?.close();
    };
  }

  private scheduleReconnect(path: string): void {
    if (this.retryCount >= WEBSOCKET_MAX_RETRIES) return;
    this.retryCount++;
    this.reconnectTimer = setTimeout(() => this.connect(path), WEBSOCKET_RECONNECT_DELAY);
  }

  on(type: string, handler: MessageHandler): void {
    if (!this.handlers.has(type)) this.handlers.set(type, []);
    this.handlers.get(type)!.push(handler);
  }

  off(type: string, handler: MessageHandler): void {
    const list = this.handlers.get(type);
    if (list) this.handlers.set(type, list.filter(h => h !== handler));
  }

  send(type: string, payload: unknown): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload }));
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.socket?.close();
    this.socket = null;
    this.handlers.clear();
  }

  get isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}

export const websocketService = new WebSocketService();
