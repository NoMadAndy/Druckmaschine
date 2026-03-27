type MessageHandler = (data: unknown) => void;
type StatusHandler = (status: ConnectionStatus) => void;

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface WSMessage {
  type: string;
  payload: unknown;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Map<string, Set<MessageHandler>> = new Map();
  private statusHandlers: Set<StatusHandler> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _status: ConnectionStatus = 'disconnected';
  private shouldReconnect = true;

  constructor(url?: string) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let wsBase = import.meta.env.VITE_WS_URL;
    // Avoid mixed content: if page is HTTPS but env URL uses ws://, auto-detect instead
    if (wsBase && window.location.protocol === 'https:' && wsBase.startsWith('ws://')) {
      wsBase = '';
    }
    wsBase = wsBase || `${protocol}//${window.location.host}`;
    this.url = url || `${wsBase}/ws`;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  private setStatus(status: ConnectionStatus): void {
    this._status = status;
    this.statusHandlers.forEach((handler) => handler(status));
  }

  connect(token?: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.shouldReconnect = true;
    this.setStatus('connecting');

    const url = token ? `${this.url}?token=${token}` : this.url;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        const handlers = this.handlers.get(message.type);
        if (handlers) {
          handlers.forEach((handler) => handler(message.payload));
        }
        // Also notify wildcard listeners
        const wildcardHandlers = this.handlers.get('*');
        if (wildcardHandlers) {
          wildcardHandlers.forEach((handler) => handler(message));
        }
      } catch {
        // Non-JSON message
        const wildcardHandlers = this.handlers.get('*');
        if (wildcardHandlers) {
          wildcardHandlers.forEach((handler) => handler(event.data));
        }
      }
    };

    this.ws.onclose = () => {
      this.setStatus('disconnected');
      if (this.shouldReconnect) {
        this.scheduleReconnect(token);
      }
    };

    this.ws.onerror = () => {
      this.setStatus('error');
    };
  }

  private scheduleReconnect(token?: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect(token);
    }, Math.min(delay, 30000));
  }

  disconnect(): void {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  on(event: string, handler: MessageHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  onStatus(handler: StatusHandler): () => void {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }

  send(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }
}

export const wsClient = new WebSocketClient();
export default wsClient;
