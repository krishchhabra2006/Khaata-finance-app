import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // During local dev, proxy API calls to the Express server on :8080
    proxy: {
      "/api": "http://localhost:8080",
    },
  },
});
