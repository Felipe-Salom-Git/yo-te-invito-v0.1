"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventsPaginatedResponseSchema = exports.eventPublicSchema = exports.eventsListQuerySchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.eventsListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(10),
    city: zod_1.z.string().optional(),
    status: zod_1.z.nativeEnum(enums_1.EventStatus).optional(),
});
exports.eventPublicSchema = zod_1.z.object({
    id: zod_1.z.string(),
    title: zod_1.z.string(),
    description: zod_1.z.string().nullable(),
    startAt: zod_1.z.string().datetime(),
    endAt: zod_1.z.string().datetime(),
    city: zod_1.z.string().nullable(),
    venueName: zod_1.z.string().nullable(),
    venueAddress: zod_1.z.string().nullable(),
    status: zod_1.z.nativeEnum(enums_1.EventStatus),
    coverImageUrl: zod_1.z.string().nullable(),
    isTicketingEnabled: zod_1.z.boolean(),
});
exports.eventsPaginatedResponseSchema = zod_1.z.object({
    data: zod_1.z.array(exports.eventPublicSchema),
    meta: zod_1.z.object({
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        total: zod_1.z.number(),
        totalPages: zod_1.z.number(),
    }),
});
//# sourceMappingURL=events.js.map