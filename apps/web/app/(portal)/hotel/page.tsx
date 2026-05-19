'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle } from '@/components';

function linkLabel(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function HotelPortalPage() {
  const repos = useRepositories();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['hotel', 'me'],
    queryFn: () => repos.hotel.getMe(),
  });

  const profile = data?.profile;

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (isError || !profile) {
    return (
      <PageContainer>
        <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
          ← Volver
        </Link>
        <SectionTitle>Portal hotel</SectionTitle>
        <p className="mt-4 text-text-muted">
          No encontramos un perfil hotel activo. Si acabás de ser aprobado, actualizá la página o contactá soporte.
        </p>
      </PageContainer>
    );
  }

  const social = profile.socialLinks as Record<string, string> | null | undefined;
  const socialEntries =
    social && typeof social === 'object'
      ? Object.entries(social).filter(([, v]) => typeof v === 'string' && v.trim())
      : [];

  return (
    <PageContainer>
      <Link href="/home" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Volver
      </Link>
      <SectionTitle>{profile.displayName}</SectionTitle>
      <p className="mt-2 text-text-muted">
        {profile.city ? `${profile.city}` : 'Tu establecimiento'}
        {profile.starCategory != null ? ` · ${profile.starCategory}★` : ''}
      </p>

      <div className="mt-8 space-y-4 rounded-xl border border-border bg-bg-muted/50 p-6">
        <h2 className="text-sm font-semibold text-text">Enlaces públicos</h2>
        <ul className="space-y-2 text-sm">
          {profile.websiteUrl && (
            <li>
              <a
                href={profile.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Sitio web — {linkLabel(profile.websiteUrl)}
              </a>
            </li>
          )}
          {profile.bookingUrl && (
            <li>
              <a
                href={profile.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                Reservas — {linkLabel(profile.bookingUrl)}
              </a>
            </li>
          )}
        </ul>
        {socialEntries.length > 0 && (
          <ul className="mt-4 space-y-1 border-t border-border pt-4 text-sm text-text-muted">
            {socialEntries.map(([key, value]) => (
              <li key={key}>
                <span className="capitalize">{key}:</span>{' '}
                <span className="text-text">{value}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-6 text-sm text-text-muted">
        Tu hotel aparece en el carrusel de inicio como contenido con categoría hotel. Para cambiar datos de la ficha
        pública, contactá al equipo (próximamente edición desde acá).
      </p>
    </PageContainer>
  );
}
