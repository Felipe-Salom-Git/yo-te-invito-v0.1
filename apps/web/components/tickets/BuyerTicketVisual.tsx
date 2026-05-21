'use client';

import type { MeTicketDetail } from '@yo-te-invito/shared';
import {
  isBuyerTemplateRenderable,
  parseBuyerTemplate,
} from '@/lib/tickets/ticket-template-parse';
import { TicketTemplateRenderer } from './TicketTemplateRenderer';
import { DefaultBuyerTicket } from './DefaultBuyerTicket';

type Props = {
  ticket: MeTicketDetail;
  className?: string;
};

/** Chooses canvas template render or premium fallback. */
export function BuyerTicketVisual({ ticket, className = '' }: Props) {
  const template = ticket.ticketTemplate;
  if (isBuyerTemplateRenderable(template)) {
    const parsed = parseBuyerTemplate(template)!;
    return (
      <TicketTemplateRenderer ticket={ticket} template={parsed} className={className} />
    );
  }
  return <DefaultBuyerTicket ticket={ticket} className={className} />;
}
