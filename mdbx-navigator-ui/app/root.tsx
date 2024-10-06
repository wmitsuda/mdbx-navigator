import { Outlet, Scripts } from "@remix-run/react";
import "./tailwind.css";
import "@fontsource/fira-mono";

export function HydrateFallback() {
  return (
    <>
      <p>Loading...</p>
      <Scripts />
    </>
  );
}

export default function Component() {
  return (
    <>
      <Outlet />
      <Scripts />
    </>
  );
}
