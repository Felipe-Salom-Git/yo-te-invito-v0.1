'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, PageLoader, useToast } from '@/components';
import { InterestsDisclosure } from '@/components/me/InterestsDisclosure';
import { PreferredCitiesPicker } from '@/components/me/PreferredCitiesPicker';
import { mergeProfileCityIntoFavorites, readPreferredCities } from '@/lib/me/preferred-cities';
import { usePublicSubcategories } from '@/lib/query/subcategories';
import {
  useMeAccount,
  usePatchPortalPreferences,
  usePortalPreferences,
} from '@/lib/query/me-portal';
import { getErrorMessage } from '@/lib/errors';
import type { ContentMainCategory } from '@/repositories/interfaces';

const MAIN_CATEGORIES: { id: ContentMainCategory; label: string }[] = [
  { id: 'event', label: 'Eventos' },
  { id: 'gastro', label: 'Gastronomía' },
  { id: 'rental', label: 'Equipos y Rentals' },
  { id: 'excursion', label: 'Excursiones' },
];

function PrefCheckbox({
  id,
  checked,
  onChange,
  label,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2.5 py-1 text-sm text-text">
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 rounded border-border accent-accent"
      />
      {label}
    </label>
  );
}

function selectionBadge(count: number, singular: string, plural: string) {
  if (count === 0) return undefined;
  return count === 1 ? `1 ${singular}` : `${count} ${plural}`;
}

