'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  PageContainer,
  SectionTitle,
  PageLoader,
  QueryError,
  EmptyState,
  Button,
  Input,
  Modal,
  useToast,
} from '@/components';
import {
  useScannerAccountsList,
  useScannerAccountsMutations,
  useScannerParentProfiles,
} from '@/lib/query/scanner-accounts';
import { getErrorMessage } from '@/lib/errors';
import type { ScannerAccountsPortal } from '@/repositories/interfaces';
import type { ScannerAccountSummary } from '@yo-te-invito/shared';
import { ScannerPwaCta } from '@/components/portal/scanner/ScannerPwaCta';
import { groupScannerAccountsByProfile } from '@/lib/scanner/groupScannerAccounts';
import { ScannerAccountsList } from './ScannerAccountsList';
import { ScannerAccountGroups } from './ScannerAccountGroups';

const PORTAL_COPY: Record<
  ScannerAccountsPortal,
  { backHref: string; backLabel: string; parentLabel: string }
> = {
  producer: {
    backHref: '/producer',
    backLabel: 'Dashboard',
    parentLabel: 'Productora',
  },
  gastro: {
    backHref: '/gastro',
    backLabel: 'Dashboard',
    parentLabel: 'Local gastronómico',
  },
};

type Props = {
  portal: ScannerAccountsPortal;
  /** Gastro: list every scanner of the account, one section per location. */
  groupByProfile?: boolean;
  /** Highlighted location in grouped mode (dashboard's active local); never a filter. */
  activeProfileId?: string;
};

