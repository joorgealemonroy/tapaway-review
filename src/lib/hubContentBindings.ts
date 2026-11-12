interface ContentBlock {
  block_type: string;
  content: unknown;
  is_active?: boolean | null;
}

function catalogContent(block: ContentBlock): Record<string, unknown> | null {
  if (block.is_active === false || block.block_type !== "menu" || !block.content || typeof block.content !== "object") return null;
  const content = block.content as Record<string, unknown>;
  return content.variant === "meal_catalog" ? content : null;
}

/** An existing image link can open the editable menu without adding a second CTA. */
export function boundMealCatalog(blocks: readonly ContentBlock[], linkId: string): Record<string, unknown> | null {
  for (const block of blocks) {
    const content = catalogContent(block);
    if (content?.triggerLinkId === linkId) return content;
  }
  return null;
}

/** Keep a standalone menu button when its linked tile is removed or hidden. */
export function menuUsesVisibleLink(block: ContentBlock, links: readonly { id: string; is_active?: boolean | null; display_style?: string | null }[]): boolean {
  const content = catalogContent(block);
  return !!content?.triggerLinkId && links.some(link => link.id === content.triggerLinkId && link.is_active !== false && link.display_style !== "icon");
}
