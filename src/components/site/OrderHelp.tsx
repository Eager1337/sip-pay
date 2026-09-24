import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { Sparkles } from "lucide-react";
import { askOrderHelp } from "@/lib/support-ai.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function OrderHelp() {
  const ask = useServerFn(askOrderHelp);
  const [issue, setIssue] = useState("");
  const [ref, setRef] = useState("");
  const [phone, setPhone] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (issue.trim().length < 5) return;
    setBusy(true);
    setAnswer("");
    try {
      const r = await ask({ data: { issue, order_ref: ref, phone } });
      setAnswer(r.answer);
    } catch {
      setAnswer("Sorry, something went wrong. Please WhatsApp 073095177.");
    } finally { setBusy(false); }
  };

  return (
    <section className="py-16 px-6">
      <form onSubmit={submit} className="max-w-[1100px] mx-auto bg-card rounded-2xl p-8 shadow-md border border-border/40 space-y-4">
        <h2 className="display text-3xl flex items-center gap-2"><Sparkles className="h-6 w-6" /> Order or delivery problem?</h2>
        <p className="text-sm text-muted-foreground">Describe what happened and get clear next steps. Add your order number and phone to include your order status.</p>
        <Textarea value={issue} onChange={(e) => setIssue(e.target.value)} rows={3} maxLength={1500}
          placeholder="e.g. I paid with OrangeMoneySL but my order still says awaiting payment" />
        <div className="grid sm:grid-cols-2 gap-3">
          <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Order number (optional), e.g. #A1B2C3D4" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone used on the order (optional)" />
        </div>
        <Button type="submit" disabled={busy || issue.trim().length < 5}>{busy ? "Thinking…" : "Get help"}</Button>
        {answer && <div className="prose prose-sm max-w-none rounded-xl border bg-muted p-4"><ReactMarkdown>{answer}</ReactMarkdown></div>}
      </form>
    </section>
  );
}
