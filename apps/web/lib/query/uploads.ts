'use client';

import { useMutation } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import type { PublicImageUploadInput } from '@/repositories/interfaces';

export function useUploadPublicImage() {
  const repos = useRepositories();
  return useMutation({
    mutationFn: (input: PublicImageUploadInput) => repos.uploads.uploadPublicImage(input),
  });
}
