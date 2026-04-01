import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Client, LatLng } from "../types";
import Cookie from "js-cookie";

type ConnectionStatus =
  | "offline"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

// Tipados específicos
export type SocketMessage =
  | {
      type: "CLIENT_REGISTER";
      payload: { name: string; color: string; coords: LatLng };
    }
  | {
      type: "CLIENT_MOVE";
      payload: { clientId: string; coords: LatLng };
    }
  | { type: "GET_CLIENT" };

export type SocketResponse =
  | { type: "ERROR"; payload: { message: string } }
  | { type: "WELCOME"; payload: Client }
  | { type: "CLIENT_STATE"; payload: Client[] }
  | { type: "CLIENT_JOINED"; payload: Client }
  | { type: "CLIENT_MOVED"; payload: Client }
  | { type: "CLIENT_LEFT"; payload: { clientId: string } };

export type SocketMessageListener = (message: SocketResponse) => void;

interface WebSocketContextState {
  status: ConnectionStatus;
  socketId: string | null;
  connectToServer: (name: string, color: string, latlng: LatLng) => void;
  disconnect: () => void;
  send: (message: SocketMessage) => void;
  suscribeToMessage: (listener: SocketMessageListener) => () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const WebSocketContext = createContext({} as WebSocketContextState);
const messageListenersRef = new Set<SocketMessageListener>();

let connecting = false;

interface Props {
  children: ReactNode;
  url: string;
}

export const WebSocketProvider = ({ children, url }: Props) => {
  const [status, setStatus] = useState<ConnectionStatus>("offline");
  const [socketId, setSocketId] = useState<string | null>(null);
  const socket = useRef<WebSocket | null>(null);

  const shouldReconnectRef = useRef(true);
  const disconnect = () => {
    socket.current?.close();
    socket.current = null;
    shouldReconnectRef.current = false;
    setStatus("offline");
  };

  const connect = useCallback(() => {
    if (connecting) return;
    connecting = true;
    setStatus("connecting");
    const ws = new WebSocket(url);
    shouldReconnectRef.current = true;

    ws.addEventListener("open", () => {
      socket.current = ws;
      setStatus("connected");
    });

    ws.addEventListener("close", () => {
      socket.current = null;
      setStatus("disconnected");
    });

    ws.addEventListener("error", (event) => {
      console.log({ customError: event });
    });

    ws.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "WELCOME") {
          setSocketId(message.payload.clientId);
        }
        messageListenersRef.forEach((listener) => listener(message));
        console.log({ message });
      } catch (error) {}
    });

    return ws;
  }, [url]);

  const connectToServer = (name: string, color: string, latLng: LatLng) => {
    if (status === "connecting" || status === "connected") return;
    Cookie.set("name", name);
    Cookie.set("color", color);
    Cookie.set("coords", JSON.stringify(latLng));
    connect();
  };

  const suscribeToMessage = (listener: SocketMessageListener) => {
    messageListenersRef.add(listener);

    return () => {
      messageListenersRef.delete(listener);
    };
  };
  // Función básica de re-conexión
  useEffect(() => {
    if (!shouldReconnectRef.current) return;

    let interval: ReturnType<typeof setInterval>;
    if (status === "disconnected") {
      interval = setInterval(() => {
        console.log("Reconnecting every 1 second...");
        connect();
      }, 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [status, connect]);

  const send = (message: SocketMessage) => {
    if (!socket.current) throw new Error("Socket not connected");

    const jsonMessage = JSON.stringify(message);
    socket.current?.send(jsonMessage);
  };

  return (
    <WebSocketContext
      value={{
        status: status,
        send: send,
        connectToServer: connectToServer,
        disconnect: disconnect,
        socketId: socketId,
        suscribeToMessage,
      }}
    >
      {children}
    </WebSocketContext>
  );
};
