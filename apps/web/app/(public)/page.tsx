import type { Metadata } from 'next';
import EntryPageClient from './EntryPageClient';

export const metadata: Metadata = {
  alternates: {
    canonical: '/home',
  },
};

export default function EntryPage() {
  return <EntryPageClient />;
}
