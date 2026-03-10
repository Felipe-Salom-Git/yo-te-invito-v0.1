'use client';

import { useQuery } from '@tanstack/react-query';
import { useRepositories } from '@/repositories/context';
import { ticketsKeys } from './keys';

export { ticketsKeys } from './keys';

export function useMyTickets(userId: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: ticketsKeys.me(userId),
    queryFn: () => repos.tickets.listByOwner(userId),
    enabled: !!userId && enabled,
  });
}

export function useTicketById(ticketId: string, enabled = true) {
  const repos = useRepositories();
  return useQuery({
    queryKey: ticketsKeys.detail(ticketId),
    queryFn: () => repos.tickets.get(ticketId),
    enabled: !!ticketId && enabled,
  });
}
