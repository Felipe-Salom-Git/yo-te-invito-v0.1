import { z } from 'zod';

export const PaymentProviderApi = {
  DEMO: 'DEMO',
  MERCADOPAGO: 'MERCADOPAGO',
  GETNET: 'GETNET',
} as const;
export type PaymentProviderApi =
  (typeof PaymentProviderApi)[keyof typeof PaymentProviderApi];

export const PaymentStatusApi = {
  CREATED: 'CREATED',
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
} as const;
export type PaymentStatusApi =
  (typeof PaymentStatusApi)[keyof typeof PaymentStatusApi];

export const createPaymentQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
});
export type CreatePaymentQuery = z.infer<typeof createPaymentQuerySchema>;

export const createPaymentParamsSchema = z.object({
  orderId: z.string().min(1, 'orderId is required'),
});
export type CreatePaymentParams = z.infer<typeof createPaymentParamsSchema>;

export const createPaymentBodySchema = z.object({
  provider: z.nativeEnum(PaymentProviderApi),
});
export type CreatePaymentBody = z.infer<typeof createPaymentBodySchema>;

export const confirmDemoPaymentQuerySchema = z.object({
  tenantId: z.string().min(1, 'tenantId is required'),
});
export type ConfirmDemoPaymentQuery = z.infer<
  typeof confirmDemoPaymentQuerySchema
>;

export const confirmDemoPaymentParamsSchema = z.object({
  paymentId: z.string().min(1, 'paymentId is required'),
});
export type ConfirmDemoPaymentParams = z.infer<
  typeof confirmDemoPaymentParamsSchema
>;

export const confirmDemoPaymentBodySchema = z.object({}).strict();
export type ConfirmDemoPaymentBody = z.infer<
  typeof confirmDemoPaymentBodySchema
>;
