/**
 * V3.1 Etapa 10 — gastro weekly opening hours model.
 * Run: pnpm --filter api run smoke:v31-gastro-weekly-hours
 */

import { PrismaClient } from '@prisma/client';
import {
  createEmptyGastroWeeklyOpeningHours,
  createEmptyRentalOpeningHours,
  gastroWeeklyOpeningHoursSchema,
  rentalOpeningHoursSchema,
} from '@yo-te-invito/shared';
import { SMOKE_TEST_MARKER } from './lib/smoke-constants';
import { runSmokeScript } from './lib/smoke-runner';
import {
  readGastroOpeningHoursFields,
  writeGastroOpeningHours,
  writeGastroOpeningHoursMode,
  writeGastroOpeningHoursWeekly,
} from '../src/modules/gastro/gastro-profile-fields.util';

const TENANT = process.env.SMOKE_TENANT_ID ?? 'tenant-demo';
const MARKER = `${SMOKE_TEST_MARKER} v31-gastro-weekly-hours`;

function pass(label: string) {
  console.log(`  OK ${label}`);
}

function fail(label: string, detail?: string) {
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
  const prisma = new PrismaClient();
  let profileId: string | undefined;
  let exitCode = 0;

  try {
    await prisma.$connect();
    pass('DB connect');

    const simpleHours = createEmptyRentalOpeningHours();
    simpleHours.weekday = { isOpen: true, ranges: [{ open: '10:00', close: '18:00' }] };
    const parsedSimple = rentalOpeningHoursSchema.parse(simpleHours);
    pass('legacy simple hours schema');

    const weekly = createEmptyGastroWeeklyOpeningHours();
    weekly.monday = [{ open: '12:00', close: '15:00' }];
    weekly.tuesday = [
      { open: '12:00', close: '15:00' },
      { open: '20:00', close: '00:00' },
    ];
    weekly.saturday = [{ open: '20:00', close: '02:00' }];
    gastroWeeklyOpeningHoursSchema.parse(weekly);
    pass('weekly hours with multiple + overnight intervals');

    try {
      gastroWeeklyOpeningHoursSchema.parse({
        ...weekly,
        monday: [
          { open: '10:00', close: '14:00' },
          { open: '12:00', close: '16:00' },
        ],
      });
      fail('overlap rejection');
      exitCode = 1;
    } catch {
      pass('overlap rejected');
    }

    const profile = await prisma.gastroProfile.create({
      data: {
        tenantId: TENANT,
        displayName: `${MARKER} Local`,
        contactEmail: 'smoke-weekly@gastro.test',
        openingHours: writeGastroOpeningHours(parsedSimple) as object,
        openingHoursMode: writeGastroOpeningHoursMode('simple'),
        status: 'DRAFT',
      },
    });
    profileId = profile.id;
    pass('create legacy simple profile');

    const legacyFields = readGastroOpeningHoursFields(profile);
    if (legacyFields.openingHoursMode !== 'simple') {
      fail('legacy mode', legacyFields.openingHoursMode);
      exitCode = 1;
    } else {
      pass('legacy mode=simple');
    }

    await prisma.gastroProfile.update({
      where: { id: profileId },
      data: {
        openingHoursMode: writeGastroOpeningHoursMode('weekly'),
        openingHoursWeekly: writeGastroOpeningHoursWeekly(weekly) as object,
      },
    });
    pass('update to weekly mode');

    const updated = await prisma.gastroProfile.findUniqueOrThrow({ where: { id: profileId } });
    const weeklyFields = readGastroOpeningHoursFields(updated);
    if (weeklyFields.openingHoursMode !== 'weekly') {
      fail('weekly mode read');
      exitCode = 1;
    } else if (!weeklyFields.openingHoursWeekly?.saturday?.length) {
      fail('weekly saturday interval');
      exitCode = 1;
    } else {
      pass('weekly fields roundtrip');
    }

    await prisma.gastroProfile.update({
      where: { id: profileId },
      data: {
        openingHoursWeekly: writeGastroOpeningHoursWeekly(createEmptyGastroWeeklyOpeningHours()) as object,
      },
    });
    pass('clear weekly schedule');
  } catch (err) {
    console.error(err);
    exitCode = 1;
  } finally {
    if (profileId) {
      await prisma.gastroProfile.delete({ where: { id: profileId } }).catch(() => undefined);
    }
    await prisma.$disconnect();
  }

  return exitCode;
}

runSmokeScript('v31-gastro-weekly-hours', main);
