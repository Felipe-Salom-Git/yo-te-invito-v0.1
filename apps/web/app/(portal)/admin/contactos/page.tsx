'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';
import { publicPlatformConfigKeys } from '@/lib/query/keys';

export default function AdminContactosPage() {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: config, isLoading } = useQuery({
    queryKey: ['platformConfig', tenantId],
    queryFn: () => repos.platformConfig.get(tenantId),
  });

  const [contact, setContact] = useState({ email: '', phone: '', address: '' });

  useEffect(() => {
    if (config?.contact) {
      setContact(config.contact);
    }
  }, [config?.contact]);

  const saveContactMutation = useMutation({
    mutationFn: (c: { email: string; phone: string; address: string }) =>
      repos.platformConfig.update(tenantId, { contact: c }),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: (data) => {
      setContact(data.contact);
      queryClient.invalidateQueries({ queryKey: ['platformConfig', tenantId] });
      queryClient.invalidateQueries({ queryKey: publicPlatformConfigKeys.byTenant(tenantId) });
    },
  });

  const contactDisplay = config?.contact ?? { email: '', phone: '', address: '' };
  const contactDirty =
    contact.email !== contactDisplay.email ||
    contact.phone !== contactDisplay.phone ||
    contact.address !== contactDisplay.address;
  const displayContact = {
    email: contact.email || contactDisplay.email,
    phone: contact.phone || contactDisplay.phone,
    address: contact.address || contactDisplay.address,
  };

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Contactos</SectionTitle>
      <p className="mt-2 text-sm text-text-muted">
        Email, teléfono y dirección de contacto de la plataforma.
      </p>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <section className="mt-6 max-w-md space-y-3">
          <Input
            label="Email"
            type="email"
            value={displayContact.email}
            onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
          />
          <Input
            label="Teléfono"
            value={displayContact.phone}
            onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
          />
          <Input
            label="Dirección"
            value={displayContact.address}
            onChange={(e) => setContact((c) => ({ ...c, address: e.target.value }))}
          />
          <Button
            onClick={() => saveContactMutation.mutate(displayContact)}
            disabled={!contactDirty || saveContactMutation.isPending}
          >
            {saveContactMutation.isPending ? 'Guardando…' : 'Guardar contacto'}
          </Button>
        </section>
      )}
    </PageContainer>
  );
}
