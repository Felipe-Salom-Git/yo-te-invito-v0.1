'use client';

import { useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import {
  useMeMarketingPreferences,
  usePatchMeMarketingPreferences,
} from '@/lib/query/me-portal';

export function MeAccountCommunicationsSection() {
  const { addToast } = useToast();
  const { data, isLoading, isError } = useMeMarketingPreferences();
  const patch = usePatchMeMarketingPreferences();

  const onEmailChange = (checked: boolean) => {
    patch.mutate(
      { emailOptIn: checked },
      {
        onSuccess: () =>
          addToast(
            checked
              ? 'Vas a recibir novedades y promociones por email'
              : 'Dejamos de enviarte emails promocionales',
            'success',
          ),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  return (
    <section className="mt-10 max-w-md space-y-3">
      <h3 className="font-medium text-text">Comunicaciones</h3>
      <p className="text-sm text-text-muted">
        Independiente de alertas de cuenta (tickets, verificación, reclamos QR).
      </p>
      {isLoading ? <p className="text-sm text-text-muted">Cargando preferencias…</p> : null}
      {isError ? (
        <p className="text-sm text-text-muted">No pudimos cargar las preferencias.</p>
      ) : null}
      {data ? (
        <>
          <label className="flex items-start gap-3 text-sm text-text">
            <input
              type="checkbox"
              className="mt-1"
              checked={data.emailOptIn}
              disabled={patch.isPending}
              onChange={(e) => onEmailChange(e.target.checked)}
            />
            <span>Quiero recibir novedades y promociones por email</span>
          </label>
          <label className="flex items-start gap-3 text-sm text-text-muted">
            <input type="checkbox" className="mt-1" checked={false} disabled />
            <span>
              Quiero recibir promociones por WhatsApp
              <span className="mt-1 block text-xs">
                Próximamente — proveedor no configurado
              </span>
            </span>
          </label>
        </>
      ) : null}
    </section>
  );
}
