'use client';

import type { ProducerDetail } from '@/repositories/interfaces';
import { ProducerIdentityBlock } from './ProducerIdentityBlock';
import { ProducerImagesBlock } from './ProducerImagesBlock';
import { ProducerContactBlock } from './ProducerContactBlock';
import { ProducerPublicProfileBlock } from './ProducerPublicProfileBlock';

export function ProducerProfileBlockGrid({ profile }: { profile: ProducerDetail }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ProducerIdentityBlock profile={profile} />
      <ProducerImagesBlock profile={profile} />
      <ProducerContactBlock profile={profile} />
      <ProducerPublicProfileBlock profile={profile} />
    </div>
  );
}
