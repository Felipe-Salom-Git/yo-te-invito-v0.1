# V3.1 Etapa 7 Slice 7.8 — Multi-Date Scanner Smoke

**Fecha:** 2026-06-10  
**Slice:** 7.8 — Scanner valida fecha de función  
**Estado:** OK (código + build)

---

## API

- `ScanBody` / `ValidateTicketBody`: `occurrenceId` opcional.
- `ScannerService.scan()`: rechaza ticket de otra fecha → `WRONG_OCCURRENCE`.
- Schema `scanner.ts` actualizado.

---

## Scanner PWA

- Selector de fecha cuando evento multi-fecha (`DoorScannerClient`).
- UX clara para `WRONG_OCCURRENCE`.

---

## QA

| Check | Resultado |
|-------|-----------|
| `pnpm --filter scanner run build` | OK |
| `npx nest build` | OK |

**Manual:** escanear ticket de fecha A con scanner en fecha B → rechazo; fecha correcta → OK.
