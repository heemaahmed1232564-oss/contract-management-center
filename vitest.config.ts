import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    env: {
      DATABASE_URL: "postgresql://test@127.0.0.1:5432/test",
    },
    include: ["src/**/*.test.ts"],
    coverage: { reporter: ["text", "json", "html"] },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
