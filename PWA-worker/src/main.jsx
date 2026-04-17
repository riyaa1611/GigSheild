import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import AppErrorBoundary from "./components/AppErrorBoundary";
import { preloadRiskData } from "./lib/riskEngine";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>
);

preloadRiskData(); // warms the 327 KB data cache immediately — no await needed
