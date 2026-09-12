import { createRoot } from "react-dom/client";
import App from "./App";
import { MotionProvider } from "./components/motion-settings";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <MotionProvider>
    <App />
  </MotionProvider>,
);
import "./redesign.css";

import "./vignettes.css";
import "./experience.css";
