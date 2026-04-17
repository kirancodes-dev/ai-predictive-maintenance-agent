import { useEffect, useRef, useState } from 'react';
import { websocketService } from '../services/websocket/websocketService';

interface UseWebSocketOptions {
  path: string;
  onMessage?: (type: string, payload: unknown) => void;
}

export const useWebSocket = ({ path, onMessage }: UseWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    websocketService.connect(path);
    setIsConnected(websocketService.isConnected);

    return () => {
      websocketService.disconnect();
      setIsConnected(false);
    };
  }, [path]);

  return {
    isConnected,
    send: websocketService.send.bind(websocketService),
    on: websocketService.on.bind(websocketService),
    off: websocketService.off.bind(websocketService),
  };
};
