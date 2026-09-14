// Daily trends chart card — last 14 days of revenue + order counts.
// Uses recharts (already a dep). Reads via the admin-passcoded server fn.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getDailyTrends } from "@/lib/admin-extras.functions";
import { useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";

type Day = { date: string; revenue: number; orders: number };

const fmt = (s: string) =>
  new Date(`${s}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export default function AdminTrends() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const fn = useServerFn(getDailyTrends);
  const [days, setDays] = useState<Day[]>([]);

  const load = useCallback(async () => {
    if (!passcode) return;
    try { setDays((await fn({ data: { passcode, days: 14 } })).days as Day[]); }
    catch (e) { onError(e); }
  }, [fn, passcode, onError]);

  useEffect(() => { void load(); }, [load]);

  const data = days.map((d) => ({ label: fmt(d.date), revenue: d.revenue, orders: d.orders }));
  const axis = { fontSize: 11, fill: "hsl(var(--muted-fg))" } as const;

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="rounded-xl border bg-white p-5">
        <h3 className="display text-lg mb-1">Daily revenue</h3>
        <p className="text-xs text-muted-foreground mb-3">Last 14 days · Leones</p>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ left: -8, right: 8, top: 5, bottom: 0 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--leaf))" stopOpacity={0.45} />
                <stop offset="100%" stopColor="hsl(var(--leaf))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis dataKey="label" tick={axis} interval="preserveStartEnd" />
            <YAxis tick={axis} width={46} tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)} />
            <Tooltip formatter={(v: number) => `Le ${(v ?? 0).toLocaleString()}`} />
            <Area type="monotone" dataKey="revenue" stroke="hsl(var(--leaf))" strokeWidth={2} fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-xl border bg-white p-5">
        <h3 className="display text-lg mb-1">Daily orders</h3>
        <p className="text-xs text-muted-foreground mb-3">Last 14 days · count</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ left: -8, right: 8, top: 5, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
            <XAxis dataKey="label" tick={axis} interval="preserveStartEnd" />
            <YAxis tick={axis} width={46} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="orders" fill="hsl(var(--sea))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
