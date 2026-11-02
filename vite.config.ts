import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: { host: "0.0.0.0", port: 4173, proxy: { "/api/auth": "http://127.0.0.1:3100", "/login-assets": "http://127.0.0.1:3100", "/login": "http://127.0.0.1:3100" } },
  preview: { host: "0.0.0.0", port: 4173 },
});
