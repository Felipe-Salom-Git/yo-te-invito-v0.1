'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  QueryError,
  EmptyState,
  Button,
  Input,
  SideSheet,
  useToast,
} from '@/components';
import {
  useScannerAccountsList,
  useScannerAccountsMutations,
} from '@/lib/query/scanner-accounts';
import { getErrorMessage } from '@/lib/errors';
import type { ScannerAccountsPortal } from '@/repositories/interfaces';
import type { ScannerAccountSummary } from '@yo-te-invito/shared';
import { ScannerPwaCta } from '@/components/portal/scanner/ScannerPwaCta';

const PORTAL_COPY: Record<
  ScannerAccountsPortal,
  { backHref: string; backLabel: string; parentHint: string }
> = {
  producer: {
    backHref: '/producer',
    backLabel: 'Dashboard',
    parentHint: 'Productora (opcional si tenés más de una)',
  },
  gastro: {
    backHref: '/gastro',
    backLabel: 'Dashboard',
    parentHint: 'Local gastronómico (opcional si tenés más de uno)',
  },
};

function StatusBadge({ account }: { account: ScannerAccountSummary }) {
  const active = account.isActive && account.userStatus === 'ACTIVE';
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        active
          ? 'border-accent-muted bg-accent-surface/70 text-accent-soft'
          : 'border-border bg-zinc-500/15 text-zinc-400'
      }`}
    >
      {active ? 'Activo' : 'Inactivo'}
    </span>
  );
}

type Props = {
  portal: ScannerAccountsPortal;
};

export function ScannerUsersPanel({ portal }: Props) {
  const copy = PORTAL_COPY[portal];
  const { addToast } = useToast();
  const listQuery = useScannerAccountsList(portal);
  const { create, updateStatus, resetPassword } = useScannerAccountsMutations(portal);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [parentProfileId, setParentProfileId] = useState('');
  const [tempPasswordModal, setTempPasswordModal] = useState<string | null>(null);

  const items = listQuery.data?.data ?? [];

  const resetForm = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setPassword('');
    setParentProfileId('');
  };

  const handleCreate = async () => {
    try {
      const result = await create.mutateAsync({
        email: email.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...(password.trim() ? { password: password.trim() } : {}),
        ...(parentProfileId.trim() ? { parentProfileId: parentProfileId.trim() } : {}),
      });
      setSheetOpen(false);
      resetForm();
      if (result.temporaryPassword) {
        setTempPasswordModal(result.temporaryPassword);
        addToast('Usuario scanner creado. Copiá la contraseña temporal.', 'success');
      } else {
        addToast('Usuario scanner creado.', 'success');
      }
    } catch (e) {
      addToast(getErrorMessage(e), 'error');
    }
  };

  const handleToggle = async (account: ScannerAccountSummary) => {
    try {
      await updateStatus.mutateAsync({
        accountId: account.id,
        isActive: !account.isActive,
      });
      addToast(account.isActive ? 'Scanner desactivado.' : 'Scanner activado.', 'success');
    } catch (e) {
      addToast(getErrorMessage(e), 'error');
    }
  };

  const handleResetPassword = async (account: ScannerAccountSummary) => {
    try {
      const result = await resetPassword.mutateAsync({ accountId: account.id });
      if (result.temporaryPassword) {
        setTempPasswordModal(result.temporaryPassword);
        addToast('Contraseña restablecida. Copiá la nueva contraseña.', 'success');
      } else {
        addToast('Contraseña restablecida.', 'success');
      }
    } catch (e) {
      addToast(getErrorMessage(e), 'error');
    }
  };

  const copyPassword = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      addToast('Contraseña copiada.', 'success');
    } catch {
      addToast('No se pudo copiar. Seleccioná el texto manualmente.', 'error');
    }
  };

  return (
    <PageContainer>
      <Link
        href={copy.backHref}
        className="mb-4 inline-block text-sm text-text-muted hover:text-text"
      >
        ← {copy.backLabel}
      </Link>

      <ScannerPwaCta className="mb-6" />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SectionTitle>Usuarios scanner</SectionTitle>
          <p className="mt-2 max-w-2xl text-sm text-text-muted">
            Creá cuentas solo para escanear entradas o descuentos. No tienen acceso al panel
            administrativo ni pueden modificar publicaciones.
          </p>
        </div>
        <Button type="button" onClick={() => setSheetOpen(true)}>
          Nuevo scanner
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div className="mt-8">
          <PageLoader />
        </div>
      ) : listQuery.isError ? (
        <QueryError className="mt-8" message={getErrorMessage(listQuery.error)} />
      ) : items.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="Sin usuarios scanner"
          description="Creá el primero para que tu equipo valide en puerta desde la app Scanner."
        />
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-border">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-border bg-bg-muted/50 text-xs uppercase text-text-muted">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((account) => (
                <tr key={account.id} className="bg-bg">
                  <td className="px-4 py-3 text-text">
                    {account.firstName} {account.lastName}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{account.email}</td>
                  <td className="px-4 py-3">
                    <StatusBadge account={account} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={updateStatus.isPending}
                        onClick={() => void handleToggle(account)}
                      >
                        {account.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={resetPassword.isPending}
                        onClick={() => void handleResetPassword(account)}
                      >
                        Resetear clave
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SideSheet
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          resetForm();
        }}
        title="Nuevo usuario scanner"
      >
        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            required
          />
          <Input
            label="Nombre"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          <Input
            label="Apellido"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            required
          />
          <div>
            <Input
              label="Contraseña inicial (opcional)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-text-muted">
              Si la dejás vacía, generamos una contraseña temporal.
            </p>
          </div>
          <div>
            <Input
              label={copy.parentHint}
              value={parentProfileId}
              onChange={(e) => setParentProfileId(e.target.value)}
            />
            <p className="mt-1 text-xs text-text-muted">
              Solo necesario si gestionás más de un perfil comercial.
            </p>
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              disabled={create.isPending || !email.trim() || !firstName.trim() || !lastName.trim()}
              onClick={() => void handleCreate()}
            >
              {create.isPending ? 'Creando…' : 'Crear scanner'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSheetOpen(false);
                resetForm();
              }}
            >
              Cancelar
            </Button>
          </div>
        </div>
      </SideSheet>

      <SideSheet
        isOpen={tempPasswordModal !== null}
        onClose={() => setTempPasswordModal(null)}
        title="Contraseña temporal"
      >
        {tempPasswordModal ? (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Compartila una sola vez con quien usará el scanner. No volverá a mostrarse.
            </p>
            <div className="rounded-lg border border-border bg-bg-muted/40 p-3 font-mono text-sm break-all">
              {tempPasswordModal}
            </div>
            <Button type="button" onClick={() => void copyPassword(tempPasswordModal)}>
              Copiar contraseña
            </Button>
          </div>
        ) : null}
      </SideSheet>
    </PageContainer>
  );
}
