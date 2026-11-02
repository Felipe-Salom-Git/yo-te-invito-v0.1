'use client';

import { buildPublicGastroCanonicalPath } from '@/lib/share/gastroLocationShare';
import { PublicShareButton } from './PublicShareButton';

/** G9 gastro location share — now the shared `PublicShareButton` on the canonical ficha path. */
export function GastroLocationShareActions({
  displayName,
  profileId,
  tone = 'subtle',
  menuPlacement = 'down',
}: {
  displayName: string;
  profileId: string;
  tone?: 'overlay' | 'subtle';
  menuPlacement?: 'up' | 'down';
}) {
  return (
    <PublicShareButton
      kind="place"
      title={displayName}
      path={buildPublicGastroCanonicalPath(profileId)}
      tone={tone}
      menuPlacement={menuPlacement}
    />
  );
}
