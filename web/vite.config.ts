import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter()],
  // Vite 8 resolves the `~/*` tsconfig path alias natively.
  resolve: {
    tsconfigPaths: true,
  },
});
