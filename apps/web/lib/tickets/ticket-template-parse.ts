import {
  ticketTemplateElementSchema,
  ticketTemplateQrZoneSchema,
  type TicketTemplateElement,
  type TicketTemplateResponse,
} from '@yo-te-invito/shared';
import { clampQrZone } from '@/lib/producer/ticket-studio-qr-rules';

export type ParsedBuyerTemplate = {
  canvasWidth: number;
  canvasHeight: number;
  backgroundType: string;
  backgroundValue: string;
  elements: TicketTemplateElement[];
  qrZone: { x: number; y: number; w: number; h: number };
};

export function parseTemplateElements(raw: unknown): TicketTemplateElement[] {
  if (!Array.isArray(raw)) return [];
  const out: TicketTemplateElement[] = [];
  for (const item of raw) {
    const parsed = ticketTemplateElementSchema.safeParse(item);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export function parseBuyerTemplate(
  template: TicketTemplateResponse,
): ParsedBuyerTemplate | null {
  const w = template.canvasWidth;
  const h = template.canvasHeight;
  if (!Number.isFinite(w) || !Number.isFinite(h) || w < 240 || h < 240) {
    return null;
  }

  const qrParsed = ticketTemplateQrZoneSchema.safeParse(template.qrZoneJson);
  const qrZone = qrParsed.success
    ? clampQrZone(qrParsed.data)
    : clampQrZone({ x: 0.22, y: 0.58, w: 0.52, h: 0.28 });

  const elements = parseTemplateElements(template.elementsJson);
  if (elements.length === 0 && !qrParsed.success) {
    return null;
  }

  return {
    canvasWidth: w,
    canvasHeight: h,
    backgroundType: template.backgroundType,
    backgroundValue: template.backgroundValue,
    elements,
    qrZone,
  };
}

export function isBuyerTemplateRenderable(
  template: TicketTemplateResponse | null | undefined,
): template is TicketTemplateResponse {
  if (!template) return false;
  return parseBuyerTemplate(template) != null;
}
