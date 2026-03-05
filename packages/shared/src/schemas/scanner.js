"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanResponseSchema = exports.scanRequestSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../enums");
exports.scanRequestSchema = zod_1.z.object({
    qrCode: zod_1.z.string().min(1, 'qrCode is required'),
    metadata: zod_1.z
        .object({
        deviceId: zod_1.z.string().optional(),
        scannerVersion: zod_1.z.string().optional(),
        doorLocation: zod_1.z.string().optional(),
    })
        .optional(),
});
exports.scanResponseSchema = zod_1.z.object({
    result: zod_1.z.nativeEnum(enums_1.ScanResult),
    ticketId: zod_1.z.string().optional(),
    eventId: zod_1.z.string().optional(),
    ticketTypeName: zod_1.z.string().optional(),
    message: zod_1.z.string().optional(),
});
//# sourceMappingURL=scanner.js.map