"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanResult = exports.OrderStatus = exports.TicketStatus = exports.EventStatus = void 0;
exports.EventStatus = {
    DRAFT: 'draft',
    PENDING: 'pending',
    APPROVED: 'approved',
    PAUSED: 'paused',
    CANCELLED: 'cancelled',
    DELETED: 'deleted',
};
exports.TicketStatus = {
    VALID: 'valid',
    USED: 'used',
    REVOKED: 'revoked',
    REFUNDED: 'refunded',
};
exports.OrderStatus = {
    DRAFT: 'draft',
    PAID: 'paid',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded',
};
exports.ScanResult = {
    OK: 'ok',
    ALREADY_USED: 'already_used',
    INVALID: 'invalid',
    REVOKED: 'revoked',
    OFFLINE_QUEUED: 'offline_queued',
};
//# sourceMappingURL=index.js.map