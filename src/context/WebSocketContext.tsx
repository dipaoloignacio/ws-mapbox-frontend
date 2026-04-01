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
  const shouldReconnectRef = useRef(false);

  // Guardamos name/color/coords para reconexión
  const credentialsRef = useRef<{ name: string; color: string; latLng: LatLng } | null>(null);

  const disconnect = () => {
    shouldReconnectRef.current = false;
    socket.current?.close();
    socket.current = null;
    setStatus("offline");
  };

  const connect = useCallback((name: string, color: string, latLng: LatLng) => {
    if (connecting) return;
    connecting = true;
    setStatus("connecting");

    const params = new URLSearchParams({
      name,
      color,
      coords: JSON.stringify(latLng),
    });

    const ws = new WebSocket(`${url}?${params.toString()}`);

    ws.addEventListener("open", () => {
      socket.current = ws;
      connecting = false;
      setStatus("connected");
    });

    ws.addEventListener("close", () => {
      socket.current = null;
      connecting = false;
      setStatus("disconnected");
    });

    ws.addEventListener("error", (event) => {
      console.log({ customError: event });
      connecting = false;
    });

    ws.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === "WELCOME") {
          setSocketId(message.payload.clientId);
        }
        messageListenersRef.forEach((listener) => listener(message));
      } catch (error) {}
    });

    return ws;
  }, [url]);

  const connectToServer = (name: string, color: string, latLng: LatLng) => {
    if (status === "connecting" || status === "connected") return;
    Cookie.set("name", name);
    Cookie.set("color", color);
    Cookie.set("coords", JSON.stringify(latLng));
    credentialsRef.current = { name, color, latLng };
    shouldReconnectRef.current = true;
    connect(name, color, latLng);
  };

  const suscribeToMessage = (listener: SocketMessageListener) => {
    messageListenersRef.add(listener);
    return () => {
      messageListenersRef.delete(listener);
    };
  };

  // Reconexión automática
  useEffect(() => {
    if (!shouldReconnectRef.current) return;
    if (status !== "disconnected") return;
    if (!credentialsRef.current) return;

    let interval: ReturnType<typeof setInterval>;
    interval = setInterval(() => {
      console.log("Reconnecting every 1 second...");
      const { name, color, latLng } = credentialsRef.current!;
      connect(name, color, latLng);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, connect]);

  const send = (message: SocketMessage) => {
    if (!socket.current) throw new Error("Socket not connected");
    socket.current.send(JSON.stringify(message));
  };

  return (
    <WebSocketContext
      value={{
        status,
        send,
        connectToServer,
        disconnect,
        socketId,
        suscribeToMessage,
      }}
    >
      {children}
    </WebSocketContext>
  );
};