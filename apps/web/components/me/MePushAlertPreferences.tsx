'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, PageLoader, useToast } from '@/components';
import { InterestsDisclosure } from '@/components/me/InterestsDisclosure';
import { usePatchPortalPreferences, usePortalPreferences } from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';

function AlertCheckbox({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer gap-3 rounded-lg border border-border p-3">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium text-text">{label}</span>
        {description && (
          <span className="mt-0.5 block text-xs text-text-muted">{description}</span>
        )}
      </span>
    </label>
  );
}

export function MePushAlertPreferences() {
  const { addToast } = useToast();
  const { data: prefs, isLoading } = usePortalPreferences();
  const patch = usePatchPortalPreferences();

  const [pushAlerts, setPushAlerts] = useState(true);
  const [upcoming, setUpcoming] = useState(true);
  const [transfers, setTransfers] = useState(true);
  const [reviews, setReviews] = useState(true);
  const [producers, setProducers] = useState(true);
  const [categories, setCategories] = useState(true);
  const [subcategories, setSubcategories] = useState(true);
  const [recommendations, setRecommendations] = useState(false);
  const [unreadMirror, setUnreadMirror] = useState(true);

  useEffect(() => {
    if (!prefs) return;
    setPushAlerts(prefs.pushAlertsEnabled);
    setUpcoming(prefs.notifyUpcomingEvents);
    setTransfers(prefs.notifyTransferOffers);
    setReviews(prefs.notifyPendingReviews);
    setProducers(prefs.notifyFollowedProducers);
    setCategories(prefs.notifyFavoriteCategories);
    setSubcategories(prefs.notifyFavoriteSubcategories);
    setRecommendations(prefs.notifyRecommendations);
    setUnreadMirror(prefs.notifyUnreadNotifications);
  }, [prefs]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    patch.mutate(
      {
        pushAlertsEnabled: pushAlerts,
        notifyUpcomingEvents: upcoming,
        ticketReminder24hEnabled: upcoming,
        notifyTransferOffers: transfers,
        notifyPendingReviews: reviews,
        notifyFollowedProducers: producers,
        notifyFavoriteCategories: categories,
        favoriteEntityNotificationsEnabled: categories,
        notifyFavoriteSubcategories: subcategories,
        notifyRecommendations: recommendations,
        notifyUnreadNotifications: unreadMirror,
      },
      {
        onSuccess: () => addToast('Preferencias de alertas guardadas', 'success'),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  const enabledTypesCount = useMemo(() => {
    if (!pushAlerts) return 0;
    const toggles = [
      upcoming,
      transfers,
      reviews,
      producers,
      categories,
      subcategories,
      recommendations,
      unreadMirror,
    ];
    return toggles.filter(Boolean).length;
  }, [
    pushAlerts,
    upcoming,
    transfers,
    reviews,
    producers,
    categories,
    subcategories,
    recommendations,
    unreadMirror,
  ]);

  const badge = useMemo(() => {
    if (!prefs) return undefined;
    if (!pushAlerts) return 'Push desactivado';
    if (enabledTypesCount === 0) return 'Sin tipos activos';
    return `${enabledTypesCount} tipo${enabledTypesCount === 1 ? '' : 's'} activo${enabledTypesCount === 1 ? '' : 's'}`;
  }, [prefs, pushAlerts, enabledTypesCount]);

  if (isLoading) {
    return (
      <div className="mt-8">
        <PageLoader message="Cargando preferencias de alertas…" />
      </div>
    );
  }

  return (
    <InterestsDisclosure
      className="mt-8"
      title="Preferencias de alertas"
      description="Elegí qué avisos recibir por push. La bandeja interna sigue mostrando todo lo importante."
      badge={badge}
      defaultOpen={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
      <AlertCheckbox
        id="push-alerts-master"
        checked={pushAlerts}
        onChange={setPushAlerts}
        label="Alertas push activas"
        description="Si está desactivado, no enviamos push aunque tengas el dispositivo registrado."
      />

      <div className="space-y-2">
        <AlertCheckbox
          id="push-upcoming"
          checked={upcoming}
          onChange={setUpcoming}
          label="Recordatorios de eventos próximos"
        />
        <AlertCheckbox
          id="push-transfers"
          checked={transfers}
          onChange={setTransfers}
          label="Transferencias de tickets"
        />
        <AlertCheckbox
          id="push-reviews"
          checked={reviews}
          onChange={setReviews}
          label="Calificaciones pendientes"
        />
        <AlertCheckbox
          id="push-producers"
          checked={producers}
          onChange={setProducers}
          label="Productoras que sigo"
          description="Nuevos eventos de productoras seguidas (cuando estén publicados)."
        />
        <AlertCheckbox
          id="push-categories"
          checked={categories}
          onChange={setCategories}
          label="Categorías favoritas"
        />
        <AlertCheckbox
          id="push-subcategories"
          checked={subcategories}
          onChange={setSubcategories}
          label="Subcategorías favoritas"
          description="Contenido nuevo que coincida con tus subcategorías (en preparación)."
        />
        <AlertCheckbox
          id="push-recommendations"
          checked={recommendations}
          onChange={setRecommendations}
          label="Recomendaciones para mí"
          description="Sugerencias personalizadas; desactivado por defecto para evitar spam."
        />
        <AlertCheckbox
          id="push-unread"
          checked={unreadMirror}
          onChange={setUnreadMirror}
          label="Espejo de notificaciones internas"
          description="Push cuando llega una alerta importante a tu bandeja."
        />
      </div>

      <Button type="submit" className="w-full sm:w-auto" disabled={patch.isPending}>
        {patch.isPending ? 'Guardando…' : 'Guardar preferencias'}
      </Button>
      </form>
    </InterestsDisclosure>
  );
}
