'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { useTenant } from '@/hooks/useTenant';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export default function AdminConfiguracionPage() {
  const repos = useRepositories();
  const { tenantId } = useTenant();
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: config, isLoading } = useQuery({
    queryKey: ['platformConfig', tenantId],
    queryFn: () => repos.platformConfig.get(tenantId),
  });

  const [contact, setContact] = useState({ email: '', phone: '', address: '' });
  const [newCategoryLabel, setNewCategoryLabel] = useState('');

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
    },
  });

  const addCategoryMutation = useMutation({
    mutationFn: (label: string) => {
      const id = label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      const current = config ?? { contact: { email: '', phone: '', address: '' }, categories: [] };
      const categories = [...current.categories];
      if (categories.some((c) => c.id === id)) return repos.platformConfig.update(tenantId, { categories });
      categories.push({ id, label });
      return repos.platformConfig.update(tenantId, { categories });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => {
      setNewCategoryLabel('');
      queryClient.invalidateQueries({ queryKey: ['platformConfig', tenantId] });
    },
  });

  const removeCategoryMutation = useMutation({
    mutationFn: (id: string) => {
      const current = config ?? { contact: { email: '', phone: '', address: '' }, categories: [] };
      const categories = current.categories.filter((c) => c.id !== id);
      return repos.platformConfig.update(tenantId, { categories });
    },
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['platformConfig', tenantId] }),
  });

  const categories = config?.categories ?? [];
  const contactDisplay = config?.contact ?? { email: '', phone: '', address: '' };
  const contactDirty =
    contact.email !== contactDisplay.email ||
    contact.phone !== contactDisplay.phone ||
    contact.address !== contactDisplay.address;
  const displayContact = { email: contact.email || contactDisplay.email, phone: contact.phone || contactDisplay.phone, address: contact.address || contactDisplay.address };

  return (
    <PageContainer>
      <Link href="/admin" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Admin
      </Link>
      <SectionTitle>Configuración de plataforma</SectionTitle>

      {isLoading ? (
        <p className="mt-6 text-text-muted">Cargando…</p>
      ) : (
        <>
          <section className="mt-6">
            <h3 className="text-sm font-semibold text-text">Datos de contacto</h3>
            <p className="mt-1 text-sm text-text-muted">Email, teléfono y dirección de la plataforma.</p>
            <div className="mt-3 max-w-md space-y-3">
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
            </div>
          </section>

          <section className="mt-8">
            <h3 className="text-sm font-semibold text-text">Categorías</h3>
            <p className="mt-1 text-sm text-text-muted">Tipos de servicio: eventos, restaurants, rentals, excursiones.</p>
            <ul className="mt-3 space-y-1">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded border border-border bg-bg-muted px-3 py-2">
                  <span className="text-text">{c.label}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeCategoryMutation.mutate(c.id)}
                    disabled={removeCategoryMutation.isPending}
                  >
                    Eliminar
                  </Button>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <Input
                value={newCategoryLabel}
                onChange={(e) => setNewCategoryLabel(e.target.value)}
                placeholder="Nueva categoría"
                className="flex-1"
              />
              <Button
                onClick={() => addCategoryMutation.mutate(newCategoryLabel.trim())}
                disabled={!newCategoryLabel.trim() || addCategoryMutation.isPending}
              >
                Agregar
              </Button>
            </div>
          </section>
        </>
      )}
    </PageContainer>
  );
}
