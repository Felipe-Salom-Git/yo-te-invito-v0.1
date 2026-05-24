import type { MeLegalRequirementItem } from '@/repositories/interfaces';
import type { PublicLegalRequirementsResponse } from '@yo-te-invito/shared';
import { LEGAL_SIGNUP_USER_MESSAGES } from '@yo-te-invito/shared';

export function allLegalItemsSelected(
  items: MeLegalRequirementItem[],
  selectedVersionIds: string[],
): boolean {
  if (items.length === 0) return true;
  return items.every((i) => selectedVersionIds.includes(i.documentVersionId));
}

/** @deprecated Use LEGAL_SIGNUP_USER_MESSAGES.acceptanceRequired */
export const LEGAL_ACCEPTANCE_REQUIRED_MSG = LEGAL_SIGNUP_USER_MESSAGES.acceptanceRequired;

export type SignupLegalValidationResult =
  | { ok: true }
  | { ok: false; error: string; reason: 'loading' | 'fetch' | 'config' | 'acceptance' };

export function validateSignupLegalState(
  signupLegal: PublicLegalRequirementsResponse | undefined,
  selectedVersionIds: string[],
  options: { loading: boolean; fetchError: boolean },
): SignupLegalValidationResult {
  if (options.loading) {
    return { ok: false, error: '', reason: 'loading' };
  }
  if (options.fetchError || !signupLegal) {
    return {
      ok: false,
      error: LEGAL_SIGNUP_USER_MESSAGES.loadError,
      reason: 'fetch',
    };
  }
  if (!signupLegal.canProceed) {
    return {
      ok: false,
      error: LEGAL_SIGNUP_USER_MESSAGES.configUnavailable,
      reason: 'config',
    };
  }
  if (
    signupLegal.required.length > 0 &&
    !allLegalItemsSelected(signupLegal.required, selectedVersionIds)
  ) {
    return {
      ok: false,
      error: LEGAL_SIGNUP_USER_MESSAGES.acceptanceRequired,
      reason: 'acceptance',
    };
  }
  return { ok: true };
}
