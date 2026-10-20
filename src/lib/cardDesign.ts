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
export type CustomCard = {
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
export const DESIGN_TEMPLATES = [
  {
    id: "network",
    name: "The introduction",
    category: "Networking",
    color: "#edf1e7",
    ink: "#182b23",
    title: "Nice to meet you.",
    sub: "YOUR NAME / YOUR NEXT CHAPTER",
  },
  {
    id: "personal",
    name: "Good energy",
    category: "Personal",
    color: "#ffc9df",
    ink: "#4e2142",
    title: "Good energy only.",
    sub: "YOUR NAME / YOUR WORLD",
  },
  {
    id: "halloween",
    name: "After dark",
    category: "Halloween",
    color: "#20182e",
    ink: "#ffbf83",
    title: "Let's haunt out.",
    sub: "A CONNECTION WORTH KEEPING",
  },
  {
    id: "blank",
    name: "Make your own",
    category: "Blank canvas",
    color: "#ffffff",
    ink: "#111111",
    title: "",
    sub: "",
  },
] as const;
export function templateCard(templateId: string): CustomCard {
  const t =
    DESIGN_TEMPLATES.find((x) => x.id === templateId) || DESIGN_TEMPLATES[0];
  return {
    title: t.name,
    destination: "",
    qr: { x: 56, y: 15, size: 24 },
    front: {
      background: t.color,
      layers:
        t.id === "blank"
          ? []
          : [
              {
                id: crypto.randomUUID(),
                kind: "text",
                x: 7,
                y: 19,
                text: t.title,
                size: 5.1,
                color: t.ink,
                font: "sans",
                bold: true,
              },
              {
                id: crypto.randomUUID(),
                kind: "text",
                x: 7,
                y: 37,
                text: t.sub,
                size: 2.6,
                color: t.ink,
                font: "sans",
                bold: false,
              },
            ],
    },
    back: {
      background: "#ffffff",
      layers: [
        {
          id: crypto.randomUUID(),
          kind: "text",
          x: 7,
          y: 17,
          text: "Your world,\none tap away.",
          size: 3.8,
          color: "#172b23",
          font: "sans",
          bold: true,
        },
        {
          id: crypto.randomUUID(),
          kind: "text",
          x: 7,
          y: 36,
          text: "TAP OR SCAN",
          size: 2.6,
          color: "#172b23",
          font: "sans",
          bold: false,
        },
      ],
    },
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
            layer.x + width > CARD_MM.width - 3 ||
            layer.y + height > CARD_MM.height - 3
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
      card.qr.x + card.qr.size > CARD_MM.width - 3 ||
      card.qr.y + card.qr.size > CARD_MM.height - 3
    )
      issues.push({
        level: "error",
        message: `${prefix}: keep the QR code at least 22 mm wide and inside the safe area.`,
      });
  });
  if (draft.hosted) {
    const links = draft.hubLinks
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);
    if (links.length > 20 || links.some((link) => !normalizeDestination(link)))
      issues.push({
        level: "error",
        message:
          "Use up to 20 valid website links for your hub, one per line (220 characters each).",
      });
  }
  if (draft.hosted && !draft.hubName.trim())
    issues.push({
      level: "error",
      message: "Add the name you want on your TapAway hub.",
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
