import { describe, expect, it } from 'vitest';
import {
  MIN_SUBCATEGORY_RAIL_ITEMS,
  shouldRenderSubcategoryRail,
} from './subcategoryRailThreshold';

describe('shouldRenderSubcategoryRail', () => {
  it('requires at least five public items', () => {
    expect(MIN_SUBCATEGORY_RAIL_ITEMS).toBe(5);
    expect(shouldRenderSubcategoryRail(0)).toBe(false);
    expect(shouldRenderSubcategoryRail(4)).toBe(false);
    expect(shouldRenderSubcategoryRail(5)).toBe(true);
    expect(shouldRenderSubcategoryRail(6)).toBe(true);
  });
});
