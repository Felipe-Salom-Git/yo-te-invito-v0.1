-- Producer portal: admin event approval/rejection notifications
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'EVENT_APPROVED_BY_ADMIN';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'EVENT_REJECTED_BY_ADMIN';
