import Link from 'next/link';
import type { AdminLegalDocumentListItem } from '@/repositories/interfaces';
import {
  formatLegalDate,
  legalDocumentKeyLabel,
} from '@/lib/admin/admin-legal-labels';
import { AdminLegalVisibilityBadge } from './AdminLegalVisibilityBadge';
import { AdminLegalVersionStatusBadge } from './AdminLegalVersionStatusBadge';

function RequiredFlags({ item }: { item: AdminLegalDocumentListItem }) {
  const flags: string[] = [];
  if (item.isRequiredForSignup) flags.push('Registro');
  if (item.isRequiredForCheckout) flags.push('Checkout');
  if (item.isRequiredForPortalAccess) flags.push('Portal');
  if (flags.length === 0) {
    return <span className="text-text-muted">—</span>;
  }
  return (
    <span className="text-xs text-text-muted">{flags.join(' · ')}</span>
  );
}

type Props = {
  items: AdminLegalDocumentListItem[];
};

export function AdminLegalDocumentsTable({ items }: Props) {
  return (
    <div className="hidden overflow-x-auto rounded-xl border border-border/80 md:block">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-border/80 bg-bg-muted/50 text-xs uppercase tracking-wide text-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Documento</th>
            <th className="px-4 py-3 font-medium">Visibilidad</th>
            <th className="px-4 py-3 font-medium">Perfiles</th>
            <th className="px-4 py-3 font-medium">Requerido</th>
            <th className="px-4 py-3 font-medium">Publicada</th>
            <th className="px-4 py-3 font-medium">Borrador</th>
            <th className="px-4 py-3 font-medium">Activo</th>
            <th className="px-4 py-3 font-medium">Actualizado</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {items.map((item) => (
            <tr key={item.key} className="bg-bg/40 hover:bg-bg-muted/30">
              <td className="px-4 py-3">
                <p className="font-medium text-text">{item.title}</p>
                <p className="text-xs text-text-muted">
                  {legalDocumentKeyLabel(item.key)} · <code>{item.key}</code>
                </p>
              </td>
              <td className="px-4 py-3">
                <AdminLegalVisibilityBadge visibility={item.visibility} />
              </td>
              <td className="max-w-[140px] px-4 py-3 text-xs text-text-muted">
                {item.appliesToProfiles.length > 0
                  ? item.appliesToProfiles.join(', ')
                  : '—'}
              </td>
              <td className="px-4 py-3">
                <RequiredFlags item={item} />
              </td>
              <td className="px-4 py-3">
                {item.publishedVersion ? (
                  <span className="text-text-muted">
                    {item.publishedVersion.version}{' '}
                    <AdminLegalVersionStatusBadge status="PUBLISHED" />
                  </span>
                ) : (
                  <span className="text-xs text-amber-400">Sin publicar</span>
                )}
              </td>
              <td className="px-4 py-3">
                {item.draftVersion ? (
                  <AdminLegalVersionStatusBadge status="DRAFT" />
                ) : (
                  <span className="text-text-muted">—</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span
                  className={
                    item.isActive ? 'text-xs text-emerald-400' : 'text-xs text-text-muted'
                  }
                >
                  {item.isActive ? 'Sí' : 'No'}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-text-muted">
                {formatLegalDate(item.updatedAt)}
              </td>
              <td className="px-4 py-3 text-right">
                <Link
                  href={`/admin/legales/${item.key}`}
                  className="text-sm font-medium text-accent hover:underline"
                >
                  Editar
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
