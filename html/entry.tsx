/**
 * Entry point of the standalone HTML build.
 *
 * It mounts the real application component (src/app/dashboard.tsx) — the same
 * React tree the Next.js app renders — so the markup of every page, drawer and
 * panel is identical to the app by construction. Data comes from
 * html/demo-data.js instead of the API routes.
 *
 * Built by `npm run build:html` into html/app.bundle.js.
 */
import { createRoot } from "react-dom/client";
import Dashboard from "@/app/dashboard";
import type { DashboardData } from "@/lib/dashboard-data";

declare global {
  interface Window {
    __UPP_DEMO__: DashboardData;
  }
}

const container = document.getElementById("root");
if (!container) throw new Error("The HTML shell is missing the #root container.");

// demo-data.js is plain JSON, exactly like the JSON round-trip in src/app/page.tsx.
createRoot(container).render(<Dashboard initialData={window.__UPP_DEMO__ as unknown as DashboardData} />);
