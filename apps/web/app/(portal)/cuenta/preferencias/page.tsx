'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { PageContainer, SectionTitle, Button, Input, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

export default function PreferenciasPage() {
  const { data: session } = useSession();
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const userId = (session?.user as { userId?: string })?.userId ?? (session?.user as { id?: string })?.id ?? '';

  const { data: prefs } = useQuery({
    queryKey: ['userPreferences', userId],
    queryFn: () => repos.users.getPreferences(userId),
    enabled: !!userId,
  });

  const [city, setCity] = useState('');
  const [notifyNew, setNotifyNew] = useState(true);
  const [notifyReminders, setNotifyReminders] = useState(true);

  useEffect(() => {
    if (prefs) {
      setCity(prefs.preferredCity ?? '');
      setNotifyNew(prefs.notifyNewEvents);
      setNotifyReminders(prefs.notifyReminders);
    }
  }, [prefs]);

  const updateMutation = useMutation({
    mutationFn: (patch: { preferredCity?: string; notifyNewEvents?: boolean; notifyReminders?: boolean }) =>
      repos.users.updatePreferences(userId, patch),
    onError: (err) => addToast(getErrorMessage(err), 'error'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['userPreferences'] }),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      preferredCity: city.trim() || undefined,
      notifyNewEvents: notifyNew,
      notifyReminders,
    });
  };

  if (!session?.user) {
    return (
      <PageContainer>
        <p className="text-text-muted">Iniciá sesión.</p>
        <Link href="/login" className="mt-4 block text-accent">Iniciar sesión</Link>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <Link href="/cuenta" className="mb-4 inline-block text-sm text-text-muted hover:text-text">
        ← Cuenta
      </Link>
      <SectionTitle>Preferencias</SectionTitle>
      <p className="mt-2 text-text-muted">Ciudad, notificaciones y privacidad.</p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-md space-y-4">
        <Input
          label="Ciudad preferida"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Buenos Aires"
        />
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="notifyNew"
            checked={notifyNew}
            onChange={(e) => setNotifyNew(e.target.checked)}
            className="rounded border-border"
          />
          <label htmlFor="notifyNew" className="text-sm text-text">
            Notificarme sobre nuevos eventos
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="notifyReminders"
            checked={notifyReminders}
            onChange={(e) => setNotifyReminders(e.target.checked)}
            className="rounded border-border"
          />
          <label htmlFor="notifyReminders" className="text-sm text-text">
            Recordatorios de eventos
          </label>
        </div>
        <Button type="submit" disabled={updateMutation.isPending}>
          {updateMutation.isPending ? 'Guardando…' : 'Guardar'}
        </Button>
        {updateMutation.isSuccess && (
          <p className="text-sm text-accent">Preferencias guardadas.</p>
        )}
      </form>
    </PageContainer>
  );
}
