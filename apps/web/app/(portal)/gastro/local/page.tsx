'use client';

import { useReducer } from 'react';
import { PageContainer, SectionTitle } from '@/components';
import { GastroLocalPreviewModal } from '@/components/gastro/GastroLocalPreviewModal';
import { GastroLocationsList } from '@/components/gastro/GastroLocationsList';
import { GastroLocationSelector } from '@/components/gastro/GastroLocationSelector';
import {
  GASTRO_LOCAL_PREVIEW_CLOSED,
  gastroLocalPreviewReducer,
} from '@/lib/gastro/local-preview-state';

export default function GastroLocalPage() {
  const [preview, dispatchPreview] = useReducer(
    gastroLocalPreviewReducer,
    GASTRO_LOCAL_PREVIEW_CLOSED,
  );

  return (
    <PageContainer>
      <SectionTitle>Mis locales</SectionTitle>
      <div className="mb-6">
        <GastroLocationSelector />
      </div>

      <GastroLocationsList
        onPreview={(profileId) => dispatchPreview({ type: 'open', profileId })}
      />

      <GastroLocalPreviewModal
        key={preview.profileId ?? 'closed'}
        profileId={preview.profileId}
        onClose={() => dispatchPreview({ type: 'close' })}
      />
    </PageContainer>
  );
}
