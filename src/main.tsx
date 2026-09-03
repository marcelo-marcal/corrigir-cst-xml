import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import "./frontend/styles/professionalLayout.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);