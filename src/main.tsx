import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
import { AuthProvider } from "./auth-context";
import { PreferencesProvider } from "./preferences-context";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider><PreferencesProvider><App /></PreferencesProvider></AuthProvider>
  </StrictMode>,
);
