-- V3.3 Etapa 7.7: claim IN_APP kind + dedicated claim audit action.

ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'ACTIVITY_COUPON_CLAIMED';
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'ACTIVITY_COUPON_CLAIMED';
