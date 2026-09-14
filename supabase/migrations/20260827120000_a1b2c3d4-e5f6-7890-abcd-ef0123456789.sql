-- Site content CMS + media storage bucket for the admin "edit site" page.
-- Allows the admin to swap the landing hero for an image or video (URL or
-- upload) and edit marketing copy. Public reads; passcode-gated admin writes.
CREATE TABLE IF NOT EXISTS public.site_content (
  key text PRIMARY KEY,
  value text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'text',
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read site_content"
  ON public.site_content FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.site_content (key, value, type) VALUES
  ('hero_media_url', '', 'url'),
  ('hero_media_type', 'image', 'text'),
  ('hero_headline', '', 'text'),
  ('hero_subhead', '', 'text'),
  ('hero_cta_label', 'The Drinks', 'text'),
  ('hero_cta_link', '/store', 'text'),
  ('marquee_heading', 'Fresh from our feed.', 'text'),
  ('final_cta_heading', 'Until your next sip.', 'text'),
  ('final_cta_text', 'Stock up on KK today. Pay on delivery anywhere in Sierra Leone — every bottle just Le 10.', 'text')
ON CONFLICT (key) DO NOTHING;

-- Public storage bucket for media uploads from the admin CMS.
INSERT INTO storage.buckets (id, name, public) VALUES ('site-media', 'site-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read site-media" ON storage.objects;
CREATE POLICY "Public read site-media"
  ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'site-media');
DROP POLICY IF EXISTS "Service role write site-media" ON storage.objects;
CREATE POLICY "Service role write site-media"
  ON storage.objects FOR INSERT TO service_role WITH CHECK (bucket_id = 'site-media');
