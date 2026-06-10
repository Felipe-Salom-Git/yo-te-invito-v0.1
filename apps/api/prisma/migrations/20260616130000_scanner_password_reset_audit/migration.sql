-- V3.1 Etapa 5 Slice 5.2 — audit for scanner password reset

ALTER TYPE "AuditAction" ADD VALUE IF NOT EXISTS 'SCANNER_PASSWORD_RESET';
