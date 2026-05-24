import { legalVisibilityLabel } from '@/lib/admin/admin-legal-labels';

export function AdminLegalVisibilityBadge({
  visibility,
}: {
  visibility: 'PUBLIC' | 'INTERNAL';
}) {
  const isPublic = visibility === 'PUBLIC';
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        isPublic
          ? 'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30'
          : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
      }`}
    >
      {legalVisibilityLabel(visibility)}
    </span>
  );
}
