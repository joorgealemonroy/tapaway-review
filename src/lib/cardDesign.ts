import { DESIGN_TEMPLATES } from "@/data/cardTemplates";
export { DESIGN_TEMPLATES } from "@/data/cardTemplates";
export const CARD_MM = {
  width: 85.6,
  height: 53.98,
  safe: 3,
  dpi: 300,
} as const;
export type CardFont = "sans" | "serif" | "mono";
export type TextLayer = {
  id: string;
  kind: "text";
  x: number;
  y: number;
  text: string;
  size: number;
  color: string;
  font: CardFont;
  bold: boolean;
};
export type ImageLayer = {
  id: string;
  kind: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  pixelsWide: number;
  pixelsHigh: number;
  label: string;
};
export type Layer = TextLayer | ImageLayer;
export type CardFace = { background: string; layers: Layer[] };
export type CardOrientation = "landscape" | "portrait";
export type CustomCard = {
  orientation?: CardOrientation;
  title: string;
  destination: string;
  front: CardFace;
  back: CardFace;
  qr: { x: number; y: number; size: number };
};
export type CardDraft = {
  version: 1;
  id: string;
  checkoutToken: string;
  hosted: boolean;
  hubName: string;
  hubLinks: string;
  cards: [CustomCard, CustomCard];
};
export const FONT_FAMILIES: Record<CardFont, string> = {
  sans: "Arial, Helvetica, sans-serif",
  serif: "'Times New Roman', Times, serif",
  mono: "'Courier New', monospace",
};
export function cardSize(card: Pick<CustomCard, "orientation">) {
  return card.orientation === "portrait"
    ? { width: CARD_MM.height, height: CARD_MM.width }
    : { width: CARD_MM.width, height: CARD_MM.height };
}
export function layerBounds(layer: Layer) {
  return layer.kind === "image"
    ? { width: layer.width, height: layer.height }
    : {
        width: textWidth(layer),
        height: layer.size * 1.15 * layer.text.split("\n").length,
      };
}
function wrapText(
  text: string,
  width: number,
  size: number,
  font: CardFont,
  bold: boolean,
) {
  return text
    .split("\n")
    .flatMap((line) => {
      const lines: string[] = [];
      let current = "";
      for (const word of line.split(" ")) {
        const next = current ? current + " " + word : word;
        if (
          current &&
          textWidth({ text: next, size, font, bold } as TextLayer) > width
        ) {
          lines.push(current);
          current = word;
        } else current = next;
      }
      lines.push(current);
      return lines;
    })
    .join("\n");
}
export function templateCard(
  templateId: string,
  orientation: CardOrientation = "landscape",
): CustomCard {
  const t =
    DESIGN_TEMPLATES.find((x) => x.id === templateId) || DESIGN_TEMPLATES[0];
  const { width, height } = cardSize({ orientation });
  const portrait = orientation === "portrait";
  const text = (
    value: string,
    x: number,
    y: number,
    size: number,
    ink = t.ink as string,
    font = t.font as CardFont,
    bold = true,
    maxWidth = width - 14,
  ): TextLayer => ({
    id: crypto.randomUUID(),
    kind: "text",
    x,
    y,
    text: wrapText(value, maxWidth, size, font, bold),
    size,
    color: ink,
    font,
    bold,
  });
  const footer = text(t.sub, 7, 0, 2.6, t.ink, "sans", false);
  footer.y = height - 6 - layerBounds(footer).height;
  const headline = text(
    t.title,
    7,
    portrait ? 24 : 16,
    portrait ? Math.min(t.size, 6.0) : t.size,
  );
  const maxHeadline = footer.y - headline.y - 4;
  if (layerBounds(headline).height > maxHeadline)
    headline.size *= maxHeadline / layerBounds(headline).height;
  return {
    title: t.name,
    orientation,
    destination: "",
    qr: portrait
      ? { x: (width - 26) / 2, y: height - 34, size: 26 }
      : { x: width - 30, y: (height - 24) / 2, size: 24 },
    front: {
      background: t.color,
      layers:
        t.id === "blank"
          ? []
          : [text(t.kicker, 7, 6, 2.6, t.ink, "sans", false), headline, footer],
    },
    back: {
      background: t.color,
      layers: [
        text(
          "Your world,\none tap away.",
          7,
          portrait ? 12 : 15,
          3.8,
          t.ink,
          t.font,
          true,
          portrait ? width - 14 : width - 41,
        ),
        text(
          "TAP OR SCAN",
          7,
          portrait ? 36 : 37,
          2.6,
          t.ink,
          "sans",
          false,
          portrait ? width - 14 : width - 41,
        ),
      ],
    },
  };
}
/** Fit existing artwork without stretching when changing the card's orientation. */
export function reorientCard(
  card: CustomCard,
  orientation: CardOrientation,
): CustomCard {
  if ((card.orientation || "landscape") === orientation) return card;
  // Untouched templates reflow into their designed portrait/landscape layout.
  // Custom artwork keeps its text and images and is fitted without stretching.
  const preset = DESIGN_TEMPLATES.find((t) => t.name === card.title);
  if (preset) {
    const original = templateCard(preset.id, card.orientation || "landscape");
    const comparable = (face: CardFace) =>
      JSON.stringify({
        ...face,
        layers: face.layers.map(({ id, ...layer }) => layer),
      });
    if (
      comparable(card.front) === comparable(original.front) &&
      comparable(card.back) === comparable(original.back)
    ) {
      return {
        ...templateCard(preset.id, orientation),
        destination: card.destination,
      };
    }
  }

  const next = templateCard("blank", orientation),
    after = cardSize(next);
  const fit = (face: CardFace, back: boolean): CardFace => {
    const region = back
      ? orientation === "portrait"
        ? { x: 5, y: 6, width: after.width - 10, height: 34 }
        : { x: 5, y: 7, width: after.width - 42, height: after.height - 14 }
      : { x: 5, y: 5, width: after.width - 10, height: after.height - 10 };
    if (!face.layers.length) return face;
    const left = Math.min(...face.layers.map((l) => l.x)),
      top = Math.min(...face.layers.map((l) => l.y));
    const w =
      Math.max(...face.layers.map((l) => l.x + layerBounds(l).width)) - left;
    const h =
      Math.max(...face.layers.map((l) => l.y + layerBounds(l).height)) - top;
    const scale = Math.min(
      1,
      region.width / Math.max(w, 1),
      region.height / Math.max(h, 1),
    );
    return {
      ...face,
      layers: face.layers.map((l) => ({
        ...l,
        x: region.x + (l.x - left) * scale,
        y: region.y + (l.y - top) * scale,
        ...(l.kind === "image"
          ? { width: l.width * scale, height: l.height * scale }
          : { size: l.size * scale }),
      })),
    };
  };
  return {
    ...card,
    orientation,
    front: fit(card.front, false),
    back: fit(card.back, true),
    qr: next.qr,
  };
}
export function newDraft(template = "network"): CardDraft {
  return {
    version: 1,
    id: crypto.randomUUID(),
    checkoutToken: crypto.randomUUID() + crypto.randomUUID(),
    hosted: false,
    hubName: "",
    hubLinks: "",
    cards: [templateCard(template), templateCard("personal")],
  };
}
export function hostedSlug(draft: Pick<CardDraft, "id">) {
  return `p${draft.id.replace(/-/g, "")}`;
}
export function normalizeDestination(value: string): string {
  if (!value.trim()) return "";
  try {
    const url = new URL(
      /^https?:\/\//i.test(value.trim())
        ? value.trim()
        : `https://${value.trim()}`,
    );
    if (
      !["https:", "http:"].includes(url.protocol) ||
      !url.hostname.includes(".") ||
      url.username ||
      url.password
    )
      return "";
    return url.href.length <= 220 ? url.href : "";
  } catch {
    return "";
  }
}
export function cardDestination(draft: CardDraft, index: number) {
  return draft.hosted
    ? `https://tapaway.co/connect/${draft.id}`
    : normalizeDestination(draft.cards[index].destination);
}
export function textWidth(layer: TextLayer) {
  const canvas = document.createElement("canvas"),
    ctx = canvas.getContext("2d")!;
  ctx.font = `${layer.bold ? "bold " : ""}100px ${FONT_FAMILIES[layer.font]}`;
  return Math.max(
    ...layer.text
      .split("\n")
      .map((line) => (ctx.measureText(line).width / 100) * layer.size),
  );
}
export type PrintIssue = { level: "error" | "warning"; message: string };
export function checkDesign(draft: CardDraft): PrintIssue[] {
  const issues: PrintIssue[] = [];
  draft.cards.forEach((card, i) => {
    const prefix = `Card ${i + 1}`;
    const dimensions = cardSize(card);
    if (!cardDestination(draft, i))
      issues.push({
        level: "error",
        message: `${prefix}: add a valid destination link (up to 220 characters), or choose a TapAway hub.`,
      });
    if (!card.front.layers.length)
      issues.push({
        level: "warning",
        message: `${prefix}: the front is blank. Add your design or confirm you want a plain front.`,
      });
    for (const side of ["front", "back"] as const) {
      const face = card[side];
      for (const layer of face.layers) {
        let width: number, height: number;
        if (layer.kind === "image") {
          width = layer.width;
          height = layer.height;
          const dpi = Math.min(
            layer.pixelsWide / (width / 25.4),
            layer.pixelsHigh / (height / 25.4),
          );
          if (dpi < 299.5)
            issues.push({
              level: dpi < 150 ? "error" : "warning",
              message: `${prefix} ${side}: “${layer.label}” is about ${Math.round(dpi)} dpi at this size. ${dpi < 150 ? "Make it smaller or upload a larger image." : "300 dpi or higher is recommended for sharper printing."}`,
            });
        } else {
          width = textWidth(layer);
          height = layer.size * 1.15 * layer.text.split("\n").length;
          if (layer.size < 2.5)
            issues.push({
              level: "warning",
              message: `${prefix} ${side}: small text may be hard to read. Aim for at least 7 pt.`,
            });
          if (layer.color.toLowerCase() === face.background.toLowerCase())
            issues.push({
              level: "warning",
              message: `${prefix} ${side}: text matches the background. Choose a contrasting color.`,
            });
          if (
            layer.x < 3 ||
            layer.y < 3 ||
            layer.x + width > dimensions.width - 3 ||
            layer.y + height > dimensions.height - 3
          )
            issues.push({
              level: "error",
              message: `${prefix} ${side}: move text inside the dashed safe area or reduce its size.`,
            });
        }
        if (
          side === "back" &&
          layer.x < card.qr.x + card.qr.size &&
          layer.x + width > card.qr.x &&
          layer.y < card.qr.y + card.qr.size &&
          layer.y + height > card.qr.y
        )
          issues.push({
            level: "warning",
            message: `${prefix} back: part of your design sits under the QR code. The QR code prints on top.`,
          });
      }
    }
    if (
      card.qr.size < 22 ||
      card.qr.x < 3 ||
      card.qr.y < 3 ||
      card.qr.x + card.qr.size > dimensions.width - 3 ||
      card.qr.y + card.qr.size > dimensions.height - 3
    )
      issues.push({
        level: "error",
        message: `${prefix}: keep the QR code at least 22 mm wide and inside the safe area.`,
      });
  });
  return issues.filter(
    (item, index, all) =>
      all.findIndex((other) => other.message === item.message) === index,
  );
}

