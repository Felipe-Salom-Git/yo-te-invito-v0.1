'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createEmptyRentalOpeningHours } from '@yo-te-invito/shared';
import { useRepositories } from '@/repositories/context';
import { excursionOperatorsKeys } from '@/lib/query/keys';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { OpeningHoursEditor } from '@/components/forms/OpeningHoursEditor';
import {
  RentalLocationFields,
  locationValueFromExcursionOperator,
  excursionOperatorPayloadFromLocationValue,
  validateLocationValue,
  type LocationValue,
} from '@/components/location';
import {
  ExternalLinksFormFields,
  externalLinksFromExcursionOperator,
  externalLinksToPayload,
  type ExternalLinksFormValue,
} from '@/components/forms/ExternalLinksFormFields';

export default function AdminExcursionOperadorEditarPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const operatorId = (params?.operatorId as string) ?? '';
  const repos = useRepositories();
  const { addToast } = useToast();

  const { data: operator, isLoading } = useQuery({
    queryKey: excursionOperatorsKeys.adminDetail(operatorId),
    queryFn: () => repos.excursionOperators.getAdmin(operatorId),
    enabled: !!operatorId,
  });

  const [name, setName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [locationValue, setLocationValue] = useState<LocationValue>({
    address: '',
    province: '',
    city: '',
    lat: null,
    lng: null,
    placeId: null,
  });
  const [openingHours, setOpeningHours] = useState(() => createEmptyRentalOpeningHours());
  const [openingHoursNote, setOpeningHoursNote] = useState('');
  const [externalLinks, setExternalLinks] = useState<ExternalLinksFormValue>(
    externalLinksFromExcursionOperator({}),
  );
  const [locationError, setLocationError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (operator && !hydrated) {
      setName(operator.name);
      setContactPhone(operator.contactPhone ?? '');
      setLocationValue(locationValueFromExcursionOperator(operator));
      setOpeningHours(operator.openingHours ?? createEmptyRentalOpeningHours());
      setOpeningHoursNote(operator.openingHoursNote ?? '');
      setExternalLinks(externalLinksFromExcursionOperator(operator));
      setHydrated(true);
    }
  }, [operator, hydrated]);

  const updateMutation = useMutation({
    mutationFn: () => {
      const geo = excursionOperatorPayloadFromLocationValue(locationValue);
      const links = externalLinksToPayload(externalLinks);
      return repos.excursionOperators.update(operatorId, {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: excursionOperatorsKeys.all });
      router.push(`/admin/excursiones/operadores/${operatorId}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const locErr = validateLocationValue(locationValue);
    if (locErr) {
      setLocationError(locErr);
      return;
    }
    setLocationError(null);
    updateMutation.mutate();
  };

  if (isLoading) {
    return (
      <PageContainer>
        <p className="text-text-muted">Cargando…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link
        href={`/admin/excursiones/operadores/${operatorId}`}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← Operador
      </Link>
      <SectionTitle>Editar operador</SectionTitle>

      <form onSubmit={handleSubmit} className="mt-6 max-w-2xl space-y-4">
        <Input label="Nombre del operador/local" value={name} onChange={(e) => setName(e.target.value)} required />
        <RentalLocationFields
          value={locationValue}
          onChange={setLocationValue}
          mapError={locationError ?? undefined}
        />
        <Input
          label="WhatsApp / contacto"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
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
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
          </Button>
          <Link href={`/admin/excursiones/operadores/${operatorId}`}>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </Link>
        </div>
      </form>
    </PageContainer>
  );
}
