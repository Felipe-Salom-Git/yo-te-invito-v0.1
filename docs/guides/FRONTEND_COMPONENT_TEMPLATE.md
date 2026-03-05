# FRONTEND_COMPONENT_TEMPLATE.md
## Frontend Component Template (React)
### Ticketera – Yo Te Invito

Use this template for a new React component that follows project frontend conventions:
- clean component boundaries
- minimal props surface
- typed props and events
- calls hooks/services for data (no direct fetch scattered everywhere)
- consistent loading/error/empty states

---

# 1) When to Use

Create a component when:
- UI is reused in multiple screens
- UI block is complex enough to deserve isolation
- you need a consistent pattern for states and accessibility

---

# 2) File Placement & Naming

Recommended:
- `src/components/<module>/<ComponentName>.tsx`
- `src/pages/<module>/<PageName>.tsx` (pages compose components)

Naming:
- Component file: `PascalCase.tsx`
- Component name: `PascalCase`
- Prefer colocated `index.ts` exports if your repo uses barrel exports.

---

# 3) Component Rules

Component must:
- be primarily presentational OR clearly labeled as container component
- handle `loading / error / empty / success` states
- avoid business logic (belongs in hooks/services)
- be accessible (labels, aria where needed)

---

# 4) Props Design

- keep props minimal
- prefer passing IDs and let hook load data (when appropriate)
- prefer callbacks for actions
- avoid passing large objects unless needed

---

# 5) Implementation Skeleton

~~~tsx
// src/components/<module>/<ComponentName>.tsx
import React from "react";

export type ComponentNameProps = {
  title: string;
  description?: string;
  isLoading?: boolean;
  errorMessage?: string | null;
  onPrimaryAction?: () => void;
};

export function ComponentName({
  title,
  description,
  isLoading = false,
  errorMessage = null,
  onPrimaryAction,
}: ComponentNameProps) {
  if (isLoading) {
    return (
      <section aria-busy="true" aria-live="polite">
        <p>Loading...</p>
      </section>
    );
  }

  if (errorMessage) {
    return (
      <section role="alert">
        <p>{errorMessage}</p>
        {onPrimaryAction ? (
          <button type="button" onClick={onPrimaryAction}>
            Retry
          </button>
        ) : null}
      </section>
    );
  }

  return (
    <section>
      <header>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </header>

      <div>
        {/* Content */}
      </div>

      {onPrimaryAction ? (
        <footer>
          <button type="button" onClick={onPrimaryAction}>
            Primary Action
          </button>
        </footer>
      ) : null}
    </section>
  );
}
~~~

---

# 6) Styling Conventions

Follow the project styling system:
- use the existing design system/components if present
- avoid inline styles unless trivial
- keep layout consistent with other components

---

# 7) Testing Checklist (Optional but Recommended)

- [ ] renders title
- [ ] renders loading state
- [ ] renders error state
- [ ] calls `onPrimaryAction` when clicked

---

# 8) AI Self-Review

- [ ] No business logic inside component
- [ ] States handled cleanly
- [ ] Props typed and minimal
- [ ] Accessible markup
- [ ] Under ~300–400 lines

# End of FRONTEND_COMPONENT_TEMPLATE.md