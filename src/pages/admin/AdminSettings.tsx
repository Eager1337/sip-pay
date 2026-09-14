// /admin/settings — integration config status (no secret values shown).
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { getAdminSettings } from "@/lib/admin-extras.functions";
import { AdminShell, Card, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";
import { Check, X, KeyRound } from "lucide-react";

type Resp = Awaited<ReturnType<typeof getAdminSettings>>;

const PORTAL_LINKS = [
  { label: "Supabase (URL, service role, publishable keys)", url: "https://supabase.com/dashboard/project/iuoqdjvnmxkclhwgmwxc/settings/api" },
  { label: "Monime API key & Space ID", url: "https://monime.com" },
  { label: "Vercel environment variables (for deployment)", url: "https://vercel.com/dashboard" },
];

export default function AdminSettings() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const fn = useServerFn(getAdminSettings);
  const [data, setData] = useState<Resp | null>(null);

  const load = useCallback(async () => {
    if (!passcode) return;
    try { setData(await fn({ data: { passcode } })); }
    catch (e) { onError(e); }
  }, [fn, passcode, onError]);

  useEffect(() => { void load(); }, [load]);

  if (!passcode) return null;

  const rows: Array<[string, boolean | undefined, string]> = [
    ["Admin passcode", data?.passcodeUsesDefault, data?.passcodeUsesDefault ? "Using built-in default (Eagerbeaver123)" : "Custom passcode configured"],
    ["Supabase URL", data?.supabaseUrl, "Required for all DB access"],
    ["Supabase service role key", data?.supabaseServiceRole, "Required for admin/order writes"],
    ["Supabase publishable key", data?.supabasePublishable, "Required for client + SSR reads"],
    ["Monime API key", data?.monimeApiKey, "Required for online checkout payments"],
    ["Monime Space ID", data?.monimeSpaceId, "Required for online checkout payments"],
    ["Monime webhook secret", data?.monimeWebhookSecret, "Required to verify payment callbacks"],
    ["Resend API key (email)", data?.resendApiKey, "Optional — transactional emails"],
  ];

  return (
    <AdminShell title="Settings" subtitle="Integration & deployment status">
      <Helmet><title>Settings — KK Admin</title><meta name="robots" content="noindex" /></Helmet>

      <Card title="Passcode">
        <div className="flex items-center gap-2 text-sm">
          <KeyRound className="h-4 w-4 text-[hsl(var(--wood))]" />
          <span>Admin access uses a shared passcode, checked server-side on every request.</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {data?.passcodeUsesDefault
            ? "Using the built-in default passcode (Eagerbeaver123). It works on every deploy including Vercel without any configuration. Set the ADMIN_PASSCODE environment variable to override it."
            : "A custom ADMIN_PASSCODE is configured via environment. The dashboard works on any deploy that has the same variable set (e.g. Vercel project settings)."}
        </p>
      </Card>

      <div className="mt-4">
        <Card title="Integrations">
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([label, ok, hint]) => (
                <tr key={label} className="border-b last:border-0">
                  <td className="py-2.5 font-medium">{label}</td>
                  <td className="py-2.5 text-center">
                    {ok === undefined ? <span className="text-muted-foreground">—</span>
                      : ok ? <Check className="inline h-4 w-4 text-[hsl(var(--leaf))]" />
                      : <X className="inline h-4 w-4 text-red-500" />}
                  </td>
                  <td className="py-2.5 text-xs text-muted-foreground">{hint}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      <div className="mt-4">
        <Card title="Where to configure (for Vercel / GitHub deployment)">
          <ul className="space-y-2 text-sm">
            {PORTAL_LINKS.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-[hsl(var(--sea))] hover:underline">{l.label}</a>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground mt-3">
            On Vercel, add these as environment variables in Project → Settings → Environment Variables so the
            serverless functions (Supabase service role, Monime keys, optional ADMIN_PASSCODE) are present at runtime.
          </p>
        </Card>
      </div>
    </AdminShell>
  );
}
