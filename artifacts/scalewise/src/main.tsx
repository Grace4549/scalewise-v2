import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// Tell the API client where the backend lives
setBaseUrl(import.meta.env.VITE_API_URL ?? null);

createRoot(document.getElementById("root")!).render(<App />);