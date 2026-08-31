/** Minimum public items required to show a per-subcategory carousel rail. */
export const MIN_SUBCATEGORY_RAIL_ITEMS = 5;

export function shouldRenderSubcategoryRail(itemCount: number): boolean {
  return itemCount >= MIN_SUBCATEGORY_RAIL_ITEMS;
}
