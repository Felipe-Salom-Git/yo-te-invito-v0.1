# Admin / Gastro / Scanner — hotfix operativo (2026-06-23)

## Bugs corregidos

### 1. Scanner descuentos: QR válido figura inactivo
**Causa:** `ScannerGastroDiscountService` exigía `GastroDiscount.status === 'ACTIVE'` antes de evaluar el claim. Descuentos en `APPROVED` (vigentes en flujo público) rechazaban claims `ACTIVE`.

**Fix:** Validación claim-first. Parent redeemable si `ACTIVE` o `APPROVED`. Estados de claim (`ACTIVE`/`USED`/`CANCELLED`/`EXPIRED`) priorizados. Master token sin claim sigue requiriendo `ACTIVE`.

**Test:** `pnpm --filter api run test:gastro-discount-scan` — caso `APPROVED parent + active claim → VALID`.

### 2. Dashboard admin: borradores no visibles
**Fix:** `GET /admin/dashboard` expone `eventsDraftCount`, `gastroDiscountsPendingCount`, listas `draftEvents` y `pendingGastroDiscounts`. UI `/admin` — KPIs + sección «Pendientes operativos».

### 3. Gastro: múltiples subcategorías y etiquetas
**Fix:** `subcategoryIds` en schemas gastro; sync a `EventSubcategory` del evento público (patrón excursiones). `GastroSubcategoryMultiSelect` en `GastroLocalForm`. Tags ya existían vía `EventTag`.

### 4. Excursiones: `Invalid or expired token`
**Fix:** `getErrorMessage` traduce 401/token expirado. Crear operador sanitiza horarios y refresca sesión (`getSession`) antes del POST.

### 5. Horarios gastro: `open must be before close`
**Fix:** `sanitizeRentalOpeningHours` + `validateRentalOpeningHoursForSubmit` en `@yo-te-invito/shared`. Submit frontend + `writeGastroOpeningHours` / excursion operators en API.

## QA manual pendiente

- [ ] Escanear QR claim con descuento `APPROVED` en prod/staging.
- [ ] Dashboard admin: evento DRAFT + descuento PENDING_REVIEW visibles.
- [ ] Crear/editar local gastro con 2+ subcategorías y tags.
- [ ] Crear operador excursión mobile con sesión larga / expirada → mensaje claro.
- [ ] Crear local gastro sin horarios / día cerrado / horario inválido bloqueado en UI.
