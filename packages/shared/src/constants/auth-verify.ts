/** Stable API codes for email verification / resend. */
export const AUTH_VERIFY_EMAIL_ERROR_CODES = {
  INVALID_TOKEN: 'INVALID_TOKEN',
  EXPIRED_TOKEN: 'EXPIRED_TOKEN',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
} as const;

export const AUTH_VERIFY_EMAIL_USER_MESSAGES = {
  invalidOrExpired: 'Este enlace de verificación ya no es válido o venció.',
} as const;

export const AUTH_RESEND_VERIFICATION_USER_MESSAGES = {
  accepted:
    'Si la cuenta existe y necesita verificación, te enviaremos un nuevo email.',
  acceptedWithSpamHint:
    'Si tu cuenta necesita verificación, te enviamos un nuevo enlace por email. Revisá también Spam o Correo no deseado.',
  loginHint:
    'Tu email todavía no fue verificado. Revisá tu bandeja de entrada o solicitá un nuevo enlace si el anterior venció.',
  tooManyRequests: 'Esperá un momento antes de volver a solicitar el email.',
} as const;
