import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import SocketMapApp from "./SocketMapApp.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SocketMapApp />
  </StrictMode>,
);
