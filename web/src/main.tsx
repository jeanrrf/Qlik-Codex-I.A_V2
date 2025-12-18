// web/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from 'virtual:pwa-register';
import App from "./App";
import "./styles.css";

// Registra o Service Worker para suporte offline e atualizações automáticas
registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
