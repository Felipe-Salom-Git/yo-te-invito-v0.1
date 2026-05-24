import type { ZodIssue } from 'zod';

/** Focus first invalid field or alert inside the registration step (a11y). */
export function focusFirstRegisterError(root: HTMLElement | null | undefined): void {
  if (!root || typeof document === 'undefined') return;

  const invalid =
    root.querySelector<HTMLElement>('input[aria-invalid="true"], select[aria-invalid="true"], textarea[aria-invalid="true"]') ??
    root.querySelector<HTMLElement>('[aria-invalid="true"]');

  if (invalid) {
    invalid.focus({ preventScroll: true });
    invalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  const alert = root.querySelector<HTMLElement>('[data-register-error-summary], [role="alert"]');
  if (alert) {
    if (!alert.hasAttribute('tabindex')) alert.setAttribute('tabindex', '-1');
    alert.focus({ preventScroll: true });
    alert.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

export function zodIssuesToFieldMap(
  issues: ZodIssue[],
  allowedKeys: readonly string[],
): Partial<Record<string, string>> {
  const allowed = new Set(allowedKeys);
  const out: Partial<Record<string, string>> = {};
  for (const issue of issues) {
    const path0 = issue.path[0];
    if (path0 === 'location' && issue.path[1]) {
      const locKey = String(issue.path[1]);
      if (allowed.has(locKey) && !out[locKey]) out[locKey] = issue.message;
      continue;
    }
    if (typeof path0 === 'string' && allowed.has(path0) && !out[path0]) {
      out[path0] = issue.message;
    }
  }
  return out;
}

export function scheduleFocusRegisterError(root: HTMLElement | null | undefined): void {
  queueMicrotask(() => focusFirstRegisterError(root));
}
