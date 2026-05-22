import { z } from 'zod';
import { hotelProfileResponseSchema } from './hotel-profile';

export const publicHotelLocationDetailSchema = hotelProfileResponseSchema.extend({
  publicEventId: z.string().nullable(),
});
export type PublicHotelLocationDetail = z.infer<typeof publicHotelLocationDetailSchema>;
