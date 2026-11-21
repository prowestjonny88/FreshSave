import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";
import { createAppRouter } from "./App.tsx";
import "./index.css";

document.title = "FreshSave – Track food expiry, rescue sealed surplus";
const root = createRoot(document.getElementById("root")!);
const mode = import.meta.env.VITE_FRESHSAVE_MODE || "demo";

async function start() {
  if (mode !== "demo" && mode !== "supabase")
    throw new Error("Set VITE_FRESHSAVE_MODE to demo or supabase.");
  const services =
    mode === "supabase"
      ? await (
          await import("./services/supabase.ts")
        ).createSupabaseServices(
          import.meta.env.VITE_SUPABASE_URL,
          import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        )
      : (await import("./services/demo.ts")).createDemoServices();
  root.render(<RouterProvider router={createAppRouter(services)} />);
}

start().catch((error: unknown) => {
  root.render(
    <main className="wrap py-8">
      <h1>Could not start FreshSave</h1>
      <p role="alert">{error instanceof Error ? error.message : "Check local configuration."}</p>
    </main>,
  );
});
