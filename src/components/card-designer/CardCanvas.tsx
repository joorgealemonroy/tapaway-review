import { useMemo, useRef } from "react";
import QRCode from "qrcode";
import {
  FONT_FAMILIES,
  cardDestination,
  cardSize,
  layerBounds,
  type CardDraft,
} from "@/lib/cardDesign";
const QR_SELECTION = "__qr";
type Props = {
  draft: CardDraft;
  card: number;
  side: "front" | "back";
  guides?: boolean;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number, commit: boolean) => void;
  onResize?: (id: string, scale: number, commit: boolean) => void;
};
export function CardCanvas({
  draft,
  card: index,
  side,
  guides = false,
  selected,
  onSelect,
  onMove,
  onResize,
}: Props) {
  const card = draft.cards[index],
    face = card[side],
    dimensions = cardSize(card);
  const ref = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    id: string;
    mode: "move" | "resize";
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
    pointer: number;
    lastScale: number;
  } | null>(null);
  const destination = cardDestination(draft, index);
  const code = useMemo(
    () =>
      QRCode.create(destination || "https://tapaway.co", {
        errorCorrectionLevel: "M",
      }),
    [destination],
  );
  const unit = card.qr.size / (code.modules.size + 8);
  const point = (x: number, y: number) => {
    const box = ref.current!.getBoundingClientRect();
    return {
      x: ((x - box.left) / box.width) * dimensions.width,
      y: ((y - box.top) / box.height) * dimensions.height,
    };
  };
  const start = (
    e: React.PointerEvent,
    id: string,
    mode: "move" | "resize",
    x: number,
    y: number,
    width: number,
    height: number,
  ) => {
    if (!onMove) return;
    e.preventDefault();
    e.stopPropagation();
    onSelect?.(id);
    const p = point(e.clientX, e.clientY);
    drag.current = {
      id,
      mode,
      startX: p.x,
      startY: p.y,
      x,
      y,
      width,
      height,
      pointer: e.pointerId,
      lastScale: 1,
    };
    ref.current?.setPointerCapture(e.pointerId);
  };
  const position = (id: string, x: number, y: number, w: number, h: number) => {
    const isQR = id === QR_SELECTION,
      isText = face.layers.find((l) => l.id === id)?.kind === "text";
    const safe = isQR || isText ? 3 : 0;
    if (Math.abs(x + w / 2 - dimensions.width / 2) < 1)
      x = (dimensions.width - w) / 2;
    if (Math.abs(y + h / 2 - dimensions.height / 2) < 1)
      y = (dimensions.height - h) / 2;
    return {
      x: Math.max(
        isText || isQR ? safe : -w + 4,
        Math.min(dimensions.width - (isText || isQR ? w + safe : 4), x),
      ),
      y: Math.max(
        isText || isQR ? safe : -h + 4,
        Math.min(dimensions.height - (isText || isQR ? h + safe : 4), y),
      ),
    };
  };
  const finishMove = (e: React.PointerEvent, commit: boolean) => {
    const d = drag.current;
    if (!d) return;
    const p = point(e.clientX, e.clientY);
    if (d.mode === "resize") {
      let scale = Math.max(
        0.15,
        Math.min(
          5,
          1 + ((p.x - d.startX) / d.width + (p.y - d.startY) / d.height) / 2,
        ),
      );
      if (d.id === QR_SELECTION)
        scale = Math.max(
          22 / d.width,
          Math.min(
            (dimensions.width - d.x - 3) / d.width,
            (dimensions.height - d.y - 3) / d.width,
            scale,
          ),
        );
      onResize?.(d.id, scale / d.lastScale, commit);
      d.lastScale = scale;
    } else {
      const p2 = position(
        d.id,
        d.x + p.x - d.startX,
        d.y + p.y - d.startY,
        d.width,
        d.height,
      );
      onMove?.(d.id, p2.x, p2.y, commit);
    }
    if (commit) {
      drag.current = null;
      if (ref.current?.hasPointerCapture(d.pointer))
        ref.current.releasePointerCapture(d.pointer);
    }
  };
  const keys = (
    e: React.KeyboardEvent,
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect?.(id);
    }
    const delta: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (delta[e.key] && onMove) {
      e.preventDefault();
      const [dx, dy] = delta[e.key],
        p = position(
          id,
          x + dx * (e.shiftKey ? 3 : 0.5),
          y + dy * (e.shiftKey ? 3 : 0.5),
          w,
          h,
        );
      onMove(id, p.x, p.y, true);
    }
  };
  const selection = (id: string, x: number, y: number, w: number, h: number) =>
    selected === id && onMove ? (
      <g>
        <rect
          x={x - 0.4}
          y={y - 0.4}
          width={w + 0.8}
          height={h + 0.8}
          fill="none"
          stroke="#6c4bda"
          strokeWidth=".4"
          pointerEvents="none"
        />
        {onResize && (
          <rect
            x={x + w - 1.3}
            y={y + h - 1.3}
            width="2.6"
            height="2.6"
            rx=".5"
            fill="white"
            stroke="#6c4bda"
            strokeWidth=".4"
            style={{ cursor: "nwse-resize" }}
            role="button"
            aria-label={
              id === QR_SELECTION ? "Resize QR code" : "Resize selected element"
            }
            onPointerDown={(e) => start(e, id, "resize", x, y, w, h)}
          />
        )}
      </g>
    ) : null;
  return (
    <svg
      className={`cd-card ${onMove ? "editable" : ""}`}
      data-orientation={card.orientation || "landscape"}
      style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}` }}
      ref={ref}
      viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
      role="img"
      aria-label={`Card ${index + 1}, ${side}`}
      onPointerMove={(e) => finishMove(e, false)}
      onPointerUp={(e) => finishMove(e, true)}
      onPointerCancel={(e) => finishMove(e, true)}
    >
      <rect
        width={dimensions.width}
        height={dimensions.height}
        fill={face.background}
        onPointerDown={() => onSelect?.(null)}
      />
      {face.layers.map((layer) => {
        const b = layerBounds(layer);
        return (
          <g key={layer.id}>
            <g
              transform={`translate(${layer.x} ${layer.y})`}
              tabIndex={onSelect ? 0 : undefined}
              role={onSelect ? "button" : undefined}
              aria-label={
                layer.kind === "text"
                  ? `Edit text: ${layer.text}`
                  : `Edit image: ${layer.label}`
              }
              onKeyDown={(e) =>
                keys(e, layer.id, layer.x, layer.y, b.width, b.height)
              }
              onPointerDown={(e) =>
                start(e, layer.id, "move", layer.x, layer.y, b.width, b.height)
              }
            >
              {layer.kind === "image" ? (
                <image
                  href={layer.src}
                  width={layer.width}
                  height={layer.height}
                  preserveAspectRatio="none"
                />
              ) : (
                <>
                  <text
                    fontFamily={FONT_FAMILIES[layer.font]}
                    fontSize={layer.size}
                    fontWeight={layer.bold ? 700 : 400}
                    fill={layer.color}
                  >
                    {layer.text.split("\n").map((line, i) => (
                      <tspan
                        x="0"
                        y={layer.size * 0.8 + i * layer.size * 1.15}
                        key={i}
                      >
                        {line || " "}
                      </tspan>
                    ))}
                  </text>
                  <rect
                    width={Math.max(b.width, 5)}
                    height={b.height}
                    fill="transparent"
                  />
                </>
              )}
            </g>
            {selection(layer.id, layer.x, layer.y, b.width, b.height)}
          </g>
        );
      })}
      {side === "back" && (
        <>
          <g
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label="Move QR code"
            onKeyDown={(e) =>
              keys(
                e,
                QR_SELECTION,
                card.qr.x,
                card.qr.y,
                card.qr.size,
                card.qr.size,
              )
            }
            onPointerDown={(e) =>
              start(
                e,
                QR_SELECTION,
                "move",
                card.qr.x,
                card.qr.y,
                card.qr.size,
                card.qr.size,
              )
            }
          >
            <rect
              x={card.qr.x}
              y={card.qr.y}
              width={card.qr.size}
              height={card.qr.size}
              fill="white"
            />
            {Array.from({ length: code.modules.size }, (_, row) =>
              Array.from({ length: code.modules.size }, (_, col) =>
                code.modules.get(row, col) ? (
                  <rect
                    key={`${row}-${col}`}
                    x={card.qr.x + (col + 4) * unit}
                    y={card.qr.y + (row + 4) * unit}
                    width={unit + 0.001}
                    height={unit + 0.001}
                    fill="black"
                  />
                ) : null,
              ),
            )}
          </g>
          {selection(
            QR_SELECTION,
            card.qr.x,
            card.qr.y,
            card.qr.size,
            card.qr.size,
          )}
        </>
      )}
      {guides && (
        <rect
          x="3"
          y="3"
          width={dimensions.width - 6}
          height={dimensions.height - 6}
          rx="1"
          fill="none"
          stroke="#809282"
          strokeWidth=".15"
          strokeDasharray="1 1"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
