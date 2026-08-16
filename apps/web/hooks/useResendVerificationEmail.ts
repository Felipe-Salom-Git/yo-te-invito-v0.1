'use client';

import { useCallback, useState } from 'react';
import {
  AUTH_RESEND_VERIFICATION_USER_MESSAGES,
  AUTH_VERIFY_EMAIL_ERROR_CODES,
} from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { ApiClientError } from '@/lib/api/client';

export type ResendVerificationStatus = 'idle' | 'loading' | 'success' | 'error';

export function useResendVerificationEmail() {
  const repos = useRepositories();
  const [status, setStatus] = useState<ResendVerificationStatus>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const resend = useCallback(
    async (email: string) => {
      const normalized = email.trim().toLowerCase();
      if (!normalized || status === 'loading') return;

      setStatus('loading');
      setMessage(null);
      try {
        await repos.auth.resendVerificationEmail({ email: normalized });
        setStatus('success');
        setMessage(AUTH_RESEND_VERIFICATION_USER_MESSAGES.acceptedWithSpamHint);
      } catch (err) {
        const isTooMany =
          err instanceof ApiClientError &&
          (err.status === 429 ||
            (err.body &&
              typeof err.body === 'object' &&
              'code' in err.body &&
              (err.body as { code?: string }).code ===
                AUTH_VERIFY_EMAIL_ERROR_CODES.TOO_MANY_REQUESTS));
        if (isTooMany) {
          setStatus('error');
          setMessage(AUTH_RESEND_VERIFICATION_USER_MESSAGES.tooManyRequests);
          return;
        }
        setStatus('success');
        setMessage(AUTH_RESEND_VERIFICATION_USER_MESSAGES.acceptedWithSpamHint);
      }
    },
    [repos, status],
  );

  return { resend, status, message, isLoading: status === 'loading' };
}
