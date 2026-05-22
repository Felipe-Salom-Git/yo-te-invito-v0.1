'use client';

import { useParams } from 'next/navigation';
import { UserPublicReviewerPage } from '@/components/reviews/UserPublicReviewerPage';

export default function UserPublicReviewsPage() {
  const { userId } = useParams<{ userId: string }>();

  if (!userId) {
    return null;
  }

  return <UserPublicReviewerPage userId={userId} />;
}
