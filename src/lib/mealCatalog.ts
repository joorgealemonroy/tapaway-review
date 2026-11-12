export interface MealCatalogItem {
  id: string;
  name: string;
  description: string;
  price: string | null;
  imageUrl: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  serving: string;
  allergens: string[];
}

export interface MealCatalogSection {
  id: string;
  name: string;
  items: MealCatalogItem[];
}

export interface MealCatalogContent {
  title: string;
  buttonLabel: string;
  sections: MealCatalogSection[];
  orderUrl: string | null;
  sourceUrl: string | null;
  updatedAt: string | null;
  triggerLinkId: string;
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function text(value: unknown, max = 200): string {
  return typeof value === "string" || typeof value === "number" ? String(value).trim().slice(0, max) : "";
}

/** Images can live on this app; ordering/source destinations must use HTTPS. */
export function safeMealCatalogUrl(value: unknown, allowRootRelative = false): string | null {
  if (typeof value !== "string" || /[\u0000-\u001f\u007f\\<>]/.test(value)) return null;
  const clean = value.trim();
  if (allowRootRelative && /^\/(?!\/)[^\s]*$/.test(clean)) return clean;
  if (!/^https:\/\//i.test(clean)) return null;
  try {
    const url = new URL(clean);
    return url.protocol === "https:" && url.hostname && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function nutrition(value: unknown): number | null {
  if (typeof value !== "number" && !(typeof value === "string" && /^\d+(?:\.\d+)?$/.test(value))) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function parseMealCatalog(raw: unknown): MealCatalogContent {
  const content = object(raw);
  let rawSections: unknown = content.sections;
  try { if (typeof rawSections === "string") rawSections = JSON.parse(rawSections); } catch { rawSections = []; }
  const sections = (Array.isArray(rawSections) ? rawSections : []).slice(0, 100).map((value, sectionIndex) => {
    const section = object(value);
    const sectionId = `${text(section.id) || "section"}-${sectionIndex}`;
    const items = (Array.isArray(section.items) ? section.items : []).slice(0, 500).flatMap((value, itemIndex): MealCatalogItem[] => {
      const item = object(value);
      const name = text(item.name);
      if (!name || item.hidden === true || item.hidden === "true") return [];
      const macros = object(item.macros);
      const price = typeof item.price === "number" && Number.isFinite(item.price) && item.price >= 0
        ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.price)
        : typeof item.price === "string" ? text(item.price, 80) || null : null;
      return [{
        id: `${sectionId}-${text(item.id) || "item"}-${itemIndex}`,
        name,
        description: text(item.description, 1500),
        price,
        imageUrl: safeMealCatalogUrl(item.imageUrl, true),
        calories: nutrition(item.calories ?? macros.calories),
        protein: nutrition(item.protein ?? macros.proteinGrams),
        carbs: nutrition(item.carbs ?? macros.carbsGrams),
        fat: nutrition(item.fat ?? macros.fatGrams),
        serving: text(item.serving ?? item.servingLabel, 120),
        allergens: Array.isArray(item.allergens) ? [...new Set(item.allergens.map(value => text(value, 60)).filter(Boolean))] : [],
      }];
    });
    return { id: sectionId, name: text(section.name) || "Menu", items };
  }).filter(section => section.items.length > 0);
  const date = text(content.updatedAt, 32).slice(0, 10);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date + "T00:00:00Z")) &&
    new Date(date + "T00:00:00Z").toISOString().slice(0, 10) === date;
  const sourceUrl = safeMealCatalogUrl(content.sourceUrl);
  return {
    title: text(content.title) || "AV’s menu",
    buttonLabel: text(content.buttonLabel) || "Explore the menu",
    sections,
    orderUrl: safeMealCatalogUrl(content.orderUrl) || sourceUrl,
    sourceUrl,
    updatedAt: validDate ? date : null,
    triggerLinkId: text(content.triggerLinkId),
  };
}

const searchText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export function filterMealCatalog(sections: MealCatalogSection[], query: string, sectionId = "all"): MealCatalogSection[] {
  const search = searchText(query.trim());
  return sections.filter(section => sectionId === "all" || section.id === sectionId).map(section => ({
    ...section,
    items: !search || searchText(section.name).includes(search) ? section.items : section.items.filter(item =>
      searchText([item.name, item.description, ...item.allergens].join(" ")).includes(search)),
  })).filter(section => section.items.length > 0);
}