const DB = "tapaway-card-designer";
async function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore("drafts");
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function saveCardDraft(draft: CardDraft) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    tx.objectStore("drafts").put(draft, "current");
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
export async function loadCardDraft(): Promise<CardDraft | null> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readonly");
    const req = tx.objectStore("drafts").get("current");
    req.onsuccess = () => {
      db.close();
      resolve(
        req.result?.version === 1 &&
          req.result?.cards?.length === 2 &&
          req.result?.checkoutToken
          ? req.result
          : null,
      );
    };
    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}
export async function readDesignImage(file: File): Promise<ImageLayer> {
  if (
    !["image/png", "image/jpeg", "image/webp"].includes(file.type) ||
    file.size > 10 * 1024 * 1024
  )
    throw new Error("Choose a PNG, JPG, or WebP image under 10 MB.");
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  if (bitmap.width * bitmap.height > 40000000) {
    bitmap.close();
    throw new Error("Use an image under 40 megapixels.");
  }
  // Normalize orientation and format, cap huge source images without upsampling them.
  const ratio = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * ratio);
  canvas.height = Math.round(bitmap.height * ratio);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const width = 40,
    height = (width * canvas.height) / canvas.width;
  const fit = Math.min(1, 42 / height);
  return {
    id: crypto.randomUUID(),
    kind: "image",
    x: 5,
    y: 5,
    width: width * fit,
    height: height * fit,
    src: canvas.toDataURL("image/png"),
    pixelsWide: canvas.width,
    pixelsHigh: canvas.height,
    label: file.name.slice(0, 100),
  };
}
