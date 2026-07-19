/**
 * Sample the average color from the bottom-center 20% of an image.
 * Used to auto-match a hub's page background to its full-banner image so
 * the banner blends seamlessly into the page below.
 *
 * Returns a `#rrggbb` hex string, or `null` on any failure (CORS taint,
 * load error, decode error). Callers should treat `null` as "leave the
 * current background as-is" — this function never throws.
 */
export const DEFAULT_HUB_BACKGROUND_COLOR = "#ffffff";

export async function sampleBottomEdgeColor(
  imageUrl: string,
): Promise<string | null> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (value: string | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return done(null);

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return done(null);

        ctx.drawImage(img, 0, 0, w, h);

        // Bottom-center 20% width × bottom 5% height.
        const sampleW = Math.max(1, Math.floor(w * 0.2));
        const sampleH = Math.max(1, Math.floor(h * 0.05));
        const startX = Math.floor((w - sampleW) / 2);
        const startY = h - sampleH;

        const data = ctx.getImageData(startX, startY, sampleW, sampleH).data;

        let r = 0, g = 0, b = 0, count = 0;
        // Step every 4 pixels (16 bytes) for speed.
        for (let i = 0; i < data.length; i += 16) {
          const alpha = data[i + 3];
          if (alpha < 200) continue;
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }

        if (count === 0) return done(null);

        const avgR = Math.round(r / count);
        const avgG = Math.round(g / count);
        const avgB = Math.round(b / count);
        const hex = `#${[avgR, avgG, avgB]
          .map((n) => n.toString(16).padStart(2, "0"))
          .join("")}`;
        done(hex);
      } catch {
        // Canvas tainted by CORS, or any decoding error.
        done(null);
      }
    };

    img.onerror = () => done(null);
    img.src = imageUrl;
  });
}
