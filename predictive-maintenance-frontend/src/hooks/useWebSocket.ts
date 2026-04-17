import { useEffect, useRef } from 'react';
import { websocketService } from '../services/websocket/websocketService';

interface UseWebSocketOptions {
  path: string;
  onMessage?: (type: string, payload: unknown) => void;
}

export const useWebSocket = ({ path, onMessage }: UseWebSocketOptions) => {
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    websocketService.connect(path);
    const handler = (type: string, payload: unknown) => {
      onMessageRef.current?.(type, payload);
    };
    websocketService.on(handler);
    return () => {
      websocketService.off(handler);
      websocketService.disconnect(path);
    };
  }, [path]);

  return {
    isConnected: websocketService.isConnected,
    send: (data: unknown) => websocketService.send(data, path),
  };
};
