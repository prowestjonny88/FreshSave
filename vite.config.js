import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const host = process.env.FIGMA_DEV_SERVER_HOST || "0.0.0.0";
const port = Number.parseInt(process.env.PORT || "8443", 10);

export default defineConfig(({ mode }) => ({
  base: process.env.FIGMA_PUBLIC_URL ? `${process.env.FIGMA_PUBLIC_URL}/` : "/",
  build: {
    sourcemap: mode === "development" ? "inline" : false,
    minify: mode !== "development",
  },
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "src"),
    },
  },
  server: {
    host,
    port,
    strictPort: true,
    watch: {
      ignored: ["**/.figma/**"],
    },
  },
  preview: {
    host,
    port,
  },
}));
