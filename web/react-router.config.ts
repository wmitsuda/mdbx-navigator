import type { Config } from "@react-router/dev/config";

export default {
  // SPA mode: no server-side rendering. The Go binary serves the static
  // client build (web/build/client) and the REST API.
  ssr: false,
} satisfies Config;
