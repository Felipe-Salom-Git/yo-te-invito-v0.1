import {
  POST_REGISTER_EMAIL_NOTICE_BODY,
  POST_REGISTER_EMAIL_NOTICE_TITLE,
  POST_REGISTER_VERIFY_BODY,
  POST_REGISTER_VERIFY_TITLE,
  POST_QR_EMAIL_NOTICE_BODY,
  POST_QR_EMAIL_NOTICE_TITLE,
} from '@/lib/ux/email-inbox-notices';

type Variant = 'register' | 'registerVerify' | 'qr';

type Props = {
  variant: Variant;
  className?: string;
};

const COPY: Record<Variant, { title: string; body: string }> = {
  register: {
    title: POST_REGISTER_EMAIL_NOTICE_TITLE,
    body: POST_REGISTER_EMAIL_NOTICE_BODY,
  },
  registerVerify: {
    title: POST_REGISTER_VERIFY_TITLE,
    body: POST_REGISTER_VERIFY_BODY,
  },
  qr: {
    title: POST_QR_EMAIL_NOTICE_TITLE,
    body: POST_QR_EMAIL_NOTICE_BODY,
  },
};

export function EmailInboxNotice({ variant, className = '' }: Props) {
  const { title, body } = COPY[variant];

  return (
    <div
      className={`rounded-lg border border-accent-muted bg-accent-surface/70 px-4 py-3 text-sm text-accent-soft ${className}`}
      role="status"
      aria-live="polite"
    >
      <p className="font-medium text-text">{title}</p>
      <p className="mt-1 text-text-muted">{body}</p>
    </div>
  );
}
