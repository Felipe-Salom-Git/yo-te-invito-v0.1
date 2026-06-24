/** User-facing copy for legal signup hardening (Slice 4). */
export const LEGAL_SIGNUP_USER_MESSAGES = {
  configUnavailable:
    'El registro no está disponible temporalmente porque los documentos legales requeridos todavía no fueron publicados. Intentá más tarde o contactá a soporte.',
  loadError:
    'No pudimos cargar los documentos legales requeridos. Revisá tu conexión e intentá nuevamente.',
  acceptanceRequired:
    'Para crear la cuenta tenés que aceptar todos los documentos legales requeridos para este perfil.',
  acceptFailedPostRegister:
    'Tu cuenta fue creada, pero falta completar la aceptación legal. Aceptá los documentos vigentes y reintentá para terminar el alta.',
  invalidDocument:
    'Uno de los documentos legales seleccionados ya no está disponible o fue actualizado. Volvé a revisar los términos.',
  missingAcceptanceIds:
    'Para crear la cuenta tenés que aceptar todos los documentos legales requeridos para este perfil.',
} as const;

export const LEGAL_SIGNUP_ERROR_CODES = {
  CONFIG_UNAVAILABLE: 'LEGAL_SIGNUP_CONFIG_UNAVAILABLE',
  INVALID_LEGAL_VERSION: 'LEGAL_SIGNUP_INVALID_VERSION',
  MISSING_LEGAL_ACCEPTANCE: 'LEGAL_SIGNUP_MISSING_ACCEPTANCE',
  /** Alias for clients expecting LEGAL_ACCEPTANCE_REQUIRED */
  LEGAL_ACCEPTANCE_REQUIRED: 'LEGAL_ACCEPTANCE_REQUIRED',
} as const;
