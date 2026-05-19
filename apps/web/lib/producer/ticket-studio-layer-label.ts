import type { TicketTemplateElement } from '@yo-te-invito/shared';

export function ticketLayerLabel(el: TicketTemplateElement): string {
  switch (el.type) {
    case 'TEXT':
      return el.content?.trim() ? el.content.trim().slice(0, 36) : 'Texto (vacío)';
    case 'DYNAMIC':
      return `Dinámico · ${el.fieldKey ?? '?'}`;
    case 'LOGO':
      return 'Logo';
    case 'IMAGE':
      return 'Imagen';
    case 'DIVIDER':
      return 'Divisor';
    case 'SHAPE':
      return 'Forma';
    default:
      return String(el.type);
  }
}
