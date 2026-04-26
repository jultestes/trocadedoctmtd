import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Registro explícito do Service Worker (push notifications + PWA).
// Em preview/iframe do Lovable, evitamos registrar para não cachear builds antigos.
if ("serviceWorker" in navigator) {
  const isInIframe = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();
  const host = window.location.hostname;
  const isPreviewHost =
    host.includes("id-preview--") || host.includes("lovableproject.com");

  if (isPreviewHost || isInIframe) {
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
  } else {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => console.log("[SW] registered:", reg.scope))
        .catch((err) => console.error("[SW] registration failed:", err));
    });
  }
}

createRoot(document.getElementById("root")!).render(<App />);