export function MePreferencesInterests() {
  const { addToast } = useToast();
  const { data: prefs, isLoading } = usePortalPreferences();
  const { data: account } = useMeAccount();
  const patch = usePatchPortalPreferences();

  const [cities, setCities] = useState<string[]>([]);
  const [categories, setCategories] = useState<ContentMainCategory[]>([]);
  const [subcategoryIds, setSubcategoryIds] = useState<string[]>([]);
  const [categoryAlerts, setCategoryAlerts] = useState(true);
  const [subcategoryAlerts, setSubcategoryAlerts] = useState(true);

  const eventSubs = usePublicSubcategories('event');
  const gastroSubs = usePublicSubcategories('gastro');
  const rentalSubs = usePublicSubcategories('rental');
  const excursionSubs = usePublicSubcategories('excursion');

  const subcategoriesByCategory = useMemo(() => {
    const groups: { category: ContentMainCategory; label: string; items: { id: string; name: string }[] }[] =
      [];
    const pairs: [ContentMainCategory, typeof eventSubs][] = [
      ['event', eventSubs],
      ['gastro', gastroSubs],
      ['rental', rentalSubs],
      ['excursion', excursionSubs],
    ];
    for (const [cat, query] of pairs) {
      const label = MAIN_CATEGORIES.find((c) => c.id === cat)?.label ?? cat;
      const items = (query.data ?? []).map((s) => ({ id: s.id, name: s.name }));
      if (items.length > 0) groups.push({ category: cat, label, items });
    }
    return groups;
  }, [eventSubs, gastroSubs, rentalSubs, excursionSubs]);

  const subsLoading =
    eventSubs.isLoading || gastroSubs.isLoading || rentalSubs.isLoading || excursionSubs.isLoading;

  useEffect(() => {
    if (prefs) {
      const fromPrefs = readPreferredCities(prefs);
      setCities(mergeProfileCityIntoFavorites(fromPrefs, account?.city));
      setCategories(prefs.favoriteCategories ?? []);
      setSubcategoryIds(prefs.favoriteSubcategoryIds ?? []);
      setCategoryAlerts(prefs.favoriteEntityNotificationsEnabled);
      setSubcategoryAlerts(prefs.favoriteEntityNotificationsEnabled);
    }
  }, [prefs, account?.city]);

  const toggleCategory = (id: ContentMainCategory, on: boolean) => {
    setCategories((prev) => (on ? [...new Set([...prev, id])] : prev.filter((c) => c !== id)));
  };

  const toggleSubcategory = (id: string, on: boolean) => {
    setSubcategoryIds((prev) =>
      on ? [...new Set([...prev, id])] : prev.filter((s) => s !== id),
    );
  };

  const subCountForGroup = (group: { items: { id: string }[] }) =>
    group.items.filter((s) => subcategoryIds.includes(s.id)).length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entityAlerts = categoryAlerts || subcategoryAlerts;
    patch.mutate(
      {
        preferredCities: cities,
        favoriteCategories: categories,
        favoriteSubcategoryIds: subcategoryIds,
        favoriteEntityNotificationsEnabled: entityAlerts,
      },
      {
        onSuccess: () => addToast('Intereses guardados', 'success'),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  if (isLoading) {
    return <PageLoader message="Cargando intereses…" />;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-3">
      <InterestsDisclosure
        title="Ciudades preferidas"
        description="Mejorá recomendaciones y alertas en las zonas que te interesan."
        badge={selectionBadge(cities.length, 'ciudad', 'ciudades')}
        defaultOpen
      >
        <PreferredCitiesPicker
          selected={cities}
          onChange={setCities}
          profileCity={account?.city}
        />
        <p className="mt-3 text-xs text-text-muted">
          La primera ciudad favorita se sincroniza con{' '}
          <Link href="/me/account" className="text-accent hover:underline">
            Mi cuenta
          </Link>
          . Podés editarla desde el perfil.
        </p>
      </InterestsDisclosure>

      <InterestsDisclosure
        title="Categorías favoritas"
        description="Rubros que más te interesan."
        badge={selectionBadge(categories.length, 'categoría', 'categorías')}
      >
        <div className="flex flex-col">
          {MAIN_CATEGORIES.map((c) => (
            <PrefCheckbox
              key={c.id}
              id={`cat-${c.id}`}
              checked={categories.includes(c.id)}
              onChange={(on) => toggleCategory(c.id, on)}
              label={c.label}
            />
          ))}
        </div>
      </InterestsDisclosure>

      <InterestsDisclosure
        title="Subcategorías favoritas"
        description="Refiná tus intereses dentro de cada rubro."
        badge={selectionBadge(subcategoryIds.length, 'subcategoría', 'subcategorías')}
      >
        {subsLoading ? (
          <p className="text-sm text-text-muted">Cargando subcategorías…</p>
        ) : subcategoriesByCategory.length === 0 ? (
          <p className="text-sm text-text-muted">No hay subcategorías disponibles.</p>
        ) : (
          <div className="space-y-2">
            {subcategoriesByCategory.map((group) => {
              const selectedInGroup = subCountForGroup(group);
              return (
                <InterestsDisclosure
                  key={group.category}
                  title={group.label}
                  badge={selectionBadge(selectedInGroup, 'elegida', 'elegidas')}
                >
                  <div className="flex flex-col">
                    {group.items.map((s) => (
                      <PrefCheckbox
                        key={s.id}
                        id={`sub-${s.id}`}
                        checked={subcategoryIds.includes(s.id)}
                        onChange={(on) => toggleSubcategory(s.id, on)}
                        label={s.name}
                      />
                    ))}
                  </div>
                </InterestsDisclosure>
              );
            })}
          </div>
        )}
      </InterestsDisclosure>

      <InterestsDisclosure title="Alertas por intereses" description="Avisos según lo que elegiste arriba.">
        <div className="flex flex-col gap-1">
          <PrefCheckbox
            id="cat-alerts"
            checked={categoryAlerts}
            onChange={setCategoryAlerts}
            label="Recibir alertas de estas categorías"
          />
          <PrefCheckbox
            id="sub-alerts"
            checked={subcategoryAlerts}
            onChange={setSubcategoryAlerts}
            label="Recibir alertas de estas subcategorías"
          />
        </div>
      </InterestsDisclosure>

      <Button type="submit" disabled={patch.isPending} className="mt-2 w-full sm:w-auto">
        {patch.isPending ? 'Guardando…' : 'Guardar intereses'}
      </Button>
    </form>
  );
}
