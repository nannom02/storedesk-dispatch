import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import { registerPrototypeVisit } from "./prototypeVisitTracker";

import "./styles/tokens.css";
import "./styles/app.css";
import "./shared/theme-guidance-callout.css";
import "./out/safedesk-master/service-introduction.css";
import "./out/safedesk-master/proposal-explanation.css";
import "./shared/scheduling-calendar.css";
import "./styles/service-introduction-overrides.css";
import "./styles/master-typography.css";

void registerPrototypeVisit();

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
