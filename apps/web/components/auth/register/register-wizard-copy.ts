import type { RegistrationProfileType } from '@yo-te-invito/shared';

export const REGISTER_WIZARD_COPY = {
  title: 'Crear cuenta',
  account: {
    heading: 'Tus datos de acceso',
    subtitle: 'Empezá con tu nombre, email y contraseña.',
  },
  profile: {
    heading: '¿Cómo querés usar Yo Te Invito?',
    subtitle: 'Elegí el tipo de cuenta. Podés cambiar de portal más adelante si tenés otros perfiles.',
  },
  buyer: {
    heading: 'Tus datos de comprador',
    subtitle:
      'Estos datos nos ayudan a mostrarte eventos y experiencias más relevantes para tu ciudad.',
    cityLabel: 'Ciudad preferida',
    cityHint: 'Ciudad donde querés descubrir eventos y experiencias.',
    afterRegister:
      'Tu cuenta ya está lista. Te llevamos a tu portal para ver tus tickets, preferencias y recomendaciones.',
  },
  gastro: {
    heading: 'Creá tu perfil gastronómico',
    subtitle:
      'Cargá los datos básicos de tu local. Después vas a poder completar horarios, imágenes, descuentos y contenido desde tu portal gastronómico.',
    intro:
      'Cargá los datos básicos de tu local. Después vas a poder completar horarios, imágenes, descuentos y contenido desde tu portal gastronómico.',
    displayNameLabel: 'Nombre del local',
    displayNamePlaceholder: 'Ej: La Esquina del Lago',
    contactEmailLabel: 'Email de contacto del local',
    contactEmailHint: 'Lo usaremos como contacto operativo del perfil gastronómico.',
    provinceLabel: 'Provincia',
    cityLabel: 'Ciudad',
    provincePlaceholder: 'Seleccioná una provincia',
    cityProvinceFirstHint: 'Primero elegí una provincia',
    citySelectPlaceholder: 'Seleccioná una ciudad',
    cityNoOptionsHint: 'Todavía no hay ciudades disponibles para esta provincia.',
    citySelectHint: 'Primero elegí una provincia para ver las ciudades disponibles.',
    addressLabel: 'Dirección del local',
    addressHint:
      'No hace falta ubicar el mapa ahora. Podés completar la ubicación precisa desde el portal.',
    portalHint:
      'Tu perfil gastronómico puede mostrar contenido, descuentos, valoraciones y datos de contacto. La publicación final se completa desde el portal.',
    afterRegister:
      'Tu perfil inicial ya está listo. Te llevamos al portal gastronómico para completar horarios, mapa e imágenes.',
  },
  referrer: {
    heading: 'Creá tu perfil de referido',
    subtitle:
      'Usaremos este nombre para crear tu perfil inicial. Después vas a poder revisar propuestas, acuerdos y métricas desde tu portal.',
    intro:
      'Usaremos este nombre para crear tu perfil inicial. Después vas a poder revisar propuestas, acuerdos y métricas desde tu portal.',
    displayNameLabel: 'Nombre público',
    displayNamePlaceholder: 'Ej: Agus Promo Bariloche',
    displayNameHint:
      'Este nombre puede aparecer cuando productoras busquen o gestionen acuerdos con referidos.',
    portalHint:
      'Después del registro vas a entrar a tu portal de referido, donde podrás ver tus asociaciones, links y solicitudes relacionadas a acuerdos.',
    afterRegister:
      'Tu perfil inicial ya está listo. Te llevamos al portal de referido para ver propuestas y acuerdos.',
  },
  hotel: {
    heading: 'Creá tu perfil de hotel',
    subtitle:
      'Cargá los datos básicos de tu alojamiento. En esta etapa, Yo Te Invito muestra una ficha informativa y canales de contacto, sin gestionar reservas ni pagos hoteleros.',
    intro:
      'Cargá los datos básicos de tu alojamiento. En esta etapa, Yo Te Invito muestra una ficha informativa y canales de contacto, sin gestionar reservas ni pagos hoteleros.',
    displayNameLabel: 'Nombre del hotel o alojamiento',
    displayNamePlaceholder: 'Ej: Hotel Lago Sur',
    websiteUrlLabel: 'Sitio web o link de contacto',
    websiteUrlHint:
      'Puede ser tu web oficial, una página de contacto o un canal donde las personas puedan consultar más información.',
    citySelectHint: 'Primero elegí una provincia para ver las ciudades disponibles.',
    cityProvinceFirstHint: 'Seleccioná una provincia para elegir ciudad.',
    cityNoOptionsHint: 'Todavía no hay ciudades disponibles para esta provincia.',
    portalHint:
      'Después del registro te llevamos al portal de hotel para completar amenities, galería, ubicación y datos de contacto.',
    afterRegister:
      'Tu perfil inicial ya está listo. Te llevamos al portal de hotel para completar tu ficha informativa.',
  },
  producer: {
    heading: 'Creá tu perfil de productora',
    subtitle:
      'Usaremos este nombre para crear tu perfil inicial. Después vas a poder completar imágenes, contacto, descripción y datos públicos desde tu portal.',
    intro:
      'Usaremos este nombre para crear tu perfil inicial. Después vas a poder completar imágenes, contacto, descripción y datos públicos desde tu portal.',
    displayNameLabel: 'Nombre de la productora',
    displayNameHint:
      'Puede ser el nombre de tu marca, productora, espacio o equipo organizador.',
    displayNamePlaceholder: 'Ej: Horizonte Producciones',
    portalHint:
      'Después del registro te llevamos al portal de productora para completar tu perfil, crear eventos y configurar tus datos públicos.',
    afterRegister:
      'Tu perfil inicial ya está listo. Te llevamos al portal de productora para completar datos y crear tu primer evento.',
  },
  legal: {
    heading: 'Documentos legales',
    subtitle: 'Para crear tu cuenta necesitás aceptar los documentos obligatorios vigentes.',
  },
  legalRetry: {
    heading: 'Completar aceptación legal',
  },
  submitting: {
    register: 'Creando cuenta…',
    signIn: 'Iniciando sesión…',
    retry: 'Guardando aceptación…',
  },
  cta: {
    continue: 'Continuar',
    back: 'Volver',
    createAccount: 'Crear cuenta',
    retryLegal: 'Reintentar aceptación',
  },
} as const;

