import type { MouseEventHandler } from "react";

interface HubLinkButtonProps {
  href: string;
  label: string;
  colors: { background: string; color: string };
  target?: string;
  rel?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  /** Smaller sizing for the editor's phone preview. */
  compact?: boolean;
}

/**
 * Plain full-width call-to-action used for "Button" links and hubs with
 * Buttons only switched on. No icon, thumbnail or external-link arrow;
 * long labels wrap instead of being cut off.
 */
export function HubLinkButton({ href, label, colors, target, rel, onClick, compact = false }: HubLinkButtonProps) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      data-hub-link-button=""
      className={`flex w-full items-center justify-center rounded-xl text-center font-semibold leading-snug shadow-sm transition-transform active:scale-[0.98] ${
        compact ? "min-h-[44px] px-4 py-2.5 text-sm" : "min-h-[52px] px-5 py-3.5 text-base"
      }`}
      style={{ backgroundColor: colors.background, color: colors.color }}
    >
      <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere]">{label}</span>
    </a>
  );
}
