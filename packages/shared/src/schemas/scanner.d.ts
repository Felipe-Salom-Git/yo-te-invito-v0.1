import { z } from 'zod';
export declare const scanRequestSchema: z.ZodObject<{
    qrCode: z.ZodString;
    metadata: z.ZodOptional<z.ZodObject<{
        deviceId: z.ZodOptional<z.ZodString>;
        scannerVersion: z.ZodOptional<z.ZodString>;
        doorLocation: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        deviceId?: string | undefined;
        scannerVersion?: string | undefined;
        doorLocation?: string | undefined;
    }, {
        deviceId?: string | undefined;
        scannerVersion?: string | undefined;
        doorLocation?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    qrCode: string;
    metadata?: {
        deviceId?: string | undefined;
        scannerVersion?: string | undefined;
        doorLocation?: string | undefined;
    } | undefined;
}, {
    qrCode: string;
    metadata?: {
        deviceId?: string | undefined;
        scannerVersion?: string | undefined;
        doorLocation?: string | undefined;
    } | undefined;
}>;
export type ScanRequest = z.infer<typeof scanRequestSchema>;
export declare const scanResponseSchema: z.ZodObject<{
    result: z.ZodNativeEnum<{
        readonly OK: "ok";
        readonly ALREADY_USED: "already_used";
        readonly INVALID: "invalid";
        readonly REVOKED: "revoked";
        readonly OFFLINE_QUEUED: "offline_queued";
    }>;
    ticketId: z.ZodOptional<z.ZodString>;
    eventId: z.ZodOptional<z.ZodString>;
    ticketTypeName: z.ZodOptional<z.ZodString>;
    message: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    result: "ok" | "revoked" | "already_used" | "invalid" | "offline_queued";
    message?: string | undefined;
    ticketId?: string | undefined;
    eventId?: string | undefined;
    ticketTypeName?: string | undefined;
}, {
    result: "ok" | "revoked" | "already_used" | "invalid" | "offline_queued";
    message?: string | undefined;
    ticketId?: string | undefined;
    eventId?: string | undefined;
    ticketTypeName?: string | undefined;
}>;
export type ScanResponse = z.infer<typeof scanResponseSchema>;
