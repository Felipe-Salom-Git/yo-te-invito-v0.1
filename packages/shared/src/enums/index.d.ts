export declare const EventStatus: {
    readonly DRAFT: "draft";
    readonly PENDING: "pending";
    readonly APPROVED: "approved";
    readonly PAUSED: "paused";
    readonly CANCELLED: "cancelled";
    readonly DELETED: "deleted";
};
export type EventStatus = (typeof EventStatus)[keyof typeof EventStatus];
export declare const TicketStatus: {
    readonly VALID: "valid";
    readonly USED: "used";
    readonly REVOKED: "revoked";
    readonly REFUNDED: "refunded";
};
export type TicketStatus = (typeof TicketStatus)[keyof typeof TicketStatus];
export declare const OrderStatus: {
    readonly DRAFT: "draft";
    readonly PAID: "paid";
    readonly CANCELLED: "cancelled";
    readonly REFUNDED: "refunded";
};
export type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
export declare const ScanResult: {
    readonly OK: "ok";
    readonly ALREADY_USED: "already_used";
    readonly INVALID: "invalid";
    readonly REVOKED: "revoked";
    readonly OFFLINE_QUEUED: "offline_queued";
};
export type ScanResult = (typeof ScanResult)[keyof typeof ScanResult];
