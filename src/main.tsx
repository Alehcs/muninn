import React from "react";
import ReactDOM from "react-dom/client";
import App from "@/app/App";
import { initTheme } from "@/features/theme/useTimeTheme";
import "@/styles/index.css";

// Antes del primer render: evita el parpadeo con el tema por defecto.
initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
