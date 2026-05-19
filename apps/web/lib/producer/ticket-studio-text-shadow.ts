/** Coincide con `elementStyleSchema.textShadow` en shared. */
export type TicketTextShadowPreset = 'none' | 'subtle' | 'medium' | 'strong';

/** CSS `text-shadow` para contraste sobre fotos de fondo. */
export function ticketTextShadowCss(preset: TicketTextShadowPreset | undefined): string {
  switch (preset ?? 'none') {
    case 'subtle':
      return '0 1px 2px rgba(0,0,0,0.78), 0 0 1px rgba(0,0,0,0.55)';
    case 'medium':
      return '0 2px 5px rgba(0,0,0,0.9), 0 1px 2px rgba(0,0,0,0.7)';
    case 'strong':
      return '0 2px 10px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.88), 0 1px 3px rgba(0,0,0,1)';
    default:
      return 'none';
  }
}
