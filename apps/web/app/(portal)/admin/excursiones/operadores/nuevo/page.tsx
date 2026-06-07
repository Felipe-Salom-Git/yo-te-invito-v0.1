'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { createEmptyRentalOpeningHours } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { OpeningHoursEditor } from '@/components/forms/OpeningHoursEditor';
import {
  EMPTY_LOCATION_VALUE,
  RentalLocationFields,
  excursionOperatorPayloadFromLocationValue,
  validateLocationValue,
  type LocationValue,
} from '@/components/location';
import {
  ExternalLinksFormFields,
  EMPTY_EXTERNAL_LINKS_FORM,
  externalLinksToPayload,
  type ExternalLinksFormValue,
} from '@/components/forms/ExternalLinksFormFields';

const TENANT_ID = 'tenant-demo';

export default function AdminExcursionOperadorNuevoPage() {
  const router = useRouter();
  const repos = useRepositories();
  const { addToast } = useToast();
  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION_VALUE);
  const [openingHours, setOpeningHours] = useState(() => createEmptyRentalOpeningHours());
  const [openingHoursNote, setOpeningHoursNote] = useState('');
  const [externalLinks, setExternalLinks] = useState<ExternalLinksFormValue>(
    EMPTY_EXTERNAL_LINKS_FORM,
  );
  const [locationError, setLocationError] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: () => {
      const geo = excursionOperatorPayloadFromLocationValue(location);
      const links = externalLinksToPayload(externalLinks);
      return repos.excursionOperators.create({
        tenantId: TENANT_ID,
        name: name.trim(),
        contactPhone: contactPhone.trim() || null,
        openingHours,
        openingHoursNote: openingHoursNote.trim() || null,
        websiteUrl: links.websiteUrl,
        bookingUrl: links.bookingUrl,
        socialLinks: links.socialLinks,
        ...geo,
      });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (op) => router.push(`/admin/excursiones/operadores/${op.id}`),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const locErr = validateLocationValue(location, { requireAddress: false });
    if (locErr) {
      setLocationError(locErr);
      return;
    }
    setLocationError(null);
    createMutation.mutate();
  };

  return (
    <PageContainer>
      <Link
        href="/admin/excursiones"
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Excursiones
      </Link>
      <SectionTitle>Nuevo operador</SectionTitle>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-4">
        <Input label="Nombre del operador/local" value={name} onChange={(e) => setName(e.target.value)} required />
        <RentalLocationFields
          value={location}
          onChange={setLocation}
          mapError={locationError ?? undefined}
        />
        <Input
          label="WhatsApp / contacto"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="+54 9 11 1234-5678"
        />
        <OpeningHoursEditor
          value={openingHours}
          onChange={setOpeningHours}
          note={openingHoursNote}
          onNoteChange={setOpeningHoursNote}
        />
        <ExternalLinksFormFields
          value={externalLinks}
          onChange={setExternalLinks}
          sectionTitle="Reservas y redes"
        />
        <div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Creando…' : 'Crear operador'}
          </Button>
          <Link href="/admin/excursiones">
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
