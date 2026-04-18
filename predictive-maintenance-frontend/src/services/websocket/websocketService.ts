type MessageHandler = (type: string, payload: unknown) => void;

interface ConnectionEntry {
  ws: WebSocket;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  refCount: number;
}

class WebSocketService {
  private connections = new Map<string, ConnectionEntry>();
  private handlers: Set<MessageHandler> = new Set();

  get isConnected() {
    for (const entry of this.connections.values()) {
      if (entry.ws.readyState === WebSocket.OPEN) return true;
    }
    return false;
  }

  connect(path: string) {
    const existing = this.connections.get(path);
    if (existing) {
      existing.refCount++;
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) return;

    const base = (typeof window !== 'undefined' && window.__WS_URL__) || import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const url = `${base}${path}?token=${token}`;

    const ws = new WebSocket(url);
    const entry: ConnectionEntry = { ws, reconnectTimer: null, refCount: 1 };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this.handlers.forEach((h) => h(msg.type, msg.payload));
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      // Auto-reconnect after 3 seconds if still referenced
      if (this.connections.has(path)) {
        entry.reconnectTimer = setTimeout(() => {
          this.connections.delete(path);
          const refCount = entry.refCount;
          this._createConnection(path);
          const newEntry = this.connections.get(path);
          if (newEntry) newEntry.refCount = refCount;
        }, 3000);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    this.connections.set(path, entry);
  }

  private _createConnection(path: string) {
    const token = localStorage.getItem('access_token');
    if (!token) return;
    const base = (typeof window !== 'undefined' && window.__WS_URL__) || import.meta.env.VITE_WS_URL || 'ws://localhost:8000';
    const url = `${base}${path}?token=${token}`;
    const ws = new WebSocket(url);
    const entry: ConnectionEntry = { ws, reconnectTimer: null, refCount: 1 };

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        this.handlers.forEach((h) => h(msg.type, msg.payload));
      } catch { /* ignore */ }
    };

    ws.onclose = () => {
      if (this.connections.has(path)) {
        entry.reconnectTimer = setTimeout(() => {
          this.connections.delete(path);
          const refCount = entry.refCount;
          this._createConnection(path);
          const newEntry = this.connections.get(path);
          if (newEntry) newEntry.refCount = refCount;
        }, 3000);
      }
    };

    ws.onerror = () => ws.close();
    this.connections.set(path, entry);
  }

  disconnect(path?: string) {
    if (path) {
      const entry = this.connections.get(path);
      if (entry) {
        entry.refCount--;
        if (entry.refCount <= 0) {
          if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
          entry.ws.close();
          this.connections.delete(path);
        }
      }
    } else {
      // Disconnect all
      for (const [p, entry] of this.connections) {
        if (entry.reconnectTimer) clearTimeout(entry.reconnectTimer);
        entry.ws.close();
        this.connections.delete(p);
      }
    }
  }

  on(handler: MessageHandler) {
    this.handlers.add(handler);
  }

  off(handler: MessageHandler) {
    this.handlers.delete(handler);
  }

  send(data: unknown, path?: string) {
    if (path) {
      const entry = this.connections.get(path);
      if (entry && entry.ws.readyState === WebSocket.OPEN) {
        entry.ws.send(JSON.stringify(data));
      }
    } else {
      // Send to first open connection
      for (const entry of this.connections.values()) {
        if (entry.ws.readyState === WebSocket.OPEN) {
          entry.ws.send(JSON.stringify(data));
          break;
        }
      }
    }
  }
}

export const websocketService = new WebSocketService();
