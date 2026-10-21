import { AlignCenter, AlignVerticalJustifyCenter, Trash2 } from "lucide-react";
import {
  cardSize,
  layerBounds,
  type CustomCard,
  type CardFace,
  type Layer,
  type CardFont,
} from "@/lib/cardDesign";
const PALETTE = [
  "#ffffff",
  "#182b23",
  "#ffc9df",
  "#ffdf7e",
  "#dcd8f7",
  "#20182e",
  "#f49b4d",
  "#a65335",
  "#194c3d",
  "#b13947",
];
type Props = {
  card: CustomCard;
  side: "front" | "back";
  selected: string | null;
  onSelect: (id: string | null) => void;
  updateLayer: (patch: Partial<Layer>) => void;
  updateCard: (patch: Partial<CustomCard>) => void;
  copySide: () => void;
  otherCard: number;
};
export function DesignerControls({
  card,
  side,
  selected,
  onSelect,
  updateLayer,
  updateCard,
  copySide,
  otherCard,
}: Props) {
  const face = card[side],
    layer = face.layers.find((l) => l.id === selected),
    size = cardSize(card);
  const setFace = (next: CardFace) => updateCard({ [side]: next });
  const scaleImage = (width: number) => {
    if (layer?.kind === "image")
      updateLayer({
        width,
        height: (width * layer.pixelsHigh) / layer.pixelsWide,
      });
  };
  const positionQR = (row: number, col: number) =>
    updateCard({
      qr: {
        ...card.qr,
        x: 5 + (col * (size.width - card.qr.size - 10)) / 2,
        y: 5 + (row * (size.height - card.qr.size - 10)) / 2,
      },
    });
  return (
    <aside className="cd-controls">
      <h2>
        {layer
          ? layer.kind === "text"
            ? "Make it say you."
            : "Picture perfect."
          : selected === "__qr"
            ? "Tap. Scan. Connect."
            : "Make it your own."}
      </h2>
      <label className="cd-color-label">
        Card color
        <input
          type="color"
          value={face.background}
          onChange={(e) => setFace({ ...face, background: e.target.value })}
        />
      </label>
      <div className="cd-swatches" aria-label="Background colors">
        {PALETTE.map((color) => (
          <button
            key={color}
            aria-label={`Use background ${color}`}
            aria-pressed={face.background === color}
            style={{ background: color }}
            onClick={() => setFace({ ...face, background: color })}
          />
        ))}
      </div>
      {layer ? (
        <>
          {layer.kind === "text" ? (
            <>
              <label>
                Your words
                <textarea
                  aria-label="Your words"
                  autoFocus
                  rows={3}
                  maxLength={280}
                  value={layer.text}
                  onChange={(e) => updateLayer({ text: e.target.value })}
                />
              </label>
              <div className="cd-control-row">
                <label>
                  Font
                  <select
                    value={layer.font}
                    onChange={(e) =>
                      updateLayer({ font: e.target.value as CardFont })
                    }
                  >
                    <option value="sans">Modern</option>
                    <option value="serif">Classic</option>
                    <option value="mono">Typewriter</option>
                  </select>
                </label>
                <label className="cd-color-label">
                  Text color
                  <input
                    type="color"
                    value={layer.color}
                    onChange={(e) => updateLayer({ color: e.target.value })}
                  />
                </label>
              </div>
              <div className="cd-choice-row">
                <button
                  aria-pressed={layer.bold}
                  onClick={() => updateLayer({ bold: !layer.bold })}
                >
                  <b>Bold</b>
                </button>
                {[
                  ["Small", 2.6],
                  ["Medium", 4.2],
                  ["Large", 6.4],
                ].map(([label, value]) => (
                  <button
                    key={label}
                    onClick={() => updateLayer({ size: Number(value) })}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <label>
                Text size
                <input
                  type="range"
                  min="2.5"
                  max="14"
                  step=".1"
                  value={layer.size}
                  onChange={(e) => updateLayer({ size: +e.target.value })}
                />
                <span className="cd-range-labels">
                  <small>Smaller</small>
                  <small>Bigger</small>
                </span>
              </label>
            </>
          ) : (
            <>
              <p className="sf-price-note">
                Drag a corner to resize. Your photo keeps its proportions.
              </p>
              <label>
                Image size
                <input
                  type="range"
                  min="5"
                  max={size.width * 2}
                  step=".5"
                  value={layer.width}
                  onChange={(e) => scaleImage(+e.target.value)}
                />
                <span className="cd-range-labels">
                  <small>Smaller</small>
                  <small>Bigger</small>
                </span>
              </label>
              <div className="cd-choice-row">
                <button
                  onClick={() => {
                    const scale = Math.min(
                      (size.width - 10) / layer.pixelsWide,
                      (size.height - 10) / layer.pixelsHigh,
                    );
                    updateLayer({
                      width: layer.pixelsWide * scale,
                      height: layer.pixelsHigh * scale,
                      x: (size.width - layer.pixelsWide * scale) / 2,
                      y: (size.height - layer.pixelsHigh * scale) / 2,
                    });
                  }}
                >
                  Fit inside card
                </button>
                <button
                  onClick={() => {
                    const scale = Math.max(
                      size.width / layer.pixelsWide,
                      size.height / layer.pixelsHigh,
                    );
                    updateLayer({
                      x: (size.width - layer.pixelsWide * scale) / 2,
                      y: (size.height - layer.pixelsHigh * scale) / 2,
                      width: layer.pixelsWide * scale,
                      height: layer.pixelsHigh * scale,
                    });
                  }}
                >
                  Fill the card
                </button>
              </div>
            </>
          )}
          <div className="cd-choice-row">
            <button
              onClick={() =>
                updateLayer({ x: (size.width - layerBounds(layer).width) / 2 })
              }
            >
              <AlignCenter size={16} /> Center across
            </button>
            <button
              onClick={() =>
                updateLayer({
                  y: (size.height - layerBounds(layer).height) / 2,
                })
              }
            >
              <AlignVerticalJustifyCenter size={16} /> Center down
            </button>
          </div>
          <div className="cd-layer-actions">
            <button
              onClick={() =>
                setFace({
                  ...face,
                  layers: [
                    layer,
                    ...face.layers.filter((l) => l.id !== selected),
                  ],
                })
              }
            >
              Send to back
            </button>
            <button
              onClick={() =>
                setFace({
                  ...face,
                  layers: [
                    ...face.layers.filter((l) => l.id !== selected),
                    layer,
                  ],
                })
              }
            >
              Bring to front
            </button>
            <button
              onClick={() => {
                setFace({
                  ...face,
                  layers: face.layers.filter((l) => l.id !== selected),
                });
                onSelect(null);
              }}
            >
              <Trash2 size={15} /> Delete
            </button>
          </div>
          <details>
            <summary>
              Precise controls <small>(optional)</small>
            </summary>
            <div className="cd-control-row">
              {(["x", "y"] as const).map((key) => (
                <label key={key}>
                  {key === "x" ? "Left" : "Top"} (mm)
                  <input
                    type="number"
                    step=".5"
                    min={-size.width}
                    max={size.width}
                    value={+layer[key].toFixed(1)}
                    onChange={(e) => updateLayer({ [key]: +e.target.value })}
                  />
                </label>
              ))}
              <label>
                {layer.kind === "text" ? "Font size (pt)" : "Image width (mm)"}
                <input
                  type="number"
                  min={layer.kind === "text" ? 7 : 2}
                  max={layer.kind === "text" ? 60 : 170}
                  step=".5"
                  value={
                    +(
                      layer.kind === "text"
                        ? (layer.size * 72) / 25.4
                        : layer.width
                    ).toFixed(1)
                  }
                  onChange={(e) =>
                    layer.kind === "text"
                      ? updateLayer({
                          size: Math.max(
                            2.5,
                            Math.min(21, (+e.target.value * 25.4) / 72),
                          ),
                        })
                      : scaleImage(Math.max(2, Math.min(170, +e.target.value)))
                  }
                />
              </label>
            </div>
          </details>
        </>
      ) : (
        <p className="sf-price-note">
          Click anything on your card to edit it. Drag to move; grab a corner to
          resize. Make room for a quote, a photo, or your next big idea.
        </p>
      )}
      {side === "back" && (
        <section className="cd-qr-controls">
          <h3>Your QR code</h3>
          <p className="sf-price-note">
            Drag it anywhere inside the safe area, or pick a spot.
          </p>
          <div className="cd-qr-position" aria-label="QR placement">
            {[0, 1, 2].flatMap((row) =>
              [0, 1, 2].map((col) => (
                <button
                  key={`${row}-${col}`}
                  aria-label={`Place QR ${["top", "middle", "bottom"][row]} ${["left", "center", "right"][col]}`}
                  onClick={() => {
                    onSelect("__qr");
                    positionQR(row, col);
                  }}
                >
                  <span
                    style={{
                      alignSelf: ["start", "center", "end"][row],
                      justifySelf: ["start", "center", "end"][col],
                    }}
                  />
                </button>
              )),
            )}
          </div>
          <div className="cd-choice-row">
            {[
              ["Standard", 24],
              ["Larger", 30],
            ].map(([label, value]) => (
              <button
                key={label}
                aria-pressed={card.qr.size === value}
                onClick={() => {
                  const q = Number(value);
                  updateCard({
                    qr: {
                      x: Math.max(3, Math.min(size.width - q - 3, card.qr.x)),
                      y: Math.max(3, Math.min(size.height - q - 3, card.qr.y)),
                      size: q,
                    },
                  });
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <details>
            <summary>
              Precise QR controls <small>(optional)</small>
            </summary>
            <div className="cd-control-row">
              {(["x", "y", "size"] as const).map((key) => (
                <label key={key}>
                  {key === "size"
                    ? "QR size"
                    : key === "x"
                      ? "QR left"
                      : "QR top"}{" "}
                  (mm)
                  <input
                    type="number"
                    step=".5"
                    min={key === "size" ? 22 : 3}
                    max={
                      key === "x"
                        ? size.width - card.qr.size - 3
                        : key === "y"
                          ? size.height - card.qr.size - 3
                          : Math.min(
                              size.width - card.qr.x - 3,
                              size.height - card.qr.y - 3,
                            )
                    }
                    value={+card.qr[key].toFixed(1)}
                    onChange={(e) =>
                      updateCard({ qr: { ...card.qr, [key]: +e.target.value } })
                    }
                  />
                </label>
              ))}
            </div>
          </details>
        </section>
      )}
      <details>
        <summary>All elements</summary>
        <div className="cd-layer-list">
          {face.layers.map((l) => (
            <button
              key={l.id}
              aria-pressed={l.id === selected}
              onClick={() => onSelect(l.id)}
            >
              {l.kind === "text"
                ? l.text.slice(0, 40) || "Empty text"
                : l.label}
            </button>
          ))}
        </div>
      </details>
      <button className="sf-text-link" onClick={copySide}>
        Copy this side to card {otherCard}
      </button>
    </aside>
  );
}
