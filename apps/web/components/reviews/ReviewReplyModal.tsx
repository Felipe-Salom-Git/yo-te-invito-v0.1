'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

const MAX_LEN = 2000;

type Props = {
  reviewId: string;
  open: boolean;
  onClose: () => void;
  existingReply?: string | null;
  replyFn: (reviewId: string, body: { body: string }) => Promise<{ ok: true }>;
  invalidateQueryKey: QueryKey;
  summaryQueryKey?: QueryKey;
  /** Etiqueta del autor en preview (ej. "Tu productora") */
  authorLabel?: string;
};

export function ReviewReplyModal({
  reviewId,
  open,
  onClose,
  existingReply,
  replyFn,
  invalidateQueryKey,
  summaryQueryKey,
  authorLabel = 'Respuesta oficial',
}: Props) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [body, setBody] = useState(existingReply ?? '');
  const [confirmPublish, setConfirmPublish] = useState(false);

  useEffect(() => {
    if (open) {
      setBody(existingReply ?? '');
      setConfirmPublish(false);
    }
  }, [open, existingReply]);

  const trimmed = body.trim();
  const canSubmit = trimmed.length >= 1 && trimmed.length <= MAX_LEN;

  const preview = useMemo(
    () => ({
      authorDisplayName: authorLabel,
      body: trimmed || 'Escribí tu respuesta…',
    }),
    [authorLabel, trimmed],
  );

  const mutation = useMutation({
    mutationFn: () => replyFn(reviewId, { body: trimmed }),
    onSuccess: () => {
      addToast(
        existingReply ? 'Respuesta actualizada.' : 'Respuesta publicada.',
        'success',
      );
      queryClient.invalidateQueries({ queryKey: invalidateQueryKey });
      if (summaryQueryKey) {
        queryClient.invalidateQueries({ queryKey: summaryQueryKey });
      }
      onClose();
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  const handlePublish = () => {
    if (!canSubmit) {
      addToast('Escribí una respuesta antes de publicar', 'error');
      return;
    }
    if (!confirmPublish) {
      setConfirmPublish(true);
      return;
    }
    mutation.mutate();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !mutation.isPending && onClose()}
    >
      <section
        className="max-h-[92vh] w-full overflow-y-auto rounded-t-xl border border-border bg-bg p-5 shadow-xl sm:max-w-lg sm:rounded-xl sm:p-6"
        role="dialog"
        aria-labelledby="reply-modal-title"
      >
        <h2 id="reply-modal-title" className="text-lg font-semibold text-text">
          {existingReply ? 'Editar respuesta pública' : 'Responder valoración'}
        </h2>
        <p className="mt-2 text-sm text-text-muted leading-relaxed">
          Tu respuesta será <span className="font-medium text-text">visible para todos</span> debajo del
          comentario en la ficha del evento. No modifica el puntaje ni el texto del usuario.
        </p>

        <label className="mt-4 block text-sm font-medium text-text">Tu respuesta</label>
        <textarea
          className="mt-1 w-full min-h-[120px] rounded-lg border border-border bg-bg-muted px-3 py-2 text-sm text-text"
          value={body}
          onChange={(e) => {
            setBody(e.target.value);
            setConfirmPublish(false);
          }}
          placeholder="Agradecé el feedback o aclará información relevante…"
          maxLength={MAX_LEN}
          disabled={mutation.isPending}
        />
        <p className="mt-1 text-xs text-text-muted">
          {trimmed.length}/{MAX_LEN} caracteres
          {trimmed.length < 1 ? ' · mínimo 1 carácter' : null}
        </p>

        {trimmed.length > 0 ? (
          <div className="mt-4 rounded-lg border border-border/80 bg-bg-muted/50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">Vista previa</p>
            <p className="mt-2 text-xs text-accent-soft">{preview.authorDisplayName}</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-text-muted">{preview.body}</p>
          </div>
        ) : null}

        {confirmPublish ? (
          <p className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90">
            Confirmá de nuevo para publicar la respuesta en la ficha pública.
          </p>
        ) : null}

        <footer className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button
            onClick={handlePublish}
            disabled={mutation.isPending || !canSubmit}
            className="w-full sm:w-auto"
          >
            {mutation.isPending
              ? 'Guardando…'
              : confirmPublish
                ? 'Confirmar y publicar'
                : existingReply
                  ? 'Guardar cambios'
                  : 'Publicar respuesta'}
          </Button>
        </footer>
      </section>
    </div>
  );
}
