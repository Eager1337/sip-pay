import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import { AdminShell, useAdminPass, handleAdminError } from "./AdminShell";
import { askOpsAssistant } from "@/lib/admin-tools.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = { role: "user" | "assistant"; content: string };
const SUGGESTIONS = [
  "How much did we collect this week and which drink sold most?",
  "Which orders are still awaiting payment for more than an hour?",
  "Who are our top 5 customers by spend?",
  "Which areas have the most deliveries, and which riders are busiest?",
];

export default function AdminAssistant() {
  const pass = useAdminPass();
  const navigate = useNavigate();
  const ask = useServerFn(askOpsAssistant);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  const send = async (question: string) => {
    if (!question.trim() || busy) return;
    const history = msgs.slice(-8);
    setMsgs((m) => [...m, { role: "user", content: question }]);
    setQ("");
    setBusy(true);
    try {
      const r = await ask({ data: { passcode: pass, question, history } });
      setMsgs((m) => [...m, { role: "assistant", content: r.answer }]);
    } catch (e) { toast.error(handleAdminError(e, navigate)); }
    finally { setBusy(false); }
  };

  return (
    <AdminShell title="AI assistant">
      <p className="text-sm text-muted-foreground mb-4">Ask anything about orders, customers, payments and deliveries from the last 30 days.</p>
      <div className="space-y-3 mb-4">
        {msgs.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => <Button key={s} variant="outline" size="sm" onClick={() => send(s)}>{s}</Button>)}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className={`rounded-xl border p-4 ${m.role === "user" ? "bg-muted ml-8" : "bg-card mr-8"}`}>
            <div className="prose prose-sm max-w-none"><ReactMarkdown>{m.content}</ReactMarkdown></div>
          </div>
        ))}
        {busy && <p className="text-sm text-muted-foreground">Thinking…</p>}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(q); }} className="flex gap-2">
        <Textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. How many orders failed payment yesterday?" rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(q); } }} />
        <Button type="submit" disabled={busy || !q.trim()}>Ask</Button>
      </form>
    </AdminShell>
  );
}
