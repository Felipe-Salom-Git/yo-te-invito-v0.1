'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { useAvailableProfiles } from '@/hooks/useAvailableProfiles';
import { PageContainer, Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export default function ReferrerJoinLinkPage() {
  const params = useParams();
  const token = typeof params.token === 'string' ? params.token : '';
  const { tenantId } = useTenant();
  const repos = useRepositories();
  const { status } = useSession();
  const router = useRouter();
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { statusMap, isLoading: profilesLoading } = useAvailableProfiles();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public', 'referrer-association', tenantId, token],
    queryFn: () => repos.profiles.resolveReferrerAssociation(tenantId, token),
    enabled: !!token,
  });

  const ref = data?.referrerProfile;
  const hasProducer = statusMap.producer.hasAccess;
  const callbackUrl =
    typeof window !== 'undefined' ? encodeURIComponent(window.location.pathname) : '';

  const associateMutation = useMutation({
    mutationFn: () => repos.referrals.associateFromReferrerLink(token),
    onSuccess: (res) => {
      const { relationship, created } = res;
      if (relationship.status === 'ACTIVE') {
        addToast('Ya estaban asociados.', 'success');
      } else if (created) {
        addToast('Solicitud enviada. El referidor debe aceptarla.', 'success');
      } else {
        addToast('Ya tenías una solicitud o relación con este referidor.', 'success');
      }
      queryClient.invalidateQueries({ queryKey: ['producer', 'referrers'] });
      queryClient.invalidateQueries({ queryKey: ['referrer', 'producer-relationships'] });
      queryClient.invalidateQueries({ queryKey: ['referrer', 'dashboard'] });
      router.push('/producer/referrals');
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  if (!token) {
    return (
      <PageContainer>
        <p className="text-text-muted">Link inválido.</p>
      </PageContainer>
    );
  }

  if (isLoading || profilesLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  if (isError || !ref) {
    return (
      <PageContainer className="max-w-lg py-16">
        <h1 className="text-xl font-semibold text-text">Link no válido</h1>
        <Link href="/referrers" className="mt-6 inline-block text-accent hover:underline">
          Ir al directorio
        </Link>
      </PageContainer>
    );
  }

  return (
    <div className="min-h-[70vh] bg-gradient-to-b from-bg to-bg-muted/30">
      <PageContainer className="max-w-lg py-12">
        <p className="text-xs font-medium uppercase tracking-widest text-accent">Asociación</p>
        <h1 className="mt-2 text-2xl font-semibold text-text">No es un link de compra</h1>
        <p className="mt-2 text-sm text-text-muted">
          Este enlace solo registra la asociación general productora–referidor. No asigna eventos ni crea links de
          venta <span className="font-mono text-xs">/r/</span>. Si la relación queda pendiente, el referidor debe
          aceptarla en su panel.
        </p>

        <div className="mt-8 flex gap-4 rounded-2xl border border-border bg-bg-muted/50 p-5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-bg text-accent">
            {ref.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={ref.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              ref.displayName.slice(0, 1).toUpperCase()
            )}
          </div>
          <div>
            <p className="font-semibold text-text">{ref.displayName}</p>
            {ref.bio && <p className="mt-1 text-sm text-text-muted">{ref.bio}</p>}
          </div>
        </div>

        {status !== 'authenticated' && (
          <div className="mt-8 rounded-xl border border-accent/30 bg-bg-muted/40 p-5">
            <p className="text-sm text-text">Iniciá sesión para continuar.</p>
            <Link
              href={`/login?callbackUrl=${callbackUrl}`}
              className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-medium text-bg hover:bg-accent-hover"
            >
              Iniciar sesión
            </Link>
          </div>
        )}

        {status === 'authenticated' && !hasProducer && (
          <div className="mt-8 rounded-xl border border-border bg-bg-muted/40 p-5">
            <p className="text-sm text-text">Necesitás un perfil de productor activo.</p>
            <Link
              href="/register"
              className="mt-4 inline-flex rounded-lg border border-accent px-4 py-2 text-sm font-medium text-accent hover:bg-accent/10"
            >
              Registrarme como productora
            </Link>
          </div>
        )}

        {status === 'authenticated' && hasProducer && (
          <div className="mt-8 space-y-3">
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={associateMutation.isPending}
              onClick={() => associateMutation.mutate()}
            >
              {associateMutation.isPending ? 'Enviando…' : 'Solicitar asociación'}
            </Button>
            <p className="text-xs text-text-muted">
              Si es nueva solicitud, queda pendiente hasta que el referidor responda en /referrer. Gestioná el estado en
              Referidos.
            </p>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
