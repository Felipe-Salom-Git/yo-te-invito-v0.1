'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  getBrowserPushSubscription,
  getNotificationPermission,
  isPushSupported,
} from '@/lib/push/registerPush';
import { usePushSubscriptions, usePushSubscriptionsConfig } from '@/lib/query/me-portal';

export function MeDashboardPushCta() {
  const supported = isPushSupported();
  const [permission, setPermission] = useState(getNotificationPermission());
  const [hasLocalSub, setHasLocalSub] = useState(false);

  const { data: config } = usePushSubscriptionsConfig(supported);
  const { data: subs } = usePushSubscriptions(supported);

  const refresh = useCallback(async () => {
    setPermission(getNotificationPermission());
    const sub = await getBrowserPushSubscription();
    setHasLocalSub(!!sub);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh, subs?.subscriptions.length]);

  if (!supported || permission === 'denied') return null;
  if (!config?.pushEnabled) return null;

  const serverActive = (subs?.subscriptions.length ?? 0) > 0;
  if (serverActive && hasLocalSub && permission === 'granted') return null;

  return (
    <section className="mt-8" aria-labelledby="me-push-cta-heading">
      <h3 id="me-push-cta-heading" className="text-lg font-semibold text-text">
        Notificaciones en el celular
      </h3>
      <div className="mt-3 flex flex-col gap-3 rounded-lg border border-accent/30 bg-bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          Activá las notificaciones para recibir alertas de tus eventos y favoritos aunque no tengas
          la web abierta.
        </p>
        <Link
          href="/me/notifications"
          className="shrink-0 text-sm font-medium text-accent hover:underline"
        >
          Activar notificaciones →
        </Link>
      </div>
    </section>
  );
}
