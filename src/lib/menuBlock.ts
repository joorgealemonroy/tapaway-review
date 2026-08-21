export interface MenuItem {
  name: string;
  description?: string;
  price?: string;
  hidden?: boolean;
}

export interface MenuSection {
  name: string;
  items: MenuItem[];
}

export interface MenuContent {
  title: string;
  buttonLabel: string;
  sections: MenuSection[];
}

const DEFAULT_TITLE = "Our Menu";

/** Read a menu block's stored content (sections may be a JSON string or array). */
export function parseMenuContent(raw: unknown): MenuContent {
  const content = (raw || {}) as Record<string, unknown>;
  let sections: MenuSection[] = [];
  try {
    const value = content.sections;
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    if (Array.isArray(parsed)) {
      sections = parsed
        .map((section: Record<string, unknown>) => ({
          name: String(section?.name ?? "").trim(),
          items: Array.isArray(section?.items)
            ? (section.items as Record<string, unknown>[])
                .map((item) => ({
                  name: String(item?.name ?? "").trim(),
                  description: item?.description ? String(item.description).trim() : "",
                  price: item?.price ? String(item.price).trim() : "",
                  hidden: item?.hidden === true || item?.hidden === "true",
                }))
                .filter((item) => item.name.length > 0)
            : [],
        }))
        .filter((section) => section.name.length > 0 || section.items.length > 0);
    }
  } catch {
    sections = [];
  }

  return {
    title: (content.title ? String(content.title) : "").trim() || DEFAULT_TITLE,
    buttonLabel: (content.buttonLabel ? String(content.buttonLabel) : "").trim() || "View Menu",
    sections,
  };
}

/** Serialize a menu into the flat string map used by personal_blocks.content. */
export function serializeMenuContent(menu: MenuContent): Record<string, string> {
  return {
    title: menu.title.trim() || DEFAULT_TITLE,
    buttonLabel: menu.buttonLabel.trim() || "View Menu",
    sections: JSON.stringify(
      menu.sections.map((section) => ({
        name: section.name.trim(),
        items: section.items
          .filter((item) => item.name.trim().length > 0)
          .map((item) => ({
            name: item.name.trim(),
            description: (item.description || "").trim(),
            price: (item.price || "").trim(),
            hidden: !!item.hidden,
          })),
      }))
    ),
  };
}

export function countMenuItems(sections: MenuSection[]): number {
  return sections.reduce((total, section) => total + section.items.length, 0);
}

const PRICE_AT_END = /(?:[-–—.·\s]*)\$?\s*(\d{1,4}(?:[.,]\d{1,2})?)\s*$/;

function normalizePrice(value: string): string {
  const cleaned = value.replace(",", ".");
  return cleaned.startsWith("$") ? cleaned : `$${cleaned}`;
}

/**
 * Turn a pasted menu into sections + items.
 * Heuristics: a line with no price that is short (or ends with ":" / is ALL CAPS)
 * starts a new section; everything else is an item, with a trailing price extracted.
 */
export function parseMenuText(text: string): MenuSection[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const sections: MenuSection[] = [];
  let current: MenuSection | null = null;

  const pushItem = (item: MenuItem) => {
    if (!current) {
      current = { name: "Menu", items: [] };
      sections.push(current);
    }
    current.items.push(item);
  };

  for (const line of lines) {
    const priceMatch = line.match(PRICE_AT_END);
    const withoutPrice = priceMatch ? line.slice(0, priceMatch.index).trim() : line;
    const stripped = withoutPrice.replace(/[.\-–—·:\s]+$/, "").trim();

    const looksLikeSection =
      !priceMatch &&
      stripped.length > 0 &&
      (line.endsWith(":") ||
        (stripped === stripped.toUpperCase() && /[A-Z]/.test(stripped) && stripped.length <= 40) ||
        (stripped.length <= 32 && !stripped.includes(",")));

    if (looksLikeSection) {
      current = { name: stripped, items: [] };
      sections.push(current);
      continue;
    }

    if (!stripped) continue;

    // "Name - description" split
    let name = stripped;
    let description = "";
    const dashSplit = stripped.match(/^(.{2,60}?)\s+[-–—]\s+(.+)$/);
    if (dashSplit) {
      name = dashSplit[1].trim();
      description = dashSplit[2].trim();
    }

    pushItem({
      name,
      description,
      price: priceMatch ? normalizePrice(priceMatch[1]) : "",
    });
  }

  return sections.filter((section) => section.items.length > 0 || section.name.length > 0);
}

/** Merge menu sections, combining sections with the same name and dropping duplicate items. */
export function mergeMenuSections(groups: MenuSection[][]): MenuSection[] {
  const merged: MenuSection[] = [];
  const byName = new Map<string, MenuSection>();

  for (const group of groups) {
    for (const section of group || []) {
      const name = String(section?.name ?? "").trim();
      const key = name.toLowerCase();
      let target = byName.get(key);
      if (!target) {
        target = { name: name || "Menu", items: [] };
        byName.set(key, target);
        merged.push(target);
      }
      for (const item of section?.items || []) {
        const itemName = String(item?.name ?? "").trim();
        if (!itemName) continue;
        const price = (item.price || "").trim();
        const duplicate = target.items.some(
          (existing) =>
            existing.name.toLowerCase() === itemName.toLowerCase() &&
            (existing.price || "").trim() === price
        );
        if (duplicate) continue;
        target.items.push({
          name: itemName,
          description: (item.description || "").trim(),
          price,
          hidden: false,
        });
      }
    }
  }

  return merged.filter((section) => section.items.length > 0);
}

/** Render sections back into the plain-text format the paste box understands. */
export function menuSectionsToText(sections: MenuSection[]): string {
  return sections
    .map((section) => {
      const lines = [section.name.trim().toUpperCase()];
      for (const item of section.items) {
        const desc = (item.description || "").trim();
        const price = (item.price || "").trim();
        lines.push(
          [item.name.trim(), desc ? `- ${desc}` : "", price].filter(Boolean).join(" ").trim()
        );
      }
      return lines.join("\n");
    })
    .join("\n\n");
}
