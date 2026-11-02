'use client';

import { Button } from '@/components';
import type { ScannerAccountSummary } from '@yo-te-invito/shared';

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

function accountName(account: ScannerAccountSummary): string {
  return [account.firstName, account.lastName].filter(Boolean).join(' ') || 'Sin nombre';
}

type ScannerAccountsListProps = {
  items: ScannerAccountSummary[];
  parentLabel: string;
  /** Hidden when the list is already grouped under its location. */
  showParent?: boolean;
  togglePending: boolean;
  resetPending: boolean;
  onToggle: (account: ScannerAccountSummary) => void;
  onResetPassword: (account: ScannerAccountSummary) => void;
  className?: string;
};

/** Scanner accounts: cards on mobile, table from `md`. */
export function ScannerAccountsList({
  items,
  parentLabel,
  showParent = true,
  togglePending,
  resetPending,
  onToggle,
  onResetPassword,
  className = 'mt-6',
}: ScannerAccountsListProps) {
  const actions = (account: ScannerAccountSummary) => (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={togglePending}
        onClick={() => onToggle(account)}
      >
        {account.isActive ? 'Desactivar' : 'Activar'}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={resetPending}
        onClick={() => onResetPassword(account)}
      >
        Resetear clave
      </Button>
    </>
  );

  return (
    <div className={className}>
      <ul className="space-y-3 md:hidden">
        {items.map((account) => (
          <li key={account.id} className="rounded-xl border border-border bg-bg p-4">
            <p className="font-medium text-text">{account.username ?? account.email ?? '—'}</p>
            <p className="mt-1 text-sm text-text-muted">{accountName(account)}</p>
            {showParent ? (
              <p className="mt-2 text-sm text-text">
                {parentLabel}: {account.parentDisplayName?.trim() || '—'}
              </p>
            ) : null}
            <div className="mt-2">
              <StatusBadge account={account} />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{actions(account)}</div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto rounded-xl border border-border md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-bg-muted/50 text-xs uppercase text-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Scanner</th>
              {showParent ? <th className="px-4 py-3 font-medium">{parentLabel}</th> : null}
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((account) => (
              <tr key={account.id} className="bg-bg">
                <td className="px-4 py-3 text-text">
                  <div className="font-medium">{account.username ?? account.email ?? '—'}</div>
                  <div className="mt-0.5 text-xs text-text-muted">{accountName(account)}</div>
                </td>
                {showParent ? (
                  <td className="px-4 py-3 text-text">{account.parentDisplayName?.trim() || '—'}</td>
                ) : null}
                <td className="px-4 py-3">
                  <StatusBadge account={account} />
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-2">{actions(account)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
