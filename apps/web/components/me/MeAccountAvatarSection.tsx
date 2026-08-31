'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, useToast } from '@/components';
import { UserReviewerAvatar } from '@/components/reviews/UserReviewerAvatar';
import { ImageUploadHint } from '@/components/upload/ImageUploadHint';
import { getErrorMessage } from '@/lib/errors';
import { usePatchMeAccount } from '@/lib/query/me-portal';
import {
  IMAGE_ACCEPT_GCS,
  type GcsImageUploadConfig,
} from '@/lib/upload/gcs-image-upload-config';
import { useGcsImageUpload } from '@/lib/upload/use-gcs-image-upload';

type Props = {
  accountId: string;
  displayName: string;
  avatarUrl?: string | null;
};

export function MeAccountAvatarSection({ accountId, displayName, avatarUrl }: Props) {
  const { addToast } = useToast();
  const patchAccount = usePatchMeAccount();
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const localPreviewRef = useRef<string | null>(null);

  const uploadConfig: GcsImageUploadConfig = {
    scope: 'user',
    entityId: accountId,
  };
  const { isUploading, uploadProgress, uploadSingleWithProgress } =
    useGcsImageUpload(uploadConfig);

  const clearLocalPreview = useCallback(() => {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
    setLocalPreviewUrl(null);
  }, []);

  useEffect(() => () => clearLocalPreview(), [clearLocalPreview]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      clearLocalPreview();
      const objectUrl = URL.createObjectURL(file);
      localPreviewRef.current = objectUrl;
      setLocalPreviewUrl(objectUrl);

      const url = await uploadSingleWithProgress(file, 'profile');
      if (!url) {
        clearLocalPreview();
        return;
      }

      patchAccount.mutate(
        { avatarUrl: url },
        {
          onSuccess: () => {
            clearLocalPreview();
            addToast('Foto de perfil actualizada', 'success');
          },
          onError: (err) => {
            clearLocalPreview();
            addToast(getErrorMessage(err), 'error');
          },
        },
      );
    },
    [addToast, clearLocalPreview, patchAccount, uploadSingleWithProgress],
  );

  const handleRemove = useCallback(() => {
    if (!avatarUrl?.trim()) return;
    patchAccount.mutate(
      { avatarUrl: null },
      {
        onSuccess: () => addToast('Foto de perfil eliminada', 'success'),
        onError: (err) => addToast(getErrorMessage(err), 'error'),
      },
    );
  }, [addToast, avatarUrl, patchAccount]);

  const previewUrl = localPreviewUrl ?? avatarUrl;
  const isBusy = isUploading || patchAccount.isPending;

  return (
    <section className="max-w-md space-y-3" aria-labelledby="me-account-avatar-heading">
      <h3 id="me-account-avatar-heading" className="font-medium text-text">
        Foto de perfil
      </h3>
      <ImageUploadHint variant="avatar" options={{ gcs: true }} />
      {uploadProgress ? (
        <p className="text-sm text-accent" role="status">
          {uploadProgress}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        <UserReviewerAvatar displayName={displayName} avatarUrl={previewUrl} size="lg" />
        <div className="flex flex-col gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-border px-4 py-2 text-sm text-text transition-colors hover:border-accent disabled:cursor-not-allowed disabled:opacity-60">
            {isBusy ? 'Procesando…' : 'Cambiar foto'}
            <input
              type="file"
              accept={IMAGE_ACCEPT_GCS}
              className="hidden"
              disabled={isBusy}
              onChange={handleFileChange}
            />
          </label>
          {avatarUrl?.trim() ? (
            <Button
              type="button"
              variant="ghost"
              className="min-h-11 justify-start px-0 text-sm text-text-muted hover:text-text"
              disabled={isBusy}
              onClick={handleRemove}
            >
              Quitar foto
            </Button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
