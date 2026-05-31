'use client';

import { useCallback, useState } from 'react';
import { useToast } from '@/components';
import { ApiClientError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/errors';
import { useUploadPublicImage } from '@/lib/query/uploads';
import type { UploadPurpose } from '@yo-te-invito/shared';
import {
  GCS_UPLOAD_ERROR,
  type GcsImageUploadConfig,
} from '@/lib/upload/gcs-image-upload-config';
import { validatePublicImageFile } from '@/lib/upload/validate-public-image-file';

export const GCS_UPLOAD_FORBIDDEN =
  'No tenés permiso para subir imágenes a esta entidad. Verificá que estés editando tu propio perfil o contenido.';

export function useGcsImageUpload(config: GcsImageUploadConfig | undefined) {
  const { addToast } = useToast();
  const uploadMutation = useUploadPublicImage();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const uploadFile = useCallback(
    async (file: File, purpose: UploadPurpose): Promise<string | null> => {
      if (!config) return null;

      const validation = validatePublicImageFile(file);
      if (!validation.ok) {
        addToast(validation.message, 'error');
        return null;
      }

      try {
        const result = await uploadMutation.mutateAsync({
          file,
          scope: config.scope,
          purpose,
          entityId: config.entityId,
        });
        return result.url;
      } catch (err) {
        const msg =
          err instanceof ApiClientError && err.status === 403
            ? GCS_UPLOAD_FORBIDDEN
            : getErrorMessage(err) || GCS_UPLOAD_ERROR;
        addToast(msg, 'error');
        return null;
      }
    },
    [addToast, config, uploadMutation],
  );

  const uploadFilesSequential = useCallback(
    async (files: File[], purpose: UploadPurpose): Promise<string[]> => {
      if (!config || files.length === 0) return [];

      setIsUploading(true);
      const uploaded: string[] = [];
      try {
        for (let i = 0; i < files.length; i++) {
          setUploadProgress(`Subiendo ${i + 1}/${files.length}…`);
          const url = await uploadFile(files[i]!, purpose);
          if (url) uploaded.push(url);
        }
        return uploaded;
      } finally {
        setUploadProgress(null);
        setIsUploading(false);
      }
    },
    [config, uploadFile],
  );

  const uploadSingleWithProgress = useCallback(
    async (file: File, purpose: UploadPurpose): Promise<string | null> => {
      setIsUploading(true);
      setUploadProgress('Subiendo imagen…');
      try {
        return await uploadFile(file, purpose);
      } finally {
        setUploadProgress(null);
        setIsUploading(false);
      }
    },
    [uploadFile],
  );

  return {
    gcsMode: !!config,
    isUploading,
    uploadProgress,
    uploadFile,
    uploadFilesSequential,
    uploadSingleWithProgress,
  };
}
