'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  PageContainer,
  SectionTitle,
  Button,
  Input,
  PageLoader,
  useToast,
} from '@/components';
import { useMeAccount, usePatchMeAccount, useChangePassword } from '@/lib/query/me-portal';
import { useRepositories } from '@/repositories/context';
import { getErrorMessage } from '@/lib/errors';

export default function MeAccountPage() {
  const { addToast } = useToast();
  const repos = useRepositories();
  const { data: account, isLoading } = useMeAccount();
  const patchAccount = usePatchMeAccount();
  const changePassword = useChangePassword();

  const { data: meUser } = useQuery({
    queryKey: ['me', 'profile'],
    queryFn: () => repos.users.getMe(''),
  });

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (account) {
      setFirstName(account.firstName);
      setLastName(account.lastName);
      setPhone(account.phone ?? '');
      setCity(account.city ?? '');
    }
  }, [account]);

  const producerAccess = meUser?.availableProfiles?.producer?.hasAccess ?? false;
  const hasProducerProfiles = (meUser?.availableProfiles?.producer?.profiles?.length ?? 0) > 0;
  const canRequestProducer = !producerAccess && !hasProducerProfiles;

  if (isLoading) {
    return (
      <PageContainer>
        <PageLoader message="Cargando cuenta…" />
      </PageContainer>
    );
  }

  const saveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    patchAccount.mutate(
      {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || null,
        city: city.trim() || null,
      },
      {
        onSuccess: () => addToast('Perfil actualizado', 'success'),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  const savePassword = (e: React.FormEvent) => {
    e.preventDefault();
    changePassword.mutate(
      { currentPassword, newPassword },
      {
        onSuccess: () => {
          addToast('Contraseña actualizada', 'success');
          setCurrentPassword('');
          setNewPassword('');
        },
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  };

  return (
    <PageContainer>
      <SectionTitle>Mi cuenta</SectionTitle>
      {account && (
        <p className="mt-1 text-sm text-text-muted">{account.email}</p>
      )}

      <form onSubmit={saveProfile} className="mt-8 max-w-md space-y-4">
        <h3 className="font-medium text-text">Datos personales</h3>
        <Input label="Nombre" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        <Input label="Apellido" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        <Input label="Teléfono" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input label="Ciudad" value={city} onChange={(e) => setCity(e.target.value)} />
        <Button type="submit" disabled={patchAccount.isPending}>
          {patchAccount.isPending ? 'Guardando…' : 'Guardar perfil'}
        </Button>
      </form>

      <form onSubmit={savePassword} className="mt-10 max-w-md space-y-4">
        <h3 className="font-medium text-text">Cambiar contraseña</h3>
        <Input
          label="Contraseña actual"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
        <Input
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <Button type="submit" disabled={changePassword.isPending}>
          {changePassword.isPending ? 'Guardando…' : 'Actualizar contraseña'}
        </Button>
      </form>

      {canRequestProducer && (
        <div className="mt-10 rounded-lg border border-border p-4">
          <h3 className="font-medium text-text">¿Sos productor de eventos?</h3>
          <p className="mt-2 text-sm text-text-muted">
            Creá tu perfil de productor para publicar eventos.
          </p>
          <Link href="/cuenta/solicitar-productor" className="mt-4 inline-block text-sm text-accent hover:underline">
            Solicitar perfil productor
          </Link>
        </div>
      )}
    </PageContainer>
  );
}