export function ScannerUsersPanel({ portal, groupByProfile = false, activeProfileId }: Props) {
  const copy = PORTAL_COPY[portal];
  const { addToast } = useToast();
  const listQuery = useScannerAccountsList(portal);
  const parentProfilesQuery = useScannerParentProfiles(portal);
  const { create, updateStatus, resetPassword } = useScannerAccountsMutations(portal);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [parentProfileId, setParentProfileId] = useState('');
  const [tempPasswordModal, setTempPasswordModal] = useState<string | null>(null);

  const parentOptions = parentProfilesQuery.data?.data ?? [];
  const showParentPicker = parentOptions.length > 1;

  const defaultParentId = useMemo(() => {
    if (parentOptions.length === 0) return '';
    const primary = parentOptions.find((p) => p.isPrimary);
    if (primary) return primary.id;
    if (parentOptions.length === 1) return parentOptions[0]!.id;
    return '';
  }, [parentOptions]);

  useEffect(() => {
    if (!sheetOpen) return;
    if (parentProfileId) return;
    if (defaultParentId) setParentProfileId(defaultParentId);
  }, [sheetOpen, defaultParentId, parentProfileId]);

  const items = listQuery.data?.data ?? [];
  const groups = useMemo(
    () => (groupByProfile ? groupScannerAccountsByProfile(items, parentOptions) : []),
    [groupByProfile, items, parentOptions],
  );

  const openCreate = (profileId?: string) => {
    if (profileId) setParentProfileId(profileId);
    setSheetOpen(true);
  };

  const resetForm = () => {
    setUsername('');
    setFirstName('');
    setLastName('');
    setPassword('');
    setParentProfileId(defaultParentId);
  };

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const resolvedParentId = parentProfileId.trim() || defaultParentId;
    if (showParentPicker && !resolvedParentId) {
      addToast(`Seleccioná ${copy.parentLabel.toLowerCase()}.`, 'error');
      return;
    }
    try {
      const result = await create.mutateAsync({
        username: username.trim(),
        ...(firstName.trim() ? { firstName: firstName.trim() } : {}),
        ...(lastName.trim() ? { lastName: lastName.trim() } : {}),
        ...(password.trim() ? { password: password.trim() } : {}),
        ...(resolvedParentId ? { parentProfileId: resolvedParentId } : {}),
      });
      setSheetOpen(false);
      resetForm();
      if (result.temporaryPassword) {
        setTempPasswordModal(result.temporaryPassword);
        addToast(
          'Usuario scanner creado. Ya puede iniciar sesión en la app scanner con estas credenciales.',
          'success',
        );
      } else {
        addToast('Usuario scanner creado. Ya puede iniciar sesión en la app scanner.', 'success');
      }
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    }
  };

  const handleToggle = async (account: ScannerAccountSummary) => {
    try {
      await updateStatus.mutateAsync({
        accountId: account.id,
        isActive: !account.isActive,
      });
      addToast(account.isActive ? 'Scanner desactivado.' : 'Scanner activado.', 'success');
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
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
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
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
        {groupByProfile && groups.length === 0 ? null : (
          <Button type="button" onClick={() => openCreate(activeProfileId)}>
            Crear scanner
          </Button>
        )}
      </div>

      {listQuery.isLoading || (groupByProfile && parentProfilesQuery.isLoading) ? (
        <div className="mt-8">
          <PageLoader />
        </div>
      ) : listQuery.isError ? (
        <QueryError className="mt-8" message={getErrorMessage(listQuery.error)} />
      ) : groupByProfile ? (
        <ScannerAccountGroups
          groups={groups}
          activeProfileId={activeProfileId}
          togglePending={updateStatus.isPending}
          resetPending={resetPassword.isPending}
          onCreate={openCreate}
          onToggle={(account) => void handleToggle(account)}
          onResetPassword={(account) => void handleResetPassword(account)}
        />
      ) : items.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Todavía no hay usuarios scanner."
            description="Creá uno para que el equipo valide en la app Scanner, sin acceso al panel."
          />
          <div className="mt-4 flex justify-center">
            <Button type="button" onClick={() => openCreate()}>
              Crear scanner
            </Button>
          </div>
        </div>
      ) : (
        <ScannerAccountsList
          items={items}
          parentLabel={copy.parentLabel}
          togglePending={updateStatus.isPending}
          resetPending={resetPassword.isPending}
          onToggle={(account) => void handleToggle(account)}
          onResetPassword={(account) => void handleResetPassword(account)}
        />
      )}

      <Modal
        isOpen={sheetOpen}
        onClose={() => {
          setSheetOpen(false);
          resetForm();
        }}
        title="Crear scanner"
        footer={
          <>
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
            <Button
              type="submit"
              form="scanner-create-form"
              disabled={
                create.isPending ||
                !username.trim() ||
                (showParentPicker && !parentProfileId.trim() && !defaultParentId)
              }
            >
              {create.isPending ? 'Creando…' : 'Crear scanner'}
            </Button>
          </>
        }
      >
        <form
          id="scanner-create-form"
          autoComplete="off"
          onSubmit={(e) => void handleCreate(e)}
          className="space-y-4"
        >
          <Input
            label="Usuario"
            id="scanner-create-username"
            name="scanner-create-username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="off"
            placeholder="ej. barrascanner"
            required
          />
          <Input
            label="Nombre (opcional)"
            id="scanner-create-first-name"
            name="scanner-create-first-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            autoComplete="off"
          />
          <Input
            label="Apellido (opcional)"
            id="scanner-create-last-name"
            name="scanner-create-last-name"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            autoComplete="off"
          />
          <div>
            <Input
              label="Contraseña inicial (opcional)"
              id="scanner-create-password"
              name="scanner-create-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
            <p className="mt-1 text-xs text-text-muted">
              Si la dejás vacía, generamos una contraseña temporal.
            </p>
          </div>

          {showParentPicker && (
            <div>
              <label
                className="mb-1 block text-sm font-medium text-text"
                htmlFor="scanner-create-parent-profile"
              >
                {copy.parentLabel}
              </label>
              <select
                id="scanner-create-parent-profile"
                name="scanner-create-parent-profile"
                value={parentProfileId}
                onChange={(e) => setParentProfileId(e.target.value)}
                className="w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text"
                required
              >
                <option value="">Seleccioná…</option>
                {parentOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.displayName}
                    {option.isPrimary ? ' (principal)' : ''}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-text-muted">
                Tu cuenta gestiona más de un perfil. Elegí dónde operará este scanner.
              </p>
            </div>
          )}

          {!showParentPicker && parentOptions.length === 1 && (
            <p className="text-xs text-text-muted">
              Scanner para: <strong className="text-text">{parentOptions[0]!.displayName}</strong>
            </p>
          )}
        </form>
      </Modal>

      <Modal
        isOpen={tempPasswordModal !== null}
        onClose={() => setTempPasswordModal(null)}
        title="Contraseña temporal"
        footer={
          tempPasswordModal ? (
            <Button type="button" onClick={() => void copyPassword(tempPasswordModal)}>
              Copiar contraseña
            </Button>
          ) : undefined
        }
      >
        {tempPasswordModal ? (
          <div className="space-y-4">
            <p className="text-sm text-text-muted">
              Compartila una sola vez con quien usará el scanner. No volverá a mostrarse.
            </p>
            <div className="rounded-lg border border-border bg-bg-muted/40 p-3 font-mono text-sm break-all">
              {tempPasswordModal}
            </div>
          </div>
        ) : null}
      </Modal>
    </PageContainer>
  );
}
