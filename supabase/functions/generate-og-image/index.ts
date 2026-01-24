import React from "https://esm.sh/react@18.2.0";
import { ImageResponse } from "https://deno.land/x/og_edge@0.0.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const slug = url.searchParams.get("slug");

  if (!slug) {
    return new ImageResponse(
      React.createElement("div", {
        style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1a1a2e, #0f0f23)" },
        children: [
          React.createElement("div", { style: { fontSize: 64, fontWeight: "bold", color: "white" } }, "TapAway"),
          React.createElement("div", { style: { fontSize: 24, color: "rgba(255,255,255,0.7)", marginTop: 16 } }, "Share who you are"),
        ],
      }),
      { width: 1200, height: 630 }
    );
  }

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: profile } = await supabase.from("personal_profiles_public").select("full_name, headline, profile_photo_url, banner_image_url, background_color").eq("username", slug.toLowerCase()).single();

  const name = profile?.full_name || "TapAway";
  const headline = profile?.headline?.substring(0, 55) || "";
  const avatarUrl = profile?.profile_photo_url;
  const bannerUrl = profile?.banner_image_url;
  let bgColor = profile?.background_color?.startsWith("#") ? profile.background_color : "#1a1a2e";

  const children = [];
  if (bannerUrl) {
    children.push(React.createElement("img", { key: "banner", src: bannerUrl, style: { position: "absolute", top: 0, left: 0, width: "100%", height: 220, objectFit: "cover" } }));
    children.push(React.createElement("div", { key: "overlay", style: { position: "absolute", top: 0, left: 0, width: "100%", height: 220, background: "linear-gradient(to bottom, transparent, rgba(0,0,0,0.6))" } }));
  }
  if (avatarUrl) {
    children.push(React.createElement("img", { key: "avatar", src: avatarUrl, style: { width: 160, height: 160, borderRadius: "50%", border: "4px solid rgba(255,255,255,0.3)", marginTop: bannerUrl ? 80 : 0, objectFit: "cover" } }));
  } else {
    children.push(React.createElement("div", { key: "avatar", style: { width: 160, height: 160, borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 64, color: "white", fontWeight: "bold", marginTop: bannerUrl ? 80 : 0 } }, name.charAt(0)));
  }
  children.push(React.createElement("div", { key: "name", style: { fontSize: 48, fontWeight: "bold", color: "white", marginTop: 24 } }, name));
  if (headline) children.push(React.createElement("div", { key: "headline", style: { fontSize: 24, color: "rgba(255,255,255,0.8)", marginTop: 8 } }, headline));
  children.push(React.createElement("div", { key: "brand", style: { position: "absolute", bottom: 30, fontSize: 18, color: "rgba(255,255,255,0.5)" } }, "━━━ TapAway ━━━"));

  return new ImageResponse(
    React.createElement("div", { style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: bgColor, position: "relative" }, children }),
    { width: 1200, height: 630 }
  );
}
