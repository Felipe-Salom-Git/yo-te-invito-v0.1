'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, useToast } from '@/components';
import {
  getBrowserPushSubscription,
  getNotificationPermission,
  guessDeviceName,
  guessDevicePlatform,
  isPushSupported,
  pushSubscriptionToPayload,
  resolveVapidPublicKey,
  subscribeToPush,
  unsubscribeFromPush,
} from '@/lib/push/registerPush';
import {
  useDeactivatePushSubscription,
  usePushSubscriptionsConfig,
  usePushSubscriptions,
  useRegisterPushSubscription,
  useSendTestPushNotification,
} from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';

type PanelState =
  | 'unsupported'
  | 'blocked'
  | 'inactive'
  | 'active';

export function MePushNotificationsPanel() {
  const { addToast } = useToast();
  const supported = isPushSupported();
  const [permission, setPermission] = useState(getNotificationPermission());
  const [localEndpoint, setLocalEndpoint] = useState<string | null>(null);

  const { data: config } = usePushSubscriptionsConfig(supported);
  const { data: subsData, refetch: refetchSubs } = usePushSubscriptions(supported);
  const register = useRegisterPushSubscription();
  const deactivate = useDeactivatePushSubscription();
  const sendTest = useSendTestPushNotification();

  const vapidKey = useMemo(
    () => resolveVapidPublicKey(config?.vapidPublicKey),
    [config?.vapidPublicKey],
  );

  const refreshLocal = useCallback(async () => {
    setPermission(getNotificationPermission());
    const sub = await getBrowserPushSubscription();
    setLocalEndpoint(sub?.endpoint ?? null);
  }, []);

  useEffect(() => {
    void refreshLocal();
  }, [refreshLocal, subsData]);

  const serverActive = useMemo(() => {
    if (!localEndpoint) return false;
    return (subsData?.subscriptions ?? []).some(
      (s) => s.isActive && s.endpoint === localEndpoint,
    );
  }, [localEndpoint, subsData]);

  const panelState: PanelState = useMemo(() => {
    if (!supported) return 'unsupported';
    if (permission === 'denied') return 'blocked';
    if (permission === 'granted' && serverActive) return 'active';
    return 'inactive';
  }, [supported, permission, serverActive]);

  const pushServerReady = config?.pushEnabled ?? false;

  const handleActivate = async () => {
    if (!vapidKey) {
      addToast('Push no configurado en el servidor (falta clave VAPID)', 'error');
      return;
    }
    try {
      const sub = await subscribeToPush(vapidKey);
      const payload = pushSubscriptionToPayload(sub);
      if (!payload) {
        addToast('No se pudo leer la suscripción del navegador', 'error');
        return;
      }
      await register.mutateAsync({
        ...payload,
        userAgent: navigator.userAgent.slice(0, 500),
        deviceName: guessDeviceName(),
        platform: guessDevicePlatform(),
      });
      await refreshLocal();
      await refetchSubs();
      addToast('Notificaciones activadas en este dispositivo', 'success');
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.includes('PERMISSION_DENIED') || getNotificationPermission() === 'denied') {
        setPermission('denied');
        addToast('Permiso de notificaciones denegado', 'error');
        return;
      }
      addToast(msg, 'error');
    }
  };

  const handleDeactivate = async () => {
    const sub = await getBrowserPushSubscription();
    const endpoint = sub?.endpoint ?? localEndpoint;
    if (!endpoint) {
      addToast('No hay suscripción activa en este navegador', 'error');
      return;
    }
    try {
      await unsubscribeFromPush();
      await deactivate.mutateAsync({ endpoint });
      await refreshLocal();
      await refetchSubs();
      addToast('Notificaciones desactivadas en este dispositivo', 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  };

  const handleTest = async () => {
    const endpoint = localEndpoint ?? undefined;
    try {
      const res = await sendTest.mutateAsync(endpoint ? { endpoint } : {});
      addToast(res.message, 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  };

  const busy = register.isPending || deactivate.isPending || sendTest.isPending;

  return (
    <section className="mt-8 rounded-lg border border-border bg-bg-muted/50 p-4 sm:p-5">
      <h2 className="text-lg font-semibold text-text">Notificaciones en este dispositivo</h2>
      <p className="mt-1 text-sm text-text-muted">
        Recibí alertas importantes aunque no tengas la app abierta.
      </p>

      <div className="mt-4 rounded-md border border-border bg-bg px-3 py-2.5 text-sm">
        <StatusLine label="Navegador" value={statusBrowser(supported)} />
        <StatusLine label="Permiso" value={statusPermission(permission)} />
        <StatusLine label="Suscripción" value={statusSubscription(panelState)} />
        {!pushServerReady && supported && (
          <p className="mt-2 text-xs text-amber-400">
            El servidor aún no tiene claves VAPID: podés activar el permiso, pero la prueba no
            enviará push hasta configurar las variables en API.
          </p>
        )}
      </div>

      {panelState === 'unsupported' && (
        <p className="mt-3 text-sm text-text-muted">
          Este navegador no soporta notificaciones push.
        </p>
      )}

      {panelState === 'blocked' && (
        <p className="mt-3 text-sm text-text-muted">
          Las notificaciones están bloqueadas desde la configuración del navegador. Habilitalas en
          los permisos del sitio e intentá de nuevo.
        </p>
      )}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {(panelState === 'inactive' || permission === 'default') && supported && permission !== 'denied' && (
          <Button
            type="button"
            className="w-full sm:w-auto"
            disabled={busy || !vapidKey}
            onClick={() => void handleActivate()}
          >
            {busy ? '…' : 'Activar notificaciones'}
          </Button>
        )}

        {panelState === 'active' && (
          <>
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={busy || !pushServerReady}
              onClick={() => void handleTest()}
            >
              {sendTest.isPending ? '…' : 'Enviar notificación de prueba'}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={busy}
              onClick={() => void handleDeactivate()}
            >
              {deactivate.isPending ? '…' : 'Desactivar en este dispositivo'}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

function StatusLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-wrap justify-between gap-x-4 gap-y-0.5 py-0.5 text-text">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </p>
  );
}

function statusBrowser(supported: boolean) {
  return supported ? 'Compatible' : 'No soportado';
}

function statusPermission(permission: NotificationPermission | 'unsupported') {
  switch (permission) {
    case 'granted':
      return 'Concedido';
    case 'denied':
      return 'Bloqueado';
    case 'default':
      return 'No solicitado';
    default:
      return '—';
  }
}

function statusSubscription(state: PanelState) {
  switch (state) {
    case 'active':
      return 'Activa';
    case 'blocked':
      return 'Bloqueada';
    case 'unsupported':
      return 'No disponible';
    default:
      return 'Inactiva';
  }
}
