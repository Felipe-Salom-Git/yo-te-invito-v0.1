# Procedimiento interno de soporte — Yo Te Invito

**Versión:** v1.0.0  
**Última actualización:** `[COMPLETAR]`

## 1. Objetivo

Establecer un procedimiento operativo para recibir, clasificar, responder y escalar consultas, reclamos e incidencias de usuarios, compradores, productores, gastronómicos, rentals, hoteles y referidos.

## 2. Canales de soporte

- Email: `[COMPLETAR]`
- WhatsApp / teléfono: `[COMPLETAR]`
- Formulario web: `[COMPLETAR]`
- Portal interno/admin: `[COMPLETAR SI APLICA]`

## 3. Datos mínimos a solicitar

Para compras/tickets:

- Email de cuenta.
- Número de orden.
- ID o nombre del evento.
- ID de ticket si corresponde.
- Descripción del problema.
- Capturas/comprobantes.

Para productores/comercios/proveedores:

- Email de cuenta.
- Perfil/portal afectado.
- Publicación afectada.
- Descripción del problema.
- Evidencia o capturas.

Para referidos:

- Email de cuenta.
- Productora vinculada.
- Evento/acuerdo/link.
- Comisión o solicitud afectada.
- Evidencia.

## 4. Clasificación de tickets de soporte

### Prioridad alta

- Pago aprobado sin emisión de ticket.
- Ticket válido que no escanea en puerta.
- Evento cancelado o cambio crítico.
- Error de seguridad, cuenta comprometida o fraude.
- Productor no puede aprobar/gestionar evento próximo.
- Incidencia masiva o caída de plataforma.

### Prioridad media

- Error en datos de cuenta.
- Problemas de transferencia de ticket.
- Consulta por reembolso o arrepentimiento.
- Problemas con QR de descuento.
- Métricas o referidos con inconsistencias.

### Prioridad baja

- Consultas generales.
- Cambios de contenido no urgentes.
- Sugerencias.
- Dudas de uso.

## 5. Flujo operativo recomendado

1. Recibir solicitud.
2. Verificar identidad o titularidad mínima.
3. Identificar perfil afectado.
4. Clasificar prioridad.
5. Buscar orden, ticket, evento, publicación o acuerdo en admin/API.
6. Registrar acción interna.
7. Responder con estado inicial.
8. Escalar si involucra organizador, proveedor de pago, bug técnico o revisión legal.
9. Cerrar con respuesta clara y registro final.

## 6. Escalamiento

- Técnico/API/web: errores reproducibles, logs, scanner, emails, push, pagos, QR.
- Productor/comercio/proveedor: cancelaciones, cambios, beneficios rechazados, disponibilidad, condiciones externas.
- Legal/administración: reclamos formales, intimaciones, datos personales, disputas sensibles.
- Pagos: webhooks, reembolsos, reversos, conciliación cuando exista proveedor real.

## 7. Respuestas modelo breves

### Compra / ticket

Hola, gracias por escribirnos. Para revisar tu caso necesitamos el email de la cuenta, número de orden y nombre del evento. Con esos datos verificamos el estado de compra/ticket y te respondemos a la brevedad.

### Reembolso

Hola. Recibimos tu consulta sobre devolución/reembolso. Vamos a revisar el estado de la orden, la política aplicable y las condiciones informadas por el organizador. La recepción de la solicitud no implica aprobación automática, pero te informaremos el resultado por este medio.

### Referidos

Hola. Yo Te Invito registra acuerdos, atribuciones y solicitudes dentro de la plataforma, pero si la liquidación es manual, el pago se coordina directamente entre productor y referido. Podemos ayudarte a revisar la información registrada para que ambas partes tengan trazabilidad.

## 8. Registro interno recomendado

Cada caso debería registrar:

- ID de caso.
- Usuario solicitante.
- Perfil afectado.
- Tipo de incidencia.
- Prioridad.
- Entidad relacionada: orderId, ticketId, eventId, profileId, agreementId.
- Estado: abierto, en revisión, escalado, resuelto, cerrado.
- Responsable interno.
- Fecha de creación y cierre.
- Notas internas.
