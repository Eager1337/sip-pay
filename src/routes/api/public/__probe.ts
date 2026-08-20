import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/__probe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json();
        const apiKey = process.env.MONIME_API_KEY!;
        const spaceId = process.env.MONIME_SPACE_ID!;
        const r = await fetch(`https://api.monime.io${body.path}`, {
          method: body.method ?? "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": String(Date.now()),
            "Monime-Space-Id": spaceId,
            "Monime-Version": "caph.2025-08-23",
          },
          ...(body.body ? { body: JSON.stringify(body.body) } : {}),
        });
        return new Response(JSON.stringify({ status: r.status, text: await r.text() }), {
          headers: { "content-type": "application/json" },
        });
      },
    },
  },
});
