/**
 * Profile options for the vertical selector.
 * Static metadata: id, title, description, icon, etc.
 */
import type { ProfileKind } from './profile-status';

export interface ProfileOption {
  id: ProfileKind;
  title: string;
  description: string;
  /** Route for primary CTA when available */
  dashboardRoute: string;
  /** Route for setup/apply when unavailable */
  setupRoute: string;
  /** Route when pending */
  pendingRoute?: string;
}

export const PROFILE_OPTIONS: ProfileOption[] = [
  {
    id: 'tickets',
    title: 'Mis Tickets',
    description:
      'Entrá a tu experiencia personal: tus entradas, eventos asistidos, actividad y preferencias.',
    dashboardRoute: '/cuenta',
    setupRoute: '/cuenta',
  },
  {
    id: 'producer',
    title: 'Productor',
    description:
      'Creá eventos, gestioná tu productora y publicá experiencias con o sin ticketera.',
    dashboardRoute: '/producer',
    setupRoute: '/cuenta/solicitar-productor',
    pendingRoute: '/cuenta/solicitar-productor',
  },
  {
    id: 'gastro',
    title: 'Gastronómico',
    description:
      'Mostrá tu local, gestioná contenido gastronómico y lanzá descuentos o beneficios.',
    dashboardRoute: '/gastro',
    setupRoute: '/cuenta/solicitar-gastro',
    pendingRoute: '/cuenta/solicitar-gastro',
  },
  {
    id: 'hotel',
    title: 'Hotel / alojamiento',
    description:
      'Cargá tu establecimiento, sitio web y enlaces. Gestioná tu presencia en la sección Hoteles del inicio.',
    dashboardRoute: '/hotel',
    setupRoute: '/cuenta/solicitar-hotel',
    pendingRoute: '/cuenta/solicitar-hotel',
  },
  {
    id: 'referrer',
    title: 'Referido',
    description:
      'Perfil activo al instante, link para productoras, métricas y directorio público opcional.',
    dashboardRoute: '/referrer',
    setupRoute: '/cuenta/solicitar-referrer',
    pendingRoute: '/cuenta/solicitar-referrer',
  },
];
