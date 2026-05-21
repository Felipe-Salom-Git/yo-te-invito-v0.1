'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { producerReviewsKeys } from '@/lib/query/keys';
import { Button, useToast } from '@/components';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  reviewId: string;
  open: boolean;
  onClose: () => void;
  filtersKey: string;
  existingReply?: string | null;
};

export function ProducerReplyModal({
  reviewId,
  open,
  onClose,
  filtersKey,
  existingReply,
}: Props) {
  const repos = useRepositories();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [body, setBody] = useState(existingReply ?? '');

  useEffect(() => {
    if (open) setBody(existingReply ?? '');
  }, [open, existingReply]);

  const mutation = useMutation({
    mutationFn: () => repos.producerReviews.reply(reviewId, { body: body.trim() }),
    onSuccess: () => {
      addToast(
        existingReply ? 'Respuesta actualizada.' : 'Respuesta publicada.',
        'success',
      );
      queryClient.invalidateQueries({ queryKey: producerReviewsKeys.list(filtersKey) });
      onClose();
    },
    onError: (e) => addToast(getErrorMessage(e), 'error'),
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <section
        className="w-full max-w-lg rounded-xl border border-border bg-bg p-6 shadow-xl"
        role="dialog"
        aria-labelledby="reply-modal-title"
      >
        <h2 id="reply-modal-title" className="text-lg font-semibold text-text">
          {existingReply ? 'Editar respuesta pública' : 'Responder valoración'}
        </h2>
        <p className="mt-2 text-sm text-text-muted">
          Tu respuesta será visible debajo del comentario. No modifica el puntaje.
        </p>

        <textarea
          className="mt-4 w-full min-h-[120px] rounded-lg border border-border bg-bg-muted px-3 py-2 text-sm text-text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Agradecé el feedback o aclará información relevante…"
          maxLength={2000}
        />

        <footer className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending || body.trim().length < 1}
          >
            {mutation.isPending ? 'Guardando…' : 'Publicar respuesta'}
          </Button>
        </footer>
      </section>
    </div>
  );
}
