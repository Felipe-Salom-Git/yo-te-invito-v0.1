'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  PageContainer,
  SectionTitle,
  Button,
  Input,
  Select,
  useToast,
} from '@/components';
import {
  useAdminCampaignContentPicker,
  useCreateAdminCampaign,
} from '@/lib/query/admin-campaigns';
import { CAMPAIGN_CATEGORY_OPTIONS } from '@/lib/admin/campaign-labels';
import { getErrorMessage } from '@/lib/errors';
import type { AdminCampaignAudienceKind, AdminCampaignChannel, AdminCampaignContentType } from '@yo-te-invito/shared';

export default function AdminNuevaCampanaPage() {
  const router = useRouter();
  const { addToast } = useToast();
  const create = useCreateAdminCampaign();

  const [channel, setChannel] = useState<AdminCampaignChannel>('EMAIL');
  const [contentType, setContentType] = useState<AdminCampaignContentType>('GASTRO_DISCOUNT');
  const [contentId, setContentId] = useState('');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [audienceKind, setAudienceKind] = useState<AdminCampaignAudienceKind>('ALL_ELIGIBLE');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('gastro');
  const [subject, setSubject] = useState('');
  const [headline, setHeadline] = useState('');
  const [body, setBody] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Ver más');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const picker = useAdminCampaignContentPicker(contentType, debounced);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const row = await create.mutateAsync({
        channel,
        contentType,
        contentId,
        audienceKind,
        audienceFilter:
          audienceKind === 'CITY'
            ? { city }
            : audienceKind === 'FAVORITE_CATEGORY'
              ? { category: category as 'event' | 'gastro' | 'rental' | 'excursion' | 'hotel' }
              : undefined,
        subject,
        headline,
        body,
        ctaLabel,
      });
      addToast('Borrador creado', 'success');
      router.push(`/admin/campanas/${row.id}`);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  };

  return (
    <PageContainer>
      <Link href="/admin/campanas" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Campañas
      </Link>
      <SectionTitle>Nueva campaña</SectionTitle>
      <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4">
        <Select
          label="Canal"
          value={channel}
          onChange={(e) => setChannel(e.target.value as AdminCampaignChannel)}
          options={[
            { value: 'EMAIL', label: 'Email' },
            { value: 'WHATSAPP', label: 'WhatsApp (proveedor no configurado)' },
          ]}
        />
        {channel === 'WHATSAPP' && (
          <p className="text-sm text-amber-400">
            WhatsApp — proveedor pendiente. Podés guardar el borrador, pero no se puede enviar.
          </p>
        )}
        <Select
          label="Tipo de contenido"
          value={contentType}
          onChange={(e) => {
            setContentType(e.target.value as AdminCampaignContentType);
            setContentId('');
          }}
          options={[
            { value: 'GASTRO_DISCOUNT', label: 'Descuento Gastro' },
            { value: 'ACTIVITY_COUPON', label: 'Cupón de actividad' },
            { value: 'EVENT', label: 'Evento' },
            { value: 'EXCURSION', label: 'Excursión' },
          ]}
        />
        <Input
          label="Buscar contenido elegible"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Nombre o beneficio"
        />
        <div className="max-h-48 space-y-1 overflow-y-auto rounded border border-border p-2">
          {picker.isLoading ? (
            <p className="text-sm text-text-muted">Buscando…</p>
          ) : !picker.data?.data.length ? (
            <p className="text-sm text-text-muted">No hay contenido elegible para promocionar.</p>
          ) : (
            picker.data.data.map((item) => (
              <label key={item.id} className="flex cursor-pointer items-start gap-2 rounded p-1 hover:bg-bg">
                <input
                  type="radio"
                  name="contentId"
                  checked={contentId === item.id}
                  onChange={() => setContentId(item.id)}
                />
                <span className="text-sm">
                  {item.title}
                  {item.benefit ? ` · ${item.benefit}` : ''}
                </span>
              </label>
            ))
          )}
        </div>
        <Select
          label="Audiencia"
          value={audienceKind}
          onChange={(e) => setAudienceKind(e.target.value as AdminCampaignAudienceKind)}
          options={[
            { value: 'ALL_ELIGIBLE', label: 'Todos los usuarios elegibles (opt-in email)' },
            { value: 'CITY', label: 'Ciudad' },
            { value: 'FAVORITE_CATEGORY', label: 'Categoría favorita' },
            { value: 'CONTENT_CLAIMANTS', label: 'Quienes reclamaron este contenido' },
          ]}
        />
        {audienceKind === 'CITY' && (
          <Input label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} required />
        )}
        {audienceKind === 'FAVORITE_CATEGORY' && (
          <Select
            label="Categoría"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={CAMPAIGN_CATEGORY_OPTIONS}
          />
        )}
        <Input
          label="Asunto"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          maxLength={120}
        />
        <Input
          label="Título"
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          required
          maxLength={160}
        />
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-text">Texto</span>
          <textarea
            className="w-full rounded border border-border bg-bg px-3 py-2 text-sm text-text"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            maxLength={2000}
          />
        </label>
        <Input
          label="Texto del botón"
          value={ctaLabel}
          onChange={(e) => setCtaLabel(e.target.value)}
          maxLength={40}
        />
        <p className="text-xs text-text-muted">
          El nombre, beneficio e imagen del recurso se toman del contenido canónico. El botón apunta a
          la ficha pública.
        </p>
        <Button type="submit" disabled={create.isPending || !contentId}>
          {create.isPending ? 'Guardando…' : 'Guardar borrador'}
        </Button>
      </form>
    </PageContainer>
  );
}
