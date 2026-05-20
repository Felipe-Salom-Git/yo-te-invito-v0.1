'use client';

import Link from 'next/link';
import { getProducerPublicPath } from '@/lib/producer/public-path';

type Props = {
  producer: { id: string; slug?: string | null };
  className?: string;
  label?: string;
};

export function ProducerPublicPageLink({
  producer,
  className = 'text-sm font-medium text-accent hover:underline',
  label = 'Ver perfil público',
}: Props) {
  return (
    <Link href={getProducerPublicPath(producer)} className={className} target="_blank" rel="noopener noreferrer">
      {label}
    </Link>
  );
}
