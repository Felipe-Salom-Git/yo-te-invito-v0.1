/** Shown in transfer UI (create modal, accept page). */
export const TICKET_TRANSFER_LEGAL_NOTICE =
  'Yo Te Invito solo facilita la transferencia técnica del ticket entre usuarios registrados. Cualquier acuerdo económico entre las partes se realiza por fuera de la plataforma. La plataforma no procesa pagos ni garantiza acuerdos personales entre usuarios.';

export const TICKET_TRANSFER_CREATE_HINT =
  'Podés transferir este ticket a otro usuario registrado. Si acordaste una reventa de forma personal, recordá que Yo Te Invito no interviene en el pago ni garantiza la operación económica. Al iniciar la transferencia, tu QR quedará pausado hasta que la otra persona acepte o canceles la operación.';

/** Block reasons returned by transfer eligibility (API + UI hints). */
export const TICKET_TRANSFER_BLOCK_REASON = {
  NOT_OWNER: 'NOT_OWNER',
  TICKET_ALREADY_USED: 'TICKET_ALREADY_USED',
  TICKET_REVOKED: 'TICKET_REVOKED',
  TICKET_EXPIRED: 'TICKET_EXPIRED',
  TRANSFER_ALREADY_PENDING: 'TRANSFER_ALREADY_PENDING',
  TICKET_NOT_VALID_STATUS: 'TICKET_NOT_VALID_STATUS',
  EVENT_CANCELLED: 'EVENT_CANCELLED',
  OCCURRENCE_CLOSED: 'OCCURRENCE_CLOSED',
  DATE_CHANGE_PENDING: 'DATE_CHANGE_PENDING',
} as const;

export type TicketTransferBlockReason =
  (typeof TICKET_TRANSFER_BLOCK_REASON)[keyof typeof TICKET_TRANSFER_BLOCK_REASON];
