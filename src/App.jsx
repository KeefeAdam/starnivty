import { useEffect, useState } from "react";
import HomePage from "./pages/HomePage";
import ProductStorePage from "./pages/ProductStorePage";
import RoomBookingPage from "./pages/RoomBookingPage";

function getPath() {
  return window.location.pathname.replace(/\/+$/, "") || "/";
}

export default function App() {
  const [path, setPath] = useState(getPath);

  useEffect(() => {
    function handlePopState() {
      setPath(getPath());
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  function navigate(nextPath) {
    window.history.pushState({}, "", nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (path === "/products") return <ProductStorePage onNavigate={navigate} />;
  if (path === "/booking") return <RoomBookingPage onNavigate={navigate} />;
  return <HomePage onNavigate={navigate} />;
}
