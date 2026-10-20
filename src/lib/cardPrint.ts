import { PDFDocument, rgb, cmyk } from "pdf-lib";
import QRCode from "qrcode";
import {
  cardSize,
  FONT_FAMILIES,
  cardDestination,
  checkDesign,
  textWidth,
  type CardDraft,
  type TextLayer,
} from "./cardDesign";
const MM = 72 / 25.4;
const color = (hex: string) =>
  hex.toLowerCase() === "#000000"
    ? cmyk(0, 0, 0, 1)
    : rgb(
        parseInt(hex.slice(1, 3), 16) / 255,
        parseInt(hex.slice(3, 5), 16) / 255,
        parseInt(hex.slice(5, 7), 16) / 255,
      );
async function rasterizeText(layer: TextLayer) {
  const scale = 600 / 25.4;
  const width = textWidth(layer),
    height = layer.size * 1.15 * layer.text.split("\n").length;
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(width * scale + 4);
  canvas.height = Math.ceil(height * scale + 4);
  const ctx = canvas.getContext("2d")!;
  ctx.font = `${layer.bold ? "bold " : ""}${layer.size * scale}px ${FONT_FAMILIES[layer.font]}`;
  ctx.fillStyle = layer.color;
  ctx.textBaseline = "alphabetic";
  layer.text
    .split("\n")
    .forEach((line, i) =>
      ctx.fillText(line, 0, (layer.size * 0.8 + i * layer.size * 1.15) * scale),
    );
  return {
    png: canvas.toDataURL("image/png"),
    width: canvas.width / scale,
    height: canvas.height / scale,
  };
}
/** Four exact-size CR80 pages: card 1 front/back, card 2 front/back. Guides never print. */
export async function createCardPdf(draft: CardDraft): Promise<Uint8Array> {
  const errors = checkDesign(draft).filter((x) => x.level === "error");
  if (errors.length) throw new Error(errors[0].message);
  const pdf = await PDFDocument.create();
  pdf.setTitle("TapAway — two custom cards");
  pdf.setSubject(
    "CR80 85.60 × 53.98 mm; 100% scale; 300 dpi source target; YMCKO",
  );
  pdf.setCreator("TapAway Card Designer");
  pdf.setKeywords([
    "CR80",
    "YMCKO",
    "card 1 front",
    "card 1 back",
    "card 2 front",
    "card 2 back",
  ]);
  for (let index = 0; index < 2; index++) {
    const card = draft.cards[index];
    const dimensions = cardSize(card);
    for (const side of ["front", "back"] as const) {
      const page = pdf.addPage([dimensions.width * MM, dimensions.height * MM]);
      const face = card[side];
      page.drawRectangle({
        x: 0,
        y: 0,
        width: dimensions.width * MM,
        height: dimensions.height * MM,
        color: color(face.background),
      });
      for (const layer of face.layers) {
        if (layer.kind === "image") {
          const image = await pdf.embedPng(layer.src);
          page.drawImage(image, {
            x: layer.x * MM,
            y: (dimensions.height - layer.y - layer.height) * MM,
            width: layer.width * MM,
            height: layer.height * MM,
          });
        } else {
          // Render text at 600 dpi using the same browser fonts as the preview.
          // This preserves Unicode and avoids printer/viewer font substitution.
          const raster = await rasterizeText(layer),
            image = await pdf.embedPng(raster.png);
          page.drawImage(image, {
            x: layer.x * MM,
            y: (dimensions.height - layer.y - raster.height) * MM,
            width: raster.width * MM,
            height: raster.height * MM,
          });
        }
      }
      if (side === "back") {
        const code = QRCode.create(cardDestination(draft, index), {
          errorCorrectionLevel: "M",
        });
        const modules = code.modules.size,
          quiet = 4,
          unit = (card.qr.size * MM) / (modules + quiet * 2);
        const left = card.qr.x * MM,
          bottom = (dimensions.height - card.qr.y - card.qr.size) * MM;
        page.drawRectangle({
          x: left,
          y: bottom,
          width: card.qr.size * MM,
          height: card.qr.size * MM,
          color: rgb(1, 1, 1),
        });
        for (let row = 0; row < modules; row++)
          for (let col = 0; col < modules; col++)
            if (code.modules.get(row, col))
              page.drawRectangle({
                x: left + (quiet + col) * unit,
                y: bottom + (quiet + modules - row - 1) * unit,
                width: unit,
                height: unit,
                color: cmyk(0, 0, 0, 1),
              });
      }
    }
  }
  return pdf.save();
}
export function downloadCardPdf(
  bytes: Uint8Array,
  name = "tapaway-two-cards-print.pdf",
) {
  const url = URL.createObjectURL(
    new Blob([bytes as BlobPart], { type: "application/pdf" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
