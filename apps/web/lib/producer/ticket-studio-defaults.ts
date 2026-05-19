import { TICKET_TEMPLATE_DEFAULT_QR_ZONE } from '@yo-te-invito/shared';
import type { TicketTemplateElement } from '@yo-te-invito/shared';
import { inferSizePreset, type TicketSizePreset } from '@/lib/producer/ticket-studio-layout-presets';

function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `el-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type TicketStudioState = {
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundType: 'SOLID' | 'IMAGE';
  backgroundValue: string;
  /** UI only: cómo cargar imagen de fondo (no se persiste aparte; se infiere al cargar plantilla). */
  backgroundImageSource?: 'URL' | 'FILE';
  /** UI: preset de tamaño (se infiere al cargar desde canvasWidth/Height). */
  sizePreset?: TicketSizePreset;
  elementsJson: TicketTemplateElement[];
  qrZoneJson: { x: number; y: number; w: number; h: number };
};

export function defaultTicketStudioState(eventTitle: string, ticketTypeName: string): TicketStudioState {
  return {
    name: 'Diseño personalizado',
    sizePreset: 'standard',
    canvasWidth: 320,
    canvasHeight: 560,
    backgroundType: 'SOLID',
    backgroundValue: '#0a0a0a',
    backgroundImageSource: 'URL',
    qrZoneJson: { ...TICKET_TEMPLATE_DEFAULT_QR_ZONE },
    elementsJson: [
      {
        id: newId(),
        type: 'TEXT',
        x: 0.06,
        y: 0.05,
        w: 0.88,
        h: 0.14,
        zIndex: 2,
        content: eventTitle || 'Nombre del evento',
        style: {
          fontSize: 20,
          color: '#ffffff',
          fontWeight: '700',
          textAlign: 'center',
        },
      },
      {
        id: newId(),
        type: 'TEXT',
        x: 0.06,
        y: 0.2,
        w: 0.88,
        h: 0.06,
        zIndex: 2,
        content: ticketTypeName || 'Tipo de entrada',
        style: {
          fontSize: 14,
          color: '#22c55e',
          textAlign: 'center',
          fontWeight: '600',
        },
      },
      {
        id: newId(),
        type: 'DYNAMIC',
        x: 0.06,
        y: 0.28,
        w: 0.88,
        h: 0.05,
        zIndex: 1,
        fieldKey: 'eventDate',
        style: { fontSize: 12, color: '#a3a3a3', textAlign: 'center' },
      },
    ],
  };
}

export function templateToStudioState(t: {
  name: string;
  canvasWidth: number;
  canvasHeight: number;
  backgroundType: string;
  backgroundValue: string;
  elementsJson: unknown[];
  qrZoneJson: unknown;
}): TicketStudioState {
  const qr = t.qrZoneJson as TicketStudioState['qrZoneJson'];
  const elements = (Array.isArray(t.elementsJson) ? t.elementsJson : []) as TicketTemplateElement[];
  const bgType = t.backgroundType === 'IMAGE' ? 'IMAGE' : 'SOLID';
  const bgVal = t.backgroundValue;
  return {
    name: t.name,
    sizePreset: inferSizePreset({
      canvasWidth: t.canvasWidth,
      canvasHeight: t.canvasHeight,
    } as Pick<TicketStudioState, 'canvasWidth' | 'canvasHeight'>),
    canvasWidth: t.canvasWidth,
    canvasHeight: t.canvasHeight,
    backgroundType: bgType,
    backgroundValue: bgVal,
    backgroundImageSource:
      bgType === 'IMAGE' && String(bgVal).startsWith('data:image') ? 'FILE' : 'URL',
    qrZoneJson: qr,
    elementsJson: elements,
  };
}

export function newTextElement(): TicketTemplateElement {
  return {
    id: newId(),
    type: 'TEXT',
    x: 0.1,
    y: 0.35,
    w: 0.8,
    h: 0.08,
    zIndex: 5,
    content: 'Texto',
    style: { fontSize: 14, color: '#ffffff', textAlign: 'left' },
  };
}

export function newDynamicElement(): TicketTemplateElement {
  return {
    id: newId(),
    type: 'DYNAMIC',
    x: 0.1,
    y: 0.45,
    w: 0.8,
    h: 0.06,
    zIndex: 5,
    fieldKey: 'venueName',
    style: { fontSize: 12, color: '#e5e5e5', textAlign: 'left' },
  };
}
