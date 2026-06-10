-- V3.1 Etapa 10 — horario semanal gastronómico (opcional, compatible con simple)
ALTER TABLE "GastroProfile" ADD COLUMN "openingHoursMode" TEXT NOT NULL DEFAULT 'simple';
ALTER TABLE "GastroProfile" ADD COLUMN "openingHoursWeekly" JSONB;
