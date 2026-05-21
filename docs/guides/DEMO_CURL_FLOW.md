# Demo flow — curl (pago simulado)

Flujo de **pago demo** (no confundir con seeds de datos eliminados).

Ver [DEMO_REMOVAL.md](./DEMO_REMOVAL.md).

## Requisitos

- API en ejecución
- BD migrada
- Usuario JWT (login real)
- Evento publicado con ticket type

## Login

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"felipe.e.salom@gmail.com","password":"<PASSWORD>","tenantId":"tenant-demo"}' \
  | jq -r '.token')
```

## Orden + pago DEMO

(IDs según tu BD; ajustar `eventId`, `ticketTypeId`.)

```bash
# Crear orden — ver contrato en docs/api/ENDPOINTS.md y smoke-api
curl -s -X POST "http://localhost:3001/public/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ ... }'

# Crear pago DEMO y confirmar
curl -s -X POST "http://localhost:3001/public/payments/<paymentId>/demo-confirm" \
  -H "Authorization: Bearer $TOKEN"
```

Guía completa de flujos UI: [GUIA_PRUEBAS_FLUJOS_Y_API.md](./GUIA_PRUEBAS_FLUJOS_Y_API.md).
