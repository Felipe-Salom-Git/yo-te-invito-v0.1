'use client';

import { ReactNode, useState } from 'react';

interface Tab {
  id: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultValue?: string;
  className?: string;
}

export function Tabs({ tabs, defaultValue, className = '' }: TabsProps) {
  const [activeId, setActiveId] = useState(defaultValue ?? tabs[0]?.id ?? '');
  const activeTab = tabs.find((t) => t.id === activeId) ?? tabs[0];

  return (
    <div className={className}>
        <div className="flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveId(tab.id)}
              className={`
                px-4 py-2 text-sm font-medium transition-colors
                ${activeId === tab.id
                  ? 'border-b-2 border-accent text-accent'
                  : 'text-text-muted hover:text-text'
                }
              `}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="mt-4">{activeTab?.content}</div>
      </div>
  );
}
