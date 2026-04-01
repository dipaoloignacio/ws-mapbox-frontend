
import { WebSocketProvider } from "./context/WebSocketContext";
import { MapPage } from "./pages/MapPage";

function SocketMapApp() {
  return (
    <WebSocketProvider url="ws://localhost:3200">

      <MapPage />
    </WebSocketProvider>
  );
}

export default SocketMapApp;
