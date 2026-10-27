import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import OrderStatus from "./OrderStatus.jsx";
import "./App.css";

const isOrderStatus = window.location.pathname === "/order-status";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isOrderStatus ? <OrderStatus /> : <App />}
  </React.StrictMode>
);
