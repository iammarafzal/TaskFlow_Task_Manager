import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from '../hooks/useToast';

interface WebSocketContextType {
  socket: WebSocket | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({
  socket: null,
  isConnected: false,
});

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { token, isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<any>(null);
  const reconnectDelayRef = useRef(1000); // Initial backoff delay (1 second)
  const { toast } = useToast();

  const connect = () => {
    if (!isAuthenticated || !token) return;

    // Failsafe: close any stale socket handles before establishing connection
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const wsUrl = `ws://localhost:8000/ws/notifications?token=${token}`;
    console.log('[WS Engine] Establishing secure WebSocket connection tunnel...');
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log('[WS Engine] WebSocket tunnel successfully online.');
      setIsConnected(true);
      reconnectDelayRef.current = 1000; // Reset backoff delay on successful connection
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === 'NOTIFICATION_RECEIVED') {
          // 1. Trigger local user UI warning toast
          toast({
            title: payload.data?.title || 'System Warning Alert',
            description: payload.data?.message || 'A task requires immediate attention.',
            type: 'default',
          });

          console.log('[WS Engine] Warning payload parsed. Dispatching obsidian_flow_refresh trigger event.');

          // 2. Dispatch global event to sync components (supports CustomEvent and Event formats)
          window.dispatchEvent(new CustomEvent('obsidian_flow_refresh', { detail: payload.data }));
          window.dispatchEvent(new Event('obsidian_flow_refresh'));
        }
      } catch (err) {
        console.error('[WS Engine] Parse failed on incoming frame:', err);
      }
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      socketRef.current = null;

      // Avoid triggering reconnect timers on clean closures (e.g. logout)
      if (event.code === 1000 || event.code === 1005) {
        console.log('[WS Engine] Socket closed cleanly by client termination.');
        return;
      }

      console.warn(`[WS Engine] Connection closed unexpectedly (code: ${event.code}). Attempting recovery...`);
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error('[WS Engine] Connection error:', err);
      ws.close();
    };
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);

    const delay = reconnectDelayRef.current;
    console.log(`[WS Engine] Reconnecting in ${delay}ms...`);

    reconnectTimeoutRef.current = setTimeout(() => {
      connect();
    }, delay);

    // Exponentially scale reconnect delays up to a max of 30 seconds
    reconnectDelayRef.current = Math.min(delay * 2, 30000);
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    } else {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      reconnectDelayRef.current = 1000;
    }

    return () => {
      if (socketRef.current) socketRef.current.close();
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    };
  }, [isAuthenticated, token]);

  return (
    <WebSocketContext.Provider value={{ socket: socketRef.current, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export const useWebSocket = () => useContext(WebSocketContext);
export const useSocket = useWebSocket; // Drop-in compatibility alias
