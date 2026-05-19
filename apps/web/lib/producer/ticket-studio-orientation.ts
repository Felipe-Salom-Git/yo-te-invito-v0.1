import type { TicketStudioState } from '@/lib/producer/ticket-studio-defaults';

export type CanvasOrientation = 'portrait' | 'landscape';

export function getCanvasOrientation(state: Pick<TicketStudioState, 'canvasWidth' | 'canvasHeight'>): CanvasOrientation {
  return state.canvasHeight >= state.canvasWidth ? 'portrait' : 'landscape';
}

