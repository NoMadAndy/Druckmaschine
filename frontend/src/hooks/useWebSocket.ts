import { useEffect, useRef, useState, useCallback } from 'react';
import { wsClient, ConnectionStatus } from '@/lib/websocket';
import { useAuthStore } from '@/stores/authStore';

export function useWebSocket() {
  const [status, setStatus] = useState<ConnectionStatus>(wsClient.status);
  const token = useAuthStore((s) => s.token);

  useEffect(() => {
    const unsub = wsClient.onStatus(setStatus);
    if (token) {
      wsClient.connect(token);
    }
    return () => {
      unsub();
    };
  }, [token]);

  const subscribe = useCallback((event: string, handler: (data: unknown) => void) => {
    return wsClient.on(event, handler);
  }, []);

  const send = useCallback((type: string, payload: unknown) => {
    wsClient.send(type, payload);
  }, []);

  return { status, subscribe, send };
}

export function useWSEvent<T = unknown>(event: string, handler: (data: T) => void) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const unsub = wsClient.on(event, (data) => {
      handlerRef.current(data as T);
    });
    return unsub;
  }, [event]);
}
