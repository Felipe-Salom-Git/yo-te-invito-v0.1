'use client';

import Link from 'next/link';
import { Button, EmptyState } from '@/components';
import type { ScannerAccountSummary } from '@yo-te-invito/shared';
import type { ScannerAccountGroup } from '@/lib/scanner/groupScannerAccounts';
import { ScannerAccountsList } from './ScannerAccountsList';

type ScannerAccountGroupsProps = {
  groups: ScannerAccountGroup[];
  /** Dashboard's active location — only highlighted, never used as a filter. */
  activeProfileId?: string;
  togglePending: boolean;
  resetPending: boolean;
  onCreate: (profileId: string) => void;
  onToggle: (account: ScannerAccountSummary) => void;
  onResetPassword: (account: ScannerAccountSummary) => void;
};

/**
 * G11.2 — Gastro portal: every scanner of the account, one section per location.
 * Todos los scanners de la cuenta, una sección por local.
 */
export function ScannerAccountGroups({
  groups,
  activeProfileId,
  togglePending,
  resetPending,
  onCreate,
  onToggle,
  onResetPassword,
}: ScannerAccountGroupsProps) {
  if (groups.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          title="Todavía no tenés locales gastronómicos."
          description="Creá un local para poder sumar usuarios scanner."
        />
        <div className="mt-4 flex justify-center">
          <Link href="/gastro/local/nuevo">
            <Button type="button">Crear local</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      {groups.map((group) => {
        const headingId = `scanner-group-${group.profileId}`;
        const count = group.accounts.length;
        return (
          <section key={group.profileId} aria-labelledby={headingId}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={headingId} className="text-base font-semibold text-text">
                  {group.displayName}
                </h2>
                {group.isPrimary ? (
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs text-text-muted">
                    Principal
                  </span>
                ) : null}
                {group.profileId === activeProfileId ? (
                  <span className="rounded-full border border-accent-muted bg-accent-surface/70 px-2 py-0.5 text-xs text-accent-soft">
                    Local activo
                  </span>
                ) : null}
                <span className="text-xs text-text-muted">
                  {count} {count === 1 ? 'scanner' : 'scanners'}
                </span>
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={() => onCreate(group.profileId)}>
                Crear scanner
              </Button>
            </div>
            {count === 0 ? (
              <p className="mt-3 text-sm text-text-muted">Este local no tiene usuarios scanner.</p>
            ) : (
              <ScannerAccountsList
                className="mt-3"
                items={group.accounts}
                parentLabel="Local"
                showParent={false}
                togglePending={togglePending}
                resetPending={resetPending}
                onToggle={onToggle}
                onResetPassword={onResetPassword}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}
