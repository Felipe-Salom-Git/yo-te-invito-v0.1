/** Stable API codes for `POST /auth/login`. */
export const AUTH_LOGIN_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
} as const;

export const AUTH_LOGIN_USER_MESSAGES = {
  invalidCredentials: 'Email o contraseña incorrectos.',
  emailNotVerified:
    'Tenés que confirmar tu email antes de ingresar. Revisá tu bandeja de entrada y también Spam o Correo no deseado.',
} as const;
