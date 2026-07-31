import type { Metadata } from 'next';
import EntryPageClient from './EntryPageClient';

/** Gateway `/` — contenido vivo / redirects; no cachear HTML de build. */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export const metadata: Metadata = {
  alternates: {
    canonical: '/home',
  },
};

export default function EntryPage() {
  return <EntryPageClient />;
}
