import { localInputToIso } from '@/lib/producer/datetime-local';
import { renumberBatches, type TicketTypeEditForm } from '@/lib/producer/ticket-types-editor.model';
import type { TicketBatchCreateInput, TicketTypeCreateInput } from '@/repositories/interfaces';

export function editFormToApiBatches(form: TicketTypeEditForm): TicketBatchCreateInput[] {
  return renumberBatches(form.batches).map((b, i) => ({
    orderIndex: i,
    name: b.name.trim(),
    startAt: localInputToIso(b.startAt),
    endAt: localInputToIso(b.endAt),
    baseQuantity: b.baseQuantity,
    price: b.price,
  }));
}

export function editFormToCreateInput(form: TicketTypeEditForm): TicketTypeCreateInput {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    capacityTotal: form.capacityTotal,
    maxPerOrder: form.maxPerOrder,
    status: form.status,
    batches: editFormToApiBatches(form),
    price: form.batches[0]?.price ?? 0,
  };
}
