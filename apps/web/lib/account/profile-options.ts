/**
 * Profile options metadata — legacy selector (V3.1: `/profiles` redirects by role).
 * setupRoute/pendingRoute point to `/register` for any residual links.
 */
import type { ProfileKind } from './profile-status';

export interface ProfileOption {
  id: ProfileKind;
  title: string;
  description: string;
  dashboardRoute: string;
  setupRoute: string;
  pendingRoute?: string;
}

export const PROFILE_OPTIONS: ProfileOption[] = [
  {
    id: 'tickets',
    title: 'Mis Tickets',
    description:
      'Entrá a tu experiencia personal: tus entradas, eventos asistidos, actividad y preferencias.',
    dashboardRoute: '/me',
    setupRoute: '/me',
  },
  {
    id: 'producer',
    title: 'Productor',
    description:
      'Creá eventos, gestioná tu productora y publicá experiencias con o sin ticketera.',
    dashboardRoute: '/producer',
    setupRoute: '/register',
    pendingRoute: '/register',
  },
  {
    id: 'gastro',
    title: 'Gastronómico',
    description:
      'Mostrá tu local, gestioná contenido gastronómico y lanzá descuentos o beneficios.',
    dashboardRoute: '/gastro',
    setupRoute: '/register',
    pendingRoute: '/register',
  },
  {
    id: 'hotel',
    title: 'Hotel / alojamiento',
    description:
      'Cargá tu establecimiento, sitio web y enlaces. Gestioná tu presencia en la sección Hoteles del inicio.',
    dashboardRoute: '/hotel',
    setupRoute: '/register',
    pendingRoute: '/register',
  },
  {
    id: 'referrer',
    title: 'Referido',
    description:
      'Perfil activo al instante, link para productoras, métricas y directorio público opcional.',
    dashboardRoute: '/referrer',
    setupRoute: '/register',
    pendingRoute: '/register',
  },
];
