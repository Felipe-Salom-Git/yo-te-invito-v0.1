/**
 * User-facing copy for registration wizard (Slice 13 + 12.5).
 * Maps API/Zod/technical errors to Spanish messages — no raw dumps in UI.
 */

import { ApiClientError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/errors';
import {
  AUTH_REGISTER_ERROR_CODES,
  LEGAL_SIGNUP_ERROR_CODES,
  LEGAL_SIGNUP_USER_MESSAGES,
} from '@yo-te-invito/shared';

export const REGISTER_ERROR_MESSAGES = {
  emailDuplicate:
    'Ya existe una cuenta con este email. Iniciá sesión o usá otro correo.',
  passwordMismatch: 'Las contraseñas no coinciden.',
  profileNotAllowed:
    'Ese tipo de perfil no está disponible para registro en esta versión.',
  network:
    'No pudimos completar el registro. Revisá tu conexión e intentá nuevamente.',
  generic:
    'No pudimos crear tu cuenta en este momento. Intentá nuevamente en unos minutos.',
  signInAfterRegister:
    'Tu cuenta fue creada. Iniciá sesión con tu email y contraseña.',
  buyerCityRequired: 'Elegí tu ciudad preferida',
} as const;

const ENGLISH_EMAIL_IN_USE = /email already in use/i;
const ENGLISH_VALIDATION_FAILED = /^validation failed$/i;
const SPANISH_EMAIL_EXISTS =
  /ya existe una cuenta con este email/i;

function bodyCode(err: ApiClientError): string | undefined {
  const body =
    err.body && typeof err.body === 'object' ? (err.body as Record<string, unknown>) : null;
  return typeof body?.code === 'string' ? body.code : undefined;
}

function humanizeValidationDetail(err: ApiClientError): string | null {
  const body =
    err.body && typeof err.body === 'object' ? (err.body as Record<string, unknown>) : null;
  const details = body?.details;
  if (!Array.isArray(details) || details.length === 0) return null;

  const first = details[0] as { path?: unknown[]; message?: string };
  const rawMsg = first.message?.trim();
  if (!rawMsg) return null;

  const path = Array.isArray(first.path) ? first.path.map(String) : [];
  const joined = path.join('.');

  if (joined.includes('profileData.displayName') || joined === 'displayName') {
    if (/required/i.test(rawMsg)) return 'Ingresá el nombre público o comercial.';
    return rawMsg;
  }
  if (joined.includes('websiteUrl')) {
    return rawMsg.includes('http')
      ? 'La URL debe empezar con http:// o https://'
      : rawMsg;
  }
  if (joined.includes('contactEmail') || joined.endsWith('email')) {
    return 'Ingresá un email de contacto válido.';
  }
  if (joined.includes('location.province')) return 'Seleccioná una provincia.';
  if (joined.includes('location.city')) return 'Seleccioná una ciudad.';
  if (joined.includes('location.address')) return 'Ingresá la dirección del local.';
  if (joined.includes('password')) {
    if (/short|min/i.test(rawMsg)) return 'La contraseña debe tener al menos 6 caracteres.';
  }
  if (joined.includes('email') && /invalid/i.test(rawMsg)) return 'Email inválido';

  if (/^[\w.]+:\s/.test(rawMsg)) return rawMsg.replace(/^[\w.]+:\s*/, '');
  return rawMsg;
}

function isEmailDuplicateSignal(err: ApiClientError): boolean {
  const code = bodyCode(err);
  if (code === AUTH_REGISTER_ERROR_CODES.EMAIL_ALREADY_EXISTS || code === 'EMAIL_ALREADY_EXISTS') {
    return true;
  }
  if (err.status === 409 && (code === 'CONFLICT' || !code)) {
    const body =
      err.body && typeof err.body === 'object' ? (err.body as Record<string, unknown>) : null;
    const msg = String(body?.message ?? err.message);
    if (ENGLISH_EMAIL_IN_USE.test(msg) || SPANISH_EMAIL_EXISTS.test(msg)) return true;
  }
  return ENGLISH_EMAIL_IN_USE.test(err.message) || SPANISH_EMAIL_EXISTS.test(err.message);
}

/** True when register failed because the email is already registered. */
export function isRegisterEmailDuplicateError(err: unknown): boolean {
  if (err instanceof ApiClientError) return isEmailDuplicateSignal(err);
  const msg = getErrorMessage(err);
  return ENGLISH_EMAIL_IN_USE.test(msg) || SPANISH_EMAIL_EXISTS.test(msg);
}

/** Map register API/network errors to user-facing Spanish. */
export function mapRegisterApiError(err: unknown): string {
  if (err instanceof ApiClientError) {
    if (isEmailDuplicateSignal(err)) {
      return REGISTER_ERROR_MESSAGES.emailDuplicate;
    }

    const code = bodyCode(err);
    const status = err.status;

    if (code === LEGAL_SIGNUP_ERROR_CODES.CONFIG_UNAVAILABLE) {
      return LEGAL_SIGNUP_USER_MESSAGES.configUnavailable;
    }
    if (code === LEGAL_SIGNUP_ERROR_CODES.MISSING_LEGAL_ACCEPTANCE) {
      return LEGAL_SIGNUP_USER_MESSAGES.missingAcceptanceIds;
    }
    if (code === LEGAL_SIGNUP_ERROR_CODES.INVALID_LEGAL_VERSION) {
      return LEGAL_SIGNUP_USER_MESSAGES.invalidDocument;
    }

    if (status === 401) {
      return 'No pudimos iniciar sesión con tu cuenta nueva. Probá ingresar manualmente.';
    }

    const validationMsg = humanizeValidationDetail(err);
    if (validationMsg) return validationMsg;

    const fromBody =
      err.body && typeof err.body === 'object' && 'message' in err.body
        ? String((err.body as { message?: string }).message)
        : '';
    if (fromBody && !ENGLISH_VALIDATION_FAILED.test(fromBody.trim())) {
      if (ENGLISH_EMAIL_IN_USE.test(fromBody) || SPANISH_EMAIL_EXISTS.test(fromBody)) {
        return REGISTER_ERROR_MESSAGES.emailDuplicate;
      }
      if (fromBody.includes('profileData es requerido')) {
        return 'Completá los datos de tu perfil antes de continuar.';
      }
      if (fromBody.includes('profileType')) {
        return REGISTER_ERROR_MESSAGES.profileNotAllowed;
      }
      return fromBody;
    }

    if (status >= 500) return REGISTER_ERROR_MESSAGES.generic;
    if (status === 400 || status === 422) {
      return 'Revisá los datos del formulario e intentá nuevamente.';
    }
  }

  const msg = getErrorMessage(err);
  if (ENGLISH_EMAIL_IN_USE.test(msg) || SPANISH_EMAIL_EXISTS.test(msg)) {
    return REGISTER_ERROR_MESSAGES.emailDuplicate;
  }
  if (msg === LEGAL_SIGNUP_USER_MESSAGES.acceptanceRequired) {
    return LEGAL_SIGNUP_USER_MESSAGES.acceptanceRequired;
  }
  if (msg === LEGAL_SIGNUP_USER_MESSAGES.configUnavailable) {
    return LEGAL_SIGNUP_USER_MESSAGES.configUnavailable;
  }
  if (msg === LEGAL_SIGNUP_USER_MESSAGES.invalidDocument) {
    return LEGAL_SIGNUP_USER_MESSAGES.invalidDocument;
  }
  if (/failed to fetch|network|load failed/i.test(msg)) {
    return REGISTER_ERROR_MESSAGES.network;
  }
  if (/^Error \(\d+\)$/.test(msg) || msg.startsWith('HTTP ')) {
    return REGISTER_ERROR_MESSAGES.generic;
  }

  return msg;
}
