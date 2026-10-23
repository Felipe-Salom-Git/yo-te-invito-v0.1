# V3.3 — G8 — Checklist de QA manual

Para una persona, en el producto desplegado (o en un entorno que copie ese deploy).  
No hace falta leer código. Anotar PASS / FAIL y qué se vio.

Hacen falta dos locales del mismo dueño (Local A y Local B), un admin, y al menos dos usuarios que puedan recibir la cortesía.

---

## Portal del dueño

- [ ] Entrá al Local A → Cortesías → Solicitar cortesía.
- [ ] El formulario queda en el Local A (si cambiás al Local B, el alta es de B).
- [ ] La vista previa muestra el beneficio real (una cena, un trago, el texto de la campaña). No muestra 0%.
- [ ] Al enviar, la cortesía queda **pendiente de aprobación**. Los invitados todavía no reciben el cupón.
- [ ] Podés **retirar** esa solicitud pendiente. Pasa a cancelada y no se puede volver a activar.
- [ ] Una cortesía que creó el admin no te ofrece "retirar solicitud".

## Admin

- [ ] La cola de pendientes muestra la cortesía del Local A: local, nombre, beneficio, cuántas personas, vigencia.
- [ ] En la revisión se ve quién la pidió y el acuerdo comercial vigente de **ese** local.
- [ ] Sin acuerdo vigente, aprobar no deja seguir y explica que falta el acuerdo.
- [ ] Con acuerdo vigente, aprobar la deja activa y dispara el envío.
- [ ] Rechazar otra solicitud la deja rechazada. Esas personas no reciben cupón.
- [ ] Si un mail falló, la cortesía sigue aprobada. Reenviar solo reintenta a quien no lo recibió.
- [ ] Abrir la cortesía del Local B usando la URL del Local A no muestra ni aprueba esa cortesía.

## Usuario que recibe

- [ ] Llega el mail de la cortesía aprobada, con el nombre del local y la vigencia.
- [ ] En el mail se lee el código corto, no solo el dibujo del QR.
- [ ] En `/me` aparece el cupón, con su QR y su código.
- [ ] Antes de que el admin apruebe, ese cupón no aparece en `/me`.

## Scanner

- [ ] El scanner del Local A lee el QR y lo valida. La pantalla dice que es una cortesía y muestra el beneficio, no 0%.
- [ ] El mismo cupón se puede validar tipeando el código corto.
- [ ] El scanner del Local B no puede validar el cupón del Local A.
- [ ] Un cupón ya usado no se vuelve a validar.
- [ ] Un cupón de una cortesía cancelada, rechazada o todavía pendiente no se valida.
- [ ] No existe un QR "maestro" de la cortesía que valide sin ser el cupón de una persona.

## Studio

- [ ] Un descuento público se diseña como siempre y el cupón muestra su porcentaje o monto.
- [ ] Una cortesía se diseña en el mismo Studio.
- [ ] El diseño de la cortesía muestra el beneficio real, el QR de esa persona y el código corto.
- [ ] Nunca aparece 0% ni $0 como beneficio de la cortesía.

## Contabilidad

- [ ] Cortesía **sin** crédito de cortesía: el uso validado se puede liquidar en plata (CASH) o en canje (BARTER), según el acuerdo.
- [ ] Cortesía **financiada** con crédito: el uso existe, pero no se puede asignar a CASH ni a BARTER. La pantalla lo marca como no facturable.
- [ ] Financiar no descuenta dos veces. Validar esa cortesía no vuelve a descontar el crédito. Cerrar la liquidación tampoco.

## Dos locales

- [ ] En el Local A solo ves cortesías, métricas y solicitudes del Local A.
- [ ] Pasás al Local B: no quedan cortesías de A en la lista, ni en el detalle, ni en los números.
- [ ] Volvés al Local A: lo de B no aparece mezclado.
