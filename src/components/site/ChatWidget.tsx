import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "What should I drink with jollof rice?",
  "It's hot in Freetown · what do you recommend?",
  "Tell me about KK Mixed Fruit",
  "How can I order?",
];

export const ChatWidget = () => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "Hi! 👋 I'm the **KK helper**. Ask me about our drinks, what to pair with your meal, or how to place an order." },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    let assistantSoFar = "";
    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant" && last !== prev[prev.findIndex((p) => p === last)]) {
          // fall through to replace
        }
        if (prev[prev.length - 1]?.role === "assistant" && prev.length > 1 && prev[prev.length - 2] === userMsg) {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/kk-chat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: [...messages, userMsg].map(({ role, content }) => ({ role, content })) }),
      });
      if (resp.status === 429) { toast.error("Slow down a bit · too many requests."); setBusy(false); return; }
      if (resp.status === 402) { toast.error("AI credits exhausted. Add funds in Settings → Workspace → Usage."); setBusy(false); return; }
      if (!resp.ok || !resp.body) throw new Error("stream failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, nl);
          buf = buf.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const j = line.slice(6).trim();
          if (j === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(j);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch { buf = line + "\n" + buf; break; }
        }
      }
    } catch (e) {
      console.error(e);
      toast.error("The KK helper is unavailable right now.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => {
          setOpen((o) => {
            if (!o) void track("chat_open");
            return !o;
          });
        }}
        aria-label="Open KK helper chat"
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-[hsl(var(--sea))] text-white shadow-2xl flex items-center justify-center hover:scale-110 transition-transform"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-[hsl(var(--mango))] ring-2 ring-white animate-pulse" />
        )}
      </button>

      <div
        className={cn(
          "fixed bottom-24 right-5 z-50 w-[min(380px,calc(100vw-2rem))] h-[min(560px,calc(100vh-7rem))] flex flex-col rounded-2xl bg-white shadow-2xl border border-border overflow-hidden origin-bottom-right transition-all",
          open ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none",
        )}
      >
        <div className="px-4 py-3 bg-[hsl(var(--wood))] text-white flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[hsl(var(--sun))]" />
          <div className="flex-1">
            <div className="text-sm font-semibold">KK Helper</div>
            <div className="text-[10px] opacity-70">AI assistant · always online</div>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[hsl(var(--paper))]">
          {messages.map((m, i) => (
            <div key={i} className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed whitespace-pre-wrap", m.role === "user" ? "ml-auto bg-[hsl(var(--sea))] text-white rounded-br-sm" : "bg-white shadow-sm rounded-bl-sm")}>
              {m.content}
            </div>
          ))}
          {busy && messages[messages.length - 1]?.role === "user" && (
            <div className="bg-white shadow-sm rounded-2xl rounded-bl-sm px-3.5 py-2 max-w-[60%]">
              <span className="inline-flex gap-1">
                <span className="h-1.5 w-1.5 bg-foreground/40 rounded-full animate-bounce" />
                <span className="h-1.5 w-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:120ms]" />
                <span className="h-1.5 w-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:240ms]" />
              </span>
            </div>
          )}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} className="text-xs bg-white border border-border rounded-full px-3 py-1.5 hover:bg-secondary transition">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="p-3 border-t border-border bg-white flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about KK Drinks…"
            maxLength={500}
            className="flex-1 px-3 py-2 text-sm rounded-full border border-border bg-secondary outline-none focus:ring-2 focus:ring-[hsl(var(--sea))]"
          />
          <button type="submit" disabled={busy || !input.trim()} className="h-9 w-9 rounded-full bg-[hsl(var(--sea))] text-white flex items-center justify-center disabled:opacity-50">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  );
};
