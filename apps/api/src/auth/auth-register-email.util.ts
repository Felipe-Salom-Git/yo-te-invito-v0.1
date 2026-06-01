import type { RegistrationProfileType } from '@yo-te-invito/shared';
import type { EmailTemplateId } from '../email/templates/email-template.types';
import { getDefaultSupportEmail } from '../email/templates/email-template.util';

function readDisplayName(profileData: unknown): string {
  if (!profileData || typeof profileData !== 'object') return '';
  const name = (profileData as { displayName?: unknown }).displayName;
  return typeof name === 'string' ? name.trim() : '';
}

export function welcomeTemplateIdForProfile(
  profileType: RegistrationProfileType,
): EmailTemplateId {
  switch (profileType) {
    case 'USER':
      return 'AUTH_WELCOME_BUYER';
    case 'PRODUCER':
      return 'AUTH_WELCOME_PRODUCER';
    case 'GASTRO':
      return 'AUTH_WELCOME_GASTRO';
    case 'HOTEL':
      return 'AUTH_WELCOME_HOTEL';
    case 'REFERRER':
      return 'AUTH_WELCOME_REFERRER';
    default:
      return 'AUTH_WELCOME_BUYER';
  }
}

export function buildWelcomeTemplateVariables(
  profileType: RegistrationProfileType,
  userName: string,
  profileData: unknown,
  appUrl: string,
): Record<string, unknown> {
  const base = appUrl.replace(/\/$/, '');
  const supportEmail = getDefaultSupportEmail();
  const businessName = readDisplayName(profileData);

  switch (profileType) {
    case 'USER':
      return {
        userName,
        portalUrl: `${base}/me`,
        supportEmail,
      };
    case 'PRODUCER':
      return {
        userName,
        producerName: businessName || 'Tu productora',
        dashboardUrl: `${base}/producer`,
        profileUrl: `${base}/producer/profile`,
        supportEmail,
      };
    case 'GASTRO':
      return {
        userName,
        businessName: businessName || 'Tu local',
        dashboardUrl: `${base}/gastro`,
        contentUrl: `${base}/gastro/contenido`,
        supportEmail,
      };
    case 'HOTEL':
      return {
        userName,
        hotelName: businessName || 'Tu hotel',
        dashboardUrl: `${base}/hotel`,
        profileUrl: `${base}/hotel/editar`,
        supportEmail,
      };
    case 'REFERRER':
      return {
        userName,
        referrerName: businessName || 'Tu perfil de referido',
        dashboardUrl: `${base}/referrer`,
        supportEmail,
      };
    default:
      return { userName, portalUrl: `${base}/me`, supportEmail };
  }
}
