import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { MotionConfig } from "framer-motion";
import { AppProviders } from "./app/providers";
import "./styles/globals.css";
import "@fontsource-variable/google-sans/wght.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <MotionConfig reducedMotion={import.meta.env.PROD ? "user" : "never"}>
      <AppProviders />
    </MotionConfig>
  </StrictMode>,
);
