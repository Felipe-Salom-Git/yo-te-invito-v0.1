/**
 * UX copy de responsabilidad por perfil (Slice 11).
 * No reemplaza documentos legales publicados (SIGNUP / PORTAL_ACCESS).
 */

export type ProfileResponsibilityKey =
  | 'USER'
  | 'PRODUCER'
  | 'GASTRO'
  | 'HOTEL'
  | 'REFERRER'
  | 'RENTAL_CONTACT';

export const PROFILE_RESPONSIBILITY_COPY: Record<ProfileResponsibilityKey, string> = {
  USER:
    'Como comprador, sos responsable de revisar los datos del evento, condiciones de compra y políticas aplicables antes de confirmar una operación.',
  PRODUCER:
    'Como productora, sos responsable de la información que publiques sobre tus eventos, precios, condiciones, disponibilidad y atención a compradores.',
  GASTRO:
    'Como gastronómico, sos responsable de mantener actualizada la información del local, promociones, descuentos y condiciones publicadas.',
  HOTEL:
    'Como hotel o alojamiento, sos responsable de mantener actualizada la información de contacto y los datos de tu ficha. En esta versión, Yo Te Invito no gestiona reservas, disponibilidad ni pagos hoteleros.',
  REFERRER:
    'Como referido, entendés que Yo Te Invito registra acuerdos, links y comisiones generadas, pero no administra ni garantiza pagos entre productoras y referidos. La liquidación es manual y externa a la plataforma.',
  RENTAL_CONTACT:
    'Los proveedores de equipos y alquileres se gestionan en esta versión mediante alta operativa del equipo de Yo Te Invito. La plataforma no habilita todavía un portal rental de autogestión.',
};

export function getProfileResponsibilityCopy(key: ProfileResponsibilityKey): string {
  return PROFILE_RESPONSIBILITY_COPY[key];
}
