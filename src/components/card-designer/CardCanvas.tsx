import { useMemo, useRef } from "react";
import QRCode from "qrcode";
import {
  CARD_MM,
  FONT_FAMILIES,
  cardDestination,
  type CardDraft,
  type Layer,
} from "@/lib/cardDesign";
type Props = {
  draft: CardDraft;
  card: number;
  side: "front" | "back";
  guides?: boolean;
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  onMove?: (id: string, x: number, y: number, commit: boolean) => void;
};
export function CardCanvas({
  draft,
  card: index,
  side,
  guides = false,
  selected,
  onSelect,
  onMove,
}: Props) {
  const card = draft.cards[index],
    face = card[side];
  const ref = useRef<SVGSVGElement>(null);
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    x: number;
    y: number;
    pointer: number;
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
  const point = (clientX: number, clientY: number) => {
    const box = ref.current!.getBoundingClientRect();
    return {
      x: ((clientX - box.left) / box.width) * CARD_MM.width,
      y: ((clientY - box.top) / box.height) * CARD_MM.height,
    };
  };
  const bounds = (layer: Layer) =>
    layer.kind === "image"
      ? { width: layer.width, height: layer.height }
      : {
          width: Math.max(
            12,
            ...layer.text.split("\n").map((x) => x.length * layer.size * 0.56),
          ),
          height: layer.size * 1.15 * layer.text.split("\n").length,
        };
  return (
    <svg
      className={`cd-card ${guides ? "editable" : ""}`}
      ref={ref}
      viewBox={`0 0 ${CARD_MM.width} ${CARD_MM.height}`}
      role="img"
      aria-label={`Card ${index + 1}, ${side}`}
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onSelect?.(null);
      }}
      onPointerMove={(e) => {
        if (!drag.current || !onMove) return;
        const p = point(e.clientX, e.clientY),
          d = drag.current;
        onMove(
          d.id,
          Math.max(0, Math.min(CARD_MM.width - 4, d.x + p.x - d.startX)),
          Math.max(0, Math.min(CARD_MM.height - 4, d.y + p.y - d.startY)),
          false,
        );
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        if (!d) return;
        drag.current = null;
        if (ref.current?.hasPointerCapture(d.pointer))
          ref.current.releasePointerCapture(d.pointer);
        const p = point(e.clientX, e.clientY);
        onMove?.(
          d.id,
          Math.max(0, Math.min(CARD_MM.width - 4, d.x + p.x - d.startX)),
          Math.max(0, Math.min(CARD_MM.height - 4, d.y + p.y - d.startY)),
          true,
        );
      }}
      onPointerCancel={() => {
        drag.current = null;
      }}
    >
      <rect
        width={CARD_MM.width}
        height={CARD_MM.height}
        fill={face.background}
        onPointerDown={() => onSelect?.(null)}
      />
      {face.layers.map((layer) => (
        <g
          key={layer.id}
          transform={`translate(${layer.x} ${layer.y})`}
          tabIndex={onSelect ? 0 : undefined}
          role={onSelect ? "button" : undefined}
          aria-label={
            layer.kind === "text"
              ? `Edit text: ${layer.text}`
              : `Edit image: ${layer.label}`
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onSelect?.(layer.id);
            }
            const deltas: Record<string, [number, number]> = {
              ArrowLeft: [-1, 0],
              ArrowRight: [1, 0],
              ArrowUp: [0, -1],
              ArrowDown: [0, 1],
            };
            if (deltas[e.key] && onMove) {
              e.preventDefault();
              const [x, y] = deltas[e.key];
              onMove(
                layer.id,
                Math.max(0, layer.x + x),
                Math.max(0, layer.y + y),
                true,
              );
            }
          }}
          onPointerDown={(e) => {
            if (!onMove) return;
            e.preventDefault();
            e.stopPropagation();
            onSelect?.(layer.id);
            const p = point(e.clientX, e.clientY);
            drag.current = {
              id: layer.id,
              startX: p.x,
              startY: p.y,
              x: layer.x,
              y: layer.y,
              pointer: e.pointerId,
            };
            ref.current?.setPointerCapture(e.pointerId);
          }}
        >
          {layer.kind === "image" ? (
            <image
              href={layer.src}
              width={layer.width}
              height={layer.height}
              preserveAspectRatio="none"
            />
          ) : (
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
          )}
          {selected === layer.id && (
            <rect
              x="-0.5"
              y="-0.5"
              width={bounds(layer).width + 1}
              height={bounds(layer).height + 1}
              fill="none"
              stroke="#367af6"
              strokeWidth="0.35"
              strokeDasharray="1 0.6"
              pointerEvents="none"
            />
          )}
          {layer.kind === "text" && (
            <rect
              width={bounds(layer).width}
              height={bounds(layer).height}
              fill="transparent"
            />
          )}
        </g>
      ))}
      {side === "back" && (
        <g aria-label="QR code with four-module quiet zone">
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
      )}
      {guides && (
        <rect
          x="3"
          y="3"
          width={CARD_MM.width - 6}
          height={CARD_MM.height - 6}
          rx="1"
          fill="none"
          stroke="#809282"
          strokeWidth="0.15"
          strokeDasharray="1 1"
          pointerEvents="none"
        />
      )}
    </svg>
  );
}
