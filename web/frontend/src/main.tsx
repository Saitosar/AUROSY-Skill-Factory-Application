import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "sonner";
import "./i18n/config";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { BackendStatusProvider } from "./context/BackendStatus";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <BackendStatusProvider>
          <App />
          <Toaster theme="dark" position="top-right" richColors closeButton />
        </BackendStatusProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
