-- V3.1 Slice 7: excursion schedule / meeting point text on Event (excursion products)
ALTER TABLE "Event" ADD COLUMN "excursionDepartureTime" TEXT;
ALTER TABLE "Event" ADD COLUMN "excursionDurationText" TEXT;
ALTER TABLE "Event" ADD COLUMN "excursionAvailableDaysText" TEXT;
ALTER TABLE "Event" ADD COLUMN "excursionScheduleNotes" TEXT;
ALTER TABLE "Event" ADD COLUMN "excursionMeetingPoint" TEXT;
