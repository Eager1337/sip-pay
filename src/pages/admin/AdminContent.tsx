// /admin/content — CMS to edit the landing page hero (image or video, via URL
// or upload) and marketing copy. Passcode-gated; media uploads go to the
// site-media Supabase Storage bucket.
import { useCallback, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useServerFn } from "@tanstack/react-start";
import { listSiteContentAdmin, updateSiteContent, uploadSiteMedia, DEFAULT_CONTENT } from "@/lib/site-content.functions";
import { AdminShell, useAdminPasscode, useAdminErrorHandler } from "@/components/site/AdminShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Save, Upload, Loader2, Image as ImageIcon, Video } from "lucide-react";

const FIELDS: Array<{ key: keyof typeof DEFAULT_CONTENT; label: string; textarea?: boolean }> = [
  { key: "hero_headline", label: "Hero headline" },
  { key: "hero_subhead", label: "Hero subheading", textarea: true },
  { key: "hero_cta_label", label: "Hero button text" },
  { key: "hero_cta_link", label: "Hero button link (e.g. /store)" },
  { key: "marquee_heading", label: "Social feed heading" },
  { key: "final_cta_heading", label: "Final CTA heading" },
  { key: "final_cta_text", label: "Final CTA text", textarea: true },
];

export default function AdminContent() {
  const passcode = useAdminPasscode();
  const onError = useAdminErrorHandler();
  const listFn = useServerFn(listSiteContentAdmin);
  const saveFn = useServerFn(updateSiteContent);
  const uploadFn = useServerFn(uploadSiteMedia);
  const [content, setContent] = useState<Record<string, string>>(DEFAULT_CONTENT);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    if (!passcode) return;
    try { const r = await listFn({ data: { passcode } }); setContent(r.content); }
    catch (e) { onError(e); }
  }, [listFn, passcode, onError]);

  useEffect(() => { void load(); }, [load]);

  const saveAll = async () => {
    setBusy(true);
    try {
      for (const key of Object.keys(content)) {
        await saveFn({ data: { passcode, key, value: content[key] ?? "" } });
      }
      toast.success("Site content saved — changes are live on the landing page.");
    } catch (e) { onError(e); }
    finally { setBusy(false); }
  };

  const onUpload = async (file: File) => {
    setUploading(true);
    try {
      const reader = new FileReader();
      const dataUrl: string = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const r = await uploadFn({ data: { passcode, fileName: file.name, dataUrl } });
      setContent((c) => ({ ...c, hero_media_url: r.url }));
      toast.success("Media uploaded.");
    } catch (e) { onError(e); }
    finally { setUploading(false); }
  };

  const set = (key: string, value: string) => setContent((c) => ({ ...c, [key]: value }));
  const isVideo = content.hero_media_type === "video";

  if (!passcode) return null;

  return (
    <AdminShell title="Site content" subtitle="Edit the landing page hero & marketing copy" actions={
      <Button onClick={() => void saveAll()} disabled={busy}>
        {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : <><Save className="mr-2 h-4 w-4" /> Save changes</>}
      </Button>
    }>
      <Helmet><title>Site content — KK Admin</title><meta name="robots" content="noindex" /></Helmet>

      {/* Hero media */}
      <div className="rounded-xl border bg-white p-5 mb-4">
        <h3 className="text-sm font-semibold mb-4">Hero media</h3>
        <div className="flex gap-2 mb-4">
          <button onClick={() => set("hero_media_type", "image")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm border ${!isVideo ? "bg-[hsl(var(--wood))] text-white border-[hsl(var(--wood))]" : "hover:bg-muted"}`}>
            <ImageIcon className="h-4 w-4" /> Image
          </button>
          <button onClick={() => set("hero_media_type", "video")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm border ${isVideo ? "bg-[hsl(var(--wood))] text-white border-[hsl(var(--wood))]" : "hover:bg-muted"}`}>
            <Video className="h-4 w-4" /> Video
          </button>
        </div>

        <Label className="text-xs text-muted-foreground">Media URL ({isVideo ? "video link / mp4 / YouTube" : "image URL"})</Label>
        <Input value={content.hero_media_url} onChange={(e) => set("hero_media_url", e.target.value)}
               placeholder={isVideo ? "https://…/clip.mp4 or YouTube watch/embed link" : "https://…/hero.jpg"} className="mb-3" />

        <div className="flex items-center gap-3">
          <label className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm cursor-pointer hover:bg-muted">
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading…" : "Upload a file instead"}
            <input type="file" accept={isVideo ? "video/*" : "image/*"} className="hidden"
                   disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); e.target.value = ""; }} />
          </label>
          <span className="text-xs text-muted-foreground">Uploads go to your Supabase site-media bucket.</span>
        </div>

        {content.hero_media_url && (
          <div className="mt-4 rounded-lg border overflow-hidden bg-muted/30">
            {isVideo
              ? <video src={content.hero_media_url} controls className="max-h-64 w-full bg-black" />
              : <img src={content.hero_media_url} alt="Hero preview" className="max-h-64 w-full object-contain bg-white" />}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-3">Leave blank to keep the current built-in hero banner.</p>
      </div>

      {/* Copy fields */}
      <div className="rounded-xl border bg-white p-5 space-y-4">
        <h3 className="text-sm font-semibold">Marketing copy</h3>
        {FIELDS.map(({ key, label, textarea }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-muted-foreground">{label}</Label>
            {textarea
              ? <Textarea rows={2} value={content[key] ?? ""} onChange={(e) => set(key, e.target.value)} />
              : <Input value={content[key] ?? ""} onChange={(e) => set(key, e.target.value)} />}
          </div>
        ))}
      </div>
    </AdminShell>
  );
}
