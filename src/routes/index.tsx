import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const LegacyApp = lazy(() => import("@/legacy-app"));

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "KK Drinks Sierra Leone — Refreshment for the Nation" },
      {
        name: "description",
        content:
          "Locally crafted soft drinks, sodas, pineapple yogurt and pure water — bottled in Freetown, sold across Sierra Leone. Every bottle Le 10.",
      },
      { property: "og:title", content: "KK Drinks Sierra Leone" },
      {
        property: "og:description",
        content: "Taste Sierra Leone in every sip. Order online today.",
      },
    ],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[hsl(var(--paper))]" />}>
      <LegacyApp />
    </Suspense>
  );
}
