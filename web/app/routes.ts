import { type RouteConfig } from "@react-router/dev/routes";
import { flatRoutes } from "@react-router/fs-routes";

// Preserve the Remix-style flat-routes file convention under app/routes/.
export default flatRoutes() satisfies RouteConfig;
