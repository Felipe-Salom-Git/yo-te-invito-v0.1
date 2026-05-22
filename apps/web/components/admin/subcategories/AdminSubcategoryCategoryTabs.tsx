'use client';

import {
  ADMIN_SUBCATEGORY_TABS,
  type AdminSubcategoryTab,
} from '@/lib/admin/admin-subcategory-categories';
import type { ContentCategory } from '@/repositories/interfaces';

type AdminSubcategoryCategoryTabsProps = {
  active: ContentCategory;
  onChange: (category: ContentCategory) => void;
};

export function AdminSubcategoryCategoryTabs({
  active,
  onChange,
}: AdminSubcategoryCategoryTabsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Categorías">
      {ADMIN_SUBCATEGORY_TABS.map((tab: AdminSubcategoryTab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            active === tab.id
              ? 'bg-accent text-bg'
              : 'border border-border text-text-muted hover:text-text'
          }`}
        >
          {tab.label}
          {!tab.manageable ? (
            <span className="ml-1.5 text-[10px] font-normal opacity-80">· Próximamente</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}
