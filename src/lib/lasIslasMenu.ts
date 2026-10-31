export const LAS_ISLAS_MENU_HUBS = [
  { id: "aff3e306-8ccf-4c55-b33f-88da2d17bba8", slug: "lasislasfontana" },
  { id: "e0e6ff46-9574-4df8-84bd-94ecedfbd4fd", slug: "lasislasmarias" },
] as const;

export const hasLasIslasMenu = (id: string) => LAS_ISLAS_MENU_HUBS.some(hub => hub.id === id);
export const normalizeMenuSearch = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export interface LasIslasMenuItem { id: string; name: string; description: string | null; price: string | null }
export interface LasIslasMenuSection { id: string; name: string; items: LasIslasMenuItem[] }
export function filterMenu(sections: LasIslasMenuSection[], query: string) {
  const search = normalizeMenuSearch(query);
  if (!search) return sections;
  return sections.map(section => ({ ...section, items: normalizeMenuSearch(section.name).includes(search) ? section.items : section.items.filter(item => normalizeMenuSearch(`${item.name} ${item.description ?? ""} ${item.price ?? ""}`).includes(search)) })).filter(section => section.items.length > 0);
}