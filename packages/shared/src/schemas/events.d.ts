import { z } from 'zod';
export declare const eventsListQuerySchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
    city: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<{
        readonly DRAFT: "draft";
        readonly PENDING: "pending";
        readonly APPROVED: "approved";
        readonly PAUSED: "paused";
        readonly CANCELLED: "cancelled";
        readonly DELETED: "deleted";
    }>>;
}, "strip", z.ZodTypeAny, {
    page: number;
    limit: number;
    city?: string | undefined;
    status?: "draft" | "pending" | "approved" | "paused" | "cancelled" | "deleted" | undefined;
}, {
    page?: number | undefined;
    limit?: number | undefined;
    city?: string | undefined;
    status?: "draft" | "pending" | "approved" | "paused" | "cancelled" | "deleted" | undefined;
}>;
export type EventsListQuery = z.infer<typeof eventsListQuerySchema>;
export declare const eventPublicSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    startAt: z.ZodString;
    endAt: z.ZodString;
    city: z.ZodNullable<z.ZodString>;
    venueName: z.ZodNullable<z.ZodString>;
    venueAddress: z.ZodNullable<z.ZodString>;
    status: z.ZodNativeEnum<{
        readonly DRAFT: "draft";
        readonly PENDING: "pending";
        readonly APPROVED: "approved";
        readonly PAUSED: "paused";
        readonly CANCELLED: "cancelled";
        readonly DELETED: "deleted";
    }>;
    coverImageUrl: z.ZodNullable<z.ZodString>;
    isTicketingEnabled: z.ZodBoolean;
}, "strip", z.ZodTypeAny, {
    city: string | null;
    status: "draft" | "pending" | "approved" | "paused" | "cancelled" | "deleted";
    id: string;
    title: string;
    description: string | null;
    startAt: string;
    endAt: string;
    venueName: string | null;
    venueAddress: string | null;
    coverImageUrl: string | null;
    isTicketingEnabled: boolean;
}, {
    city: string | null;
    status: "draft" | "pending" | "approved" | "paused" | "cancelled" | "deleted";
    id: string;
    title: string;
    description: string | null;
    startAt: string;
    endAt: string;
    venueName: string | null;
    venueAddress: string | null;
    coverImageUrl: string | null;
    isTicketingEnabled: boolean;
}>;
export type EventPublic = z.infer<typeof eventPublicSchema>;
export declare const eventsPaginatedResponseSchema: z.ZodObject<{
    data: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodNullable<z.ZodString>;
        startAt: z.ZodString;
        endAt: z.ZodString;
        city: z.ZodNullable<z.ZodString>;
        venueName: z.ZodNullable<z.ZodString>;
        venueAddress: z.ZodNullable<z.ZodString>;
        status: z.ZodNativeEnum<{
            readonly DRAFT: "draft";
            readonly PENDING: "pending";
            readonly APPROVED: "approved";
            readonly PAUSED: "paused";
            readonly CANCELLED: "cancelled";
            readonly DELETED: "deleted";
        }>;
        coverImageUrl: z.ZodNullable<z.ZodString>;
        isTicketingEnabled: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        city: string | null;
        status: "draft" | "pending" | "approved" | "paused" | "cancelled" | "deleted";
        id: string;
        title: string;
        description: string | null;
        startAt: string;
        endAt: string;
        venueName: string | null;
        venueAddress: string | null;
        coverImageUrl: string | null;
        isTicketingEnabled: boolean;
    }, {
        city: string | null;
        status: "draft" | "pending" | "approved" | "paused" | "cancelled" | "deleted";
        id: string;
        title: string;
        description: string | null;
        startAt: string;
        endAt: string;
        venueName: string | null;
        venueAddress: string | null;
        coverImageUrl: string | null;
        isTicketingEnabled: boolean;
    }>, "many">;
    meta: z.ZodObject<{
        page: z.ZodNumber;
        limit: z.ZodNumber;
        total: z.ZodNumber;
        totalPages: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }, {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    }>;
}, "strip", z.ZodTypeAny, {
    data: {
        city: string | null;
        status: "draft" | "pending" | "approved" | "paused" | "cancelled" | "deleted";
        id: string;
        title: string;
        description: string | null;
        startAt: string;
        endAt: string;
        venueName: string | null;
        venueAddress: string | null;
        coverImageUrl: string | null;
        isTicketingEnabled: boolean;
    }[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}, {
    data: {
        city: string | null;
        status: "draft" | "pending" | "approved" | "paused" | "cancelled" | "deleted";
        id: string;
        title: string;
        description: string | null;
        startAt: string;
        endAt: string;
        venueName: string | null;
        venueAddress: string | null;
        coverImageUrl: string | null;
        isTicketingEnabled: boolean;
    }[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}>;
export type EventsPaginatedResponse = z.infer<typeof eventsPaginatedResponseSchema>;