/** V2 signup profiles only — RENTAL/proveedor de equipos is admin + contacto público (Slice 8). */
export const PROFILE_CHOICES: {
  type: RegistrationProfileType;
  title: string;
  description: string;
}[] = [
  {
    type: 'USER',
    title: 'Comprador',
    description:
      'Comprá entradas, guardá favoritos, recibí alertas y accedé a tus tickets desde tu cuenta.',
  },
  {
    type: 'PRODUCER',
    title: 'Productora',
    description:
      'Publicá eventos, gestioná entradas, revisá métricas y administrá tu perfil comercial.',
  },
  {
    type: 'GASTRO',
    title: 'Gastronómico',
    description:
      'Mostrá tu local, publicá contenido, ofrecé descuentos y recibí valoraciones de clientes.',
  },
  {
    type: 'HOTEL',
    title: 'Hotel',
    description:
      'Creá una ficha informativa para mostrar tu alojamiento y canales de contacto. Reservas y pagos no están disponibles en esta versión.',
  },
  {
    type: 'REFERRER',
    title: 'Referido',
    description:
      'Promocioná eventos mediante acuerdos con productoras y seguí tus links y métricas desde tu portal.',
  },
];

export type RegisterWizardStepKey =
  | 'account'
  | 'profile'
  | 'buyer'
  | 'producer'
  | 'gastro'
  | 'hotel'
  | 'referrer'
  | 'legal'
  | 'legal-retry';

export function getWizardProgressSteps(
  profileType: RegistrationProfileType,
): { key: RegisterWizardStepKey; label: string }[] {
  if (profileType === 'USER') {
    return [
      { key: 'account', label: 'Cuenta' },
      { key: 'profile', label: 'Perfil' },
      { key: 'buyer', label: 'Tus datos' },
      { key: 'legal', label: 'Legales' },
    ];
  }
  if (profileType === 'PRODUCER') {
    return [
      { key: 'account', label: 'Cuenta' },
      { key: 'profile', label: 'Perfil' },
      { key: 'producer', label: 'Productora' },
      { key: 'legal', label: 'Legales' },
    ];
  }
  if (profileType === 'GASTRO') {
    return [
      { key: 'account', label: 'Cuenta' },
      { key: 'profile', label: 'Perfil' },
      { key: 'gastro', label: 'Local' },
      { key: 'legal', label: 'Legales' },
    ];
  }
  if (profileType === 'HOTEL') {
    return [
      { key: 'account', label: 'Cuenta' },
      { key: 'profile', label: 'Perfil' },
      { key: 'hotel', label: 'Hotel' },
      { key: 'legal', label: 'Legales' },
    ];
  }
  if (profileType === 'REFERRER') {
    return [
      { key: 'account', label: 'Cuenta' },
      { key: 'profile', label: 'Perfil' },
      { key: 'referrer', label: 'Referido' },
      { key: 'legal', label: 'Legales' },
    ];
  }
  return [
    { key: 'account', label: 'Cuenta' },
    { key: 'profile', label: 'Perfil' },
    { key: 'legal', label: 'Legales' },
  ];
}

export function profileSignupDataStep(
  profileType: RegistrationProfileType,
): RegisterWizardStepKey {
  switch (profileType) {
    case 'USER':
      return 'buyer';
    case 'PRODUCER':
      return 'producer';
    case 'GASTRO':
      return 'gastro';
    case 'HOTEL':
      return 'hotel';
    case 'REFERRER':
      return 'referrer';
    default:
      return 'legal';
  }
}

export function getStepMeta(
  step: RegisterWizardStepKey,
  profileType: RegistrationProfileType,
): { heading: string; subtitle: string } {
  switch (step) {
    case 'account':
      return REGISTER_WIZARD_COPY.account;
    case 'profile':
      return REGISTER_WIZARD_COPY.profile;
    case 'buyer':
      return REGISTER_WIZARD_COPY.buyer;
    case 'producer':
      return {
        heading: REGISTER_WIZARD_COPY.producer.heading,
        subtitle: REGISTER_WIZARD_COPY.producer.subtitle,
      };
    case 'gastro':
      return {
        heading: REGISTER_WIZARD_COPY.gastro.heading,
        subtitle: REGISTER_WIZARD_COPY.gastro.subtitle,
      };
    case 'hotel':
      return {
        heading: REGISTER_WIZARD_COPY.hotel.heading,
        subtitle: REGISTER_WIZARD_COPY.hotel.subtitle,
      };
    case 'referrer':
      return {
        heading: REGISTER_WIZARD_COPY.referrer.heading,
        subtitle: REGISTER_WIZARD_COPY.referrer.subtitle,
      };
    case 'legal':
      return REGISTER_WIZARD_COPY.legal;
    case 'legal-retry':
      return {
        heading: REGISTER_WIZARD_COPY.legalRetry.heading,
        subtitle: REGISTER_WIZARD_COPY.legal.subtitle,
      };
    default:
      return REGISTER_WIZARD_COPY.account;
  }
}
