import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

// Lazy-load the SPA shell so initial JS is small (code-splitting per route happens inside).
const LegacyApp = lazy(() => import("@/legacy-app"));

export const Route = createFileRoute("/$")({
  ssr: false,
  component: SplatRoute,
});

function SplatRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[hsl(var(--paper))]" />}>
      <LegacyApp />
    </Suspense>
  );
}
