'use client';

import type { ProducerDetail } from '@/repositories/interfaces';
import { ProducerIdentityBlock } from './ProducerIdentityBlock';
import { ProducerImagesBlock } from './ProducerImagesBlock';
import { ProducerContactBlock } from './ProducerContactBlock';
import { ProducerPublicProfileBlock } from './ProducerPublicProfileBlock';

export function ProducerProfileBlockGrid({ profile }: { profile: ProducerDetail }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
      <ProducerIdentityBlock profile={profile} />
      <ProducerImagesBlock profile={profile} />
      <ProducerContactBlock profile={profile} />
      <ProducerPublicProfileBlock profile={profile} />
    </div>
  );
}
