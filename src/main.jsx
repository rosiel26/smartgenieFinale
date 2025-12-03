import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { DBStatusProvider } from "./utils/DBStatusContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DBStatusProvider>
      <App />
    </DBStatusProvider>
  </React.StrictMode>
);
