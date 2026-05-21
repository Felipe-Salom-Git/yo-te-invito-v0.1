# HOOK_TEMPLATE.md
## React Hook Template (Data + Actions)
### Ticketera – Yo Te Invito

Use this template for hooks that encapsulate:
- data fetching
- mutation actions
- caching / invalidation (if your stack supports it)
- state machine for UI states

Hooks must:
- expose a clean API to components
- keep side-effects predictable
- centralize error handling mapping (as needed)

---

# 1) When to Use

Create a hook when:
- multiple components need the same data/actions
- a page needs a cohesive “view model”
- you want consistent loading/error patterns

---

# 2) File Placement & Naming

Recommended:
- `src/hooks/use<Thing>.ts` or `src/hooks/<module>/use<Thing>.ts`

Naming:
- `useInvitations`, `useEventDetails`, `useCreateInvitation`

---

# 3) Hook API Design

Return:
- `data`
- `isLoading`
- `error`
- `actions` (functions)
- optional `refresh` / `reset`

Avoid returning too many fields. Prefer grouping actions.

---

# 4) Implementation Skeleton

~~~ts
// src/hooks/<module>/useThing.ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { apiClient } from "../../lib/apiClient"; // adjust

export type UseThingState<T> = {
  data: T | null;
  isLoading: boolean;
  error: string | null;
};

export function useThing(params: { eventId: string }) {
  const [state, setState] = useState<UseThingState<any>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const res = await apiClient.get(`/api/events/${params.eventId}/invitations`);
      setState({ data: res.data, isLoading: false, error: null });
    } catch (err: any) {
      // Map API error shape to a user-friendly message
      const msg =
        err?.response?.data?.error?.message ??
        err?.message ??
        "Unexpected error";
      setState({ data: null, isLoading: false, error: msg });
    }
  }, [params.eventId]);

  const actions = useMemo(
    () => ({
      refresh: load,
    }),
    [load]
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    ...state,
    ...actions,
  };
}
~~~

---

# 5) Error Handling Guidance

- normalize API error shape into a small set of messages/codes
- keep raw error objects out of UI components
- consider exposing `errorCode` if frontend needs branching

---

# 6) AI Self-Review

- [ ] Hook API is small and ergonomic
- [ ] Loading/error states are consistent
- [ ] Side-effects are controlled (useEffect + stable callbacks)
- [ ] No duplicated hook exists
- [ ] Under ~300–400 lines

# End of HOOK_TEMPLATE.md