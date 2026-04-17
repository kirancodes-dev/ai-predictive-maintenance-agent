import { createContext, useContext, useEffect, useRef, ReactNode } from 'react';
import { websocketService } from '../services/websocket/websocketService';

interface WebSocketContextValue {
  isConnected: boolean;
  on: typeof websocketService.on;
  off: typeof websocketService.off;
  send: typeof websocketService.send;
}

const WebSocketContext = createContext<WebSocketContextValue | undefined>(undefined);

export const WebSocketProvider = ({
  children,
  path,
}: {
  children: ReactNode;
  path: string;
}) => {
  const connectedRef = useRef(false);

  useEffect(() => {
    websocketService.connect(path);
    connectedRef.current = true;
    return () => {
      websocketService.disconnect();
      connectedRef.current = false;
    };
  }, [path]);

  return (
    <WebSocketContext.Provider
      value={{
        isConnected: websocketService.isConnected,
        on: websocketService.on.bind(websocketService),
        off: websocketService.off.bind(websocketService),
        send: websocketService.send.bind(websocketService),
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocketContext = (): WebSocketContextValue => {
  const ctx = useContext(WebSocketContext);
  if (!ctx) throw new Error('useWebSocketContext must be used within WebSocketProvider');
  return ctx;
};
