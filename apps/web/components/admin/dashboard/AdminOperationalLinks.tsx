import Link from 'next/link';

type OperationalLink = {
  href: string;
  label: string;
  description: string;
  highlight?: boolean;
};

const LINKS: OperationalLink[] = [
  {
    href: '/admin/eventos',
    label: 'Eventos y contenidos',
    description: 'Listado con filtros, búsqueda y cola de pendientes.',
    highlight: true,
  },
  {
    href: '/admin/productoras',
    label: 'Productoras',
    description: 'Moderar eventos por productora, aprobar o rechazar.',
  },
  {
    href: '/admin/usuarios',
    label: 'Usuarios',
    description: 'Roles, cuentas y acceso a portales.',
  },
  {
    href: '/admin/auditoria',
    label: 'Auditoría',
    description: 'Registro de acciones admin: eventos, disputas, tickets y más.',
  },
  {
    href: '/admin/legales',
    label: 'Legales',
    description: 'Términos, políticas, condiciones por perfil y procedimientos internos.',
  },
  {
    href: '/admin/tickets',
    label: 'Tickets',
    description: 'Intervenciones sobre tickets (revocaciones).',
  },
  {
    href: '/admin/categorias',
    label: 'Subcategorías',
    description: 'CRUD por vertical activa; hoteles Próximamente; banners de categoría.',
  },
  {
    href: '/admin/rentals',
    label: 'Rentals',
    description: 'Locales y productos de alquiler.',
  },
  {
    href: '/admin/hoteles',
    label: 'Hoteles',
    description: 'Archivar o restaurar perfiles hotel (baja lógica).',
  },
  {
    href: '/admin/reviews',
    label: 'Reputación',
    description: 'KPIs de reseñas públicas, disputas y export CSV.',
  },
  {
    href: '/admin/review-disputes',
    label: 'Reseñas (disputas)',
    description: 'Cola de solicitudes de revisión de comentarios.',
  },
  {
    href: '/admin/contactos',
    label: 'Configuración',
    description: 'Contactos y ajustes operativos de plataforma.',
  },
];

/** Quick navigation grid aligned with admin sidebar. */
export function AdminOperationalLinks() {
  return (
    <section aria-labelledby="admin-ops-heading">
      <h2 id="admin-ops-heading" className="text-lg font-semibold text-text">
        Accesos operativos
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        Atajos a las secciones que usás día a día en moderación y soporte.
      </p>
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className={`block rounded-xl border p-4 transition-colors hover:border-accent/40 hover:bg-bg-muted/50 ${
                item.highlight ? 'border-accent/40 bg-accent/5' : 'border-border/80 bg-bg-muted/30'
              }`}
            >
              <p className="font-medium text-text">{item.label}</p>
              <p className="mt-1 text-xs text-text-muted">{item.description}</p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
