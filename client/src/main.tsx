import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Restore theme from localStorage (default to dark when not set)
const savedTheme = localStorage.getItem("theme");
const shouldUseDark = savedTheme ? savedTheme === "dark" : true;
document.documentElement.classList.toggle("dark", shouldUseDark);

createRoot(document.getElementById("root")!).render(<App />);
