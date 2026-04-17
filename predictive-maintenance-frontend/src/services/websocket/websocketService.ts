type MessageHandler = (type: string, payload: unknown) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private currentPath = '';

  get isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  connect(path: string) {
    this.currentPath = path;
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const base = import.meta.env.VITE_WS_URL ?? 'ws://localhost:8000';
    const url = `${base}${path}?token=${token}`;

    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(url);

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this.handlers.forEach((h) => h(msg.type, msg.payload));
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      // Auto-reconnect after 3 seconds
      this.reconnectTimer = setTimeout(() => this.connect(this.currentPath), 3000);
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }

  on(handler: MessageHandler) {
    this.handlers.add(handler);
  }

  off(handler: MessageHandler) {
    this.handlers.delete(handler);
  }

  send(data: unknown) {
    if (this.isConnected) {
      this.ws?.send(JSON.stringify(data));
    }
  }
}

export const websocketService = new WebSocketService();
