# Yo Te Invito — Emails V1 — Tanda 7
## Admin, operación y soporte

Esta tanda cubre emails operativos internos y soporte:

- Alertas para administración.
- Eventos pendientes de revisión.
- Errores críticos de pago, factura, email, scanner y storage.
- Resumen operativo diario.
- Confirmaciones de soporte.

## Emails incluidos

| ID | Archivo | Uso |
|---|---|---|
| `ADMIN_NEW_EVENT_PENDING` | `ADMIN_NEW_EVENT_PENDING.md` | Avisar a admins que hay un nuevo evento pendiente. |
| `ADMIN_CRITICAL_PAYMENT_ERROR` | `ADMIN_CRITICAL_PAYMENT_ERROR.md` | Alertar error crítico de pago/webhook/reconciliación. |
| `ADMIN_CRITICAL_INVOICE_ERROR` | `ADMIN_CRITICAL_INVOICE_ERROR.md` | Alertar error crítico de facturación. |
| `ADMIN_CRITICAL_EMAIL_ERROR` | `ADMIN_CRITICAL_EMAIL_ERROR.md` | Alertar fallo de envío en email crítico. |
| `ADMIN_SCANNER_ERROR` | `ADMIN_SCANNER_ERROR.md` | Alertar error crítico o anomalía de scanner. |
| `ADMIN_STORAGE_ERROR` | `ADMIN_STORAGE_ERROR.md` | Alertar error operativo en storage/upload. |
| `ADMIN_REVIEW_DISPUTE_PENDING` | `ADMIN_REVIEW_DISPUTE_PENDING.md` | Avisar que hay una disputa de reseña pendiente. |
| `ADMIN_DAILY_OPERATIONS_SUMMARY` | `ADMIN_DAILY_OPERATIONS_SUMMARY.md` | Resumen diario operativo para admins. |
| `SUPPORT_REQUEST_RECEIVED` | `SUPPORT_REQUEST_RECEIVED.md` | Confirmar al usuario que soporte recibió su consulta. |
| `SUPPORT_REQUEST_INTERNAL` | `SUPPORT_REQUEST_INTERNAL.md` | Avisar internamente de una nueva consulta de soporte. |
| `SUPPORT_CASE_UPDATED` | `SUPPORT_CASE_UPDATED.md` | Avisar al usuario que su caso de soporte fue actualizado. |

## Criterio de tono

- Para admins: directo, operativo, accionable.
- Para errores críticos: claro en impacto, entidad afectada y acción sugerida.
- Para soporte: cercano, confiable y con número/código de caso.
- Evitar tono alarmista cuando el error puede estar contenido.
- No exponer detalles técnicos sensibles al usuario final.

## Remitentes sugeridos

| Tipo | From |
|---|---|
| Alertas internas/admin | `operaciones@yoteinvito.club` |
| Soporte usuario | `soporte@yoteinvito.club` |
| Fallos automáticos críticos | `operaciones@yoteinvito.club` |

## Variables globales recomendadas

```txt
{{appName}}
{{brandName}}
{{adminName}}
{{supportEmail}}
{{operationsEmail}}
{{baseUrl}}
{{adminUrl}}
{{dashboardUrl}}
{{currentYear}}
```

## Variables específicas frecuentes

```txt
{{eventTitle}}
{{eventId}}
{{producerName}}
{{producerEmail}}
{{eventAdminUrl}}
{{errorType}}
{{errorCode}}
{{errorMessage}}
{{entityType}}
{{entityId}}
{{orderId}}
{{paymentId}}
{{invoiceId}}
{{webhookId}}
{{ticketId}}
{{scannerDeviceId}}
{{storageObjectPath}}
{{occurredAt}}
{{environment}}
{{severity}}
{{caseId}}
{{caseSubject}}
{{caseStatus}}
{{caseUrl}}
{{userName}}
{{userEmail}}
```
