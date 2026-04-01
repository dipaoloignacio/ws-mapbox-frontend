import { WebSocketProvider } from "./context/WebSocketContext";
import { MapPage } from "./pages/MapPage";

function SocketMapApp() {
  return (
    <WebSocketProvider url={import.meta.env.VITE_WS_URL}>
      <MapPage />
    </WebSocketProvider>
  );
}

export default SocketMapApp;
