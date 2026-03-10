/**
 * Unified credential validation (demo + dynamic referrers).
 * Server-side only.
 */
import type { DemoUser } from './demo-users';
import { validateDemoUser } from './demo-users';
import { findDynamicUserByEmail } from './dynamic-users';

export function validateAnyUser(email: string, password: string): DemoUser | null {
  const demo = validateDemoUser(email, password);
  if (demo) return demo;
  const dynamic = findDynamicUserByEmail(email);
  if (!dynamic || dynamic.password !== password) return null;
  return dynamic;
}
