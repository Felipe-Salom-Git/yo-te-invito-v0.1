-- V3.1 Etapa 6 — audit action for ticket list PDF export
ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'TICKET_LIST_EXPORTED';
