'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button, Input, Select } from '@/components';
import {
  MAX_PREFERRED_CITIES,
  OTHER_CITY_LABEL,
  PROVINCE_CITY_CATALOG,
  citiesForProvince,
  findProvinceLabelForCity,
  isCustomProvince,
  provinceOptions,
  type ProvinceId,
} from '@/lib/me/preferred-cities';

type Props = {
  selected: string[];
  onChange: (cities: string[]) => void;
  /** Ciudad de Mi cuenta: se muestra en favoritas y se agrega si falta. */
  profileCity?: string | null;
};

export function PreferredCitiesPicker({ selected, onChange, profileCity }: Props) {
  const defaultProvince = PROVINCE_CITY_CATALOG[0]!.id;
  const [provinceId, setProvinceId] = useState<ProvinceId>(defaultProvince);
  const [cityDraft, setCityDraft] = useState('');
  const [customName, setCustomName] = useState('');
  const [hint, setHint] = useState<string | null>(null);

  const profileTrimmed = profileCity?.trim() ?? '';
  const atMax = selected.length >= MAX_PREFERRED_CITIES;
  const showCustomInput = isCustomProvince(provinceId) && cityDraft === OTHER_CITY_LABEL;

  const cityOptions = useMemo(() => {
    const list = citiesForProvince(provinceId);
    return list.map((c) => ({ value: c, label: c }));
  }, [provinceId]);

  useEffect(() => {
    const list = citiesForProvince(provinceId);
    setCityDraft(list[0] ?? '');
    setCustomName('');
    setHint(null);
  }, [provinceId]);

  const resolveCityToAdd = (): string | null => {
    if (!cityDraft) return null;
    if (showCustomInput) {
      const custom = customName.trim();
      return custom.length > 0 ? custom : null;
    }
    return cityDraft;
  };

  const handleAdd = () => {
    setHint(null);
    const toAdd = resolveCityToAdd();
    if (!toAdd) {
      setHint(showCustomInput ? 'Escribí el nombre de la ciudad.' : 'Elegí una ciudad.');
      return;
    }
    if (selected.includes(toAdd)) {
      setHint('Esa ciudad ya está en tus favoritas.');
      return;
    }
    if (atMax) {
      setHint(`Podés guardar hasta ${MAX_PREFERRED_CITIES} ciudades.`);
      return;
    }
    onChange([...selected, toAdd]);
    setHint(null);
    if (showCustomInput) setCustomName('');
  };

  const handleRemove = (city: string) => {
    onChange(selected.filter((c) => c !== city));
    setHint(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Elegí provincia y ciudad, agregalas a favoritas (hasta {MAX_PREFERRED_CITIES}).
        {profileTrimmed
          ? ` Tu ciudad de perfil (${profileTrimmed}) se carga automáticamente.`
          : null}
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          label="Provincia"
          value={provinceId}
          onChange={(e) => setProvinceId(e.target.value as ProvinceId)}
          options={provinceOptions()}
        />
        <Select
          label="Ciudad"
          value={cityDraft}
          onChange={(e) => {
            setCityDraft(e.target.value);
            setHint(null);
          }}
          options={cityOptions}
          placeholder="Elegí una ciudad"
        />
      </div>

      {showCustomInput && (
        <Input
          label="Nombre de la ciudad"
          value={customName}
          onChange={(e) => setCustomName(e.target.value)}
          placeholder="Ej. Esquel"
        />
      )}

      <Button
        type="button"
        variant="secondary"
        disabled={atMax}
        onClick={handleAdd}
        className="w-full sm:w-auto"
      >
        Agregar ciudad
      </Button>

      {hint ? <p className="text-sm text-amber-400">{hint}</p> : null}

      <div>
        <h4 className="text-sm font-medium text-text">Ciudades favoritas</h4>
        {selected.length === 0 ? (
          <p className="mt-2 text-sm text-text-muted">Todavía no agregaste ciudades.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {selected.map((city) => {
              const provinceLabel = findProvinceLabelForCity(city);
              const isProfile = profileTrimmed.length > 0 && city === profileTrimmed;
              return (
                <li
                  key={city}
                  className="flex flex-col gap-2 rounded-lg border border-border bg-bg px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <span className="font-medium text-text">{city}</span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                      {provinceLabel ? <span>{provinceLabel}</span> : <span>Otra ubicación</span>}
                      {isProfile ? (
                        <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-accent">
                          Ciudad de tu perfil
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleRemove(city)}
                    className="shrink-0"
                  >
                    Quitar
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
