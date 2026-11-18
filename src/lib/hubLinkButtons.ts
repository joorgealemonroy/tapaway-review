/**
 * Shared rules for the plain "Button" link look and the per-hub
 * "Buttons only" setting. Both the public hub page and the editor's live
 * preview use these so they always agree.
 *
 * Buttons only is a render-time override: it never rewrites a link's saved
 * display_style, so switching it off restores every link's own look.
 */
export const LINK_BUTTON_STYLE = "button";

export interface HubStyledLink {
  display_style?: string | null;
  is_active?: boolean | null;
  url?: string | null;
  cover_image_url?: string | null;
  grid_size?: string | null;
}

/** True when this link should render as a plain full-width button. */
export function rendersAsButton(link: Pick<HubStyledLink, "display_style">, buttonsOnly: boolean | null | undefined): boolean {
  return buttonsOnly === true || link.display_style === LINK_BUTTON_STYLE;
}

/** Half-width image tiles are grouped into a 2-column grid unless shown as buttons. */
export function isGridTileLink(link: HubStyledLink, buttonsOnly: boolean | null | undefined): boolean {
  return !rendersAsButton(link, buttonsOnly) && !!link.cover_image_url && link.grid_size === "half";
}

const hasUrl = (link: HubStyledLink) => !!link.url && link.url.trim() !== "";

/**
 * Splits active links into the small icon bar and the main list.
 * With Buttons only, the icon bar is suppressed and icon-only links join the
 * button stack so no destination disappears.
 */
export function splitHubLinks<T extends HubStyledLink>(links: T[], buttonsOnly: boolean | null | undefined): { iconLinks: T[]; listLinks: T[] } {
  const active = links.filter((l) => l.is_active !== false);
  if (buttonsOnly === true) {
    return { iconLinks: [], listLinks: active.filter((l) => l.display_style !== "icon" || hasUrl(l)) };
  }
  return {
    iconLinks: active.filter((l) => hasUrl(l) && (l.display_style === "icon" || l.display_style === "both")),
    listLinks: active.filter((l) => l.display_style !== "icon"),
  };
}

const HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

function luminance(hex: string): number {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Hub-palette button colors: the hub's button color when it is a real hex,
 * otherwise a solid button that contrasts with the page. Text is always
 * picked for legibility against the button.
 */
export function hubButtonColors(buttonTheme: string | null | undefined, pageIsDark: boolean): { background: string; color: string } {
  const background = buttonTheme && HEX.test(buttonTheme) ? buttonTheme : pageIsDark ? "#FFFFFF" : "#1A1A1A";
  return { background, color: luminance(background) > 0.4 ? "#1A1A1A" : "#FFFFFF" };
}
