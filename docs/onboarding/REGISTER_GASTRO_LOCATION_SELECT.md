# Register Gastro Location Select — Yo Te Invito

Fecha: 2026-05-24  
Bloque: Registro y onboarding por tipo de usuario  
Slice: 12.6 — Select provincia/ciudad gastronómico  
Estado: Implementado

## 1. Resumen

Se reemplazaron los inputs de texto libre de **provincia** y **ciudad** en el registro gastronómico (y en `/cuenta/solicitar-gastro`) por selects dependientes, reutilizando el catálogo `ARGENTINA_PROVINCES` de `@yo-te-invito/shared`. La **dirección** sigue siendo texto libre; no se piden lat/lng, mapa, horarios ni contenido de portal en signup.

## 2. Comportamiento

### Provincia

- Select accesible (`ProvinceCitySelect`).
- Placeholder: «Seleccioná una provincia».
- Al elegir: guarda slug en `location.province`, habilita ciudad, resetea ciudad previa.

### Ciudad

- Select dependiente de la provincia.
- Sin provincia: deshabilitado, placeholder «Primero elegí una provincia».
- Con provincia: solo ciudades del catálogo; placeholder «Seleccioná una ciudad».
- Provincia sin ciudades: «Todavía no hay ciudades disponibles para esta provincia.»

### Dirección

- Input texto: «Dirección del local».
- Hint: no hace falta mapa en signup; completar en portal.

## 3. Catálogo de ubicación

| Aspecto | Detalle |
|---------|---------|
| Archivo fuente | `packages/shared/src/location/argentina-locations.ts` |
| Reexport web | `apps/web/components/location/argentina-locations.ts` |
| Formato valores | Slugs (`rio-negro`, `san-carlos-de-bariloche`) |
| Labels | `provinceLabelFromValue` / `cityLabelFromValue` en persistencia |
| Extensión | Agregar entradas en `ARGENTINA_PROVINCES` (shared) |

Ciudades operativas iniciales: mismas que hotel/navbar (Patagonia, CABA, costa, etc.).

## 4. Compatibilidad con schemas

- Signup: `gastroProfileSignupSchema` — `location.province`, `location.city`, `location.address` (sin `lat`/`lng`).
- Apply: `gastroProfileApplySchema` — misma forma; opcionales `summary`, `legalName`.
- Persistencia: `gastroProfileToPersistInput` resuelve slugs a etiquetas legibles en `GastroProfile.province` / `city` (texto libre previo sigue funcionando si no matchea catálogo).

Mensajes Zod actualizados: «Seleccioná una provincia.», «Seleccioná una ciudad.», «Ingresá la dirección del local.»

## 5. Impacto en /cuenta/solicitar-gastro

**Actualizado** — usa `GastroProvinceCityFields` con el mismo catálogo y copy que el wizard.

## 6. Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `apps/web/components/auth/register/RegisterGastroStep.tsx` | Selects provincia/ciudad |
| `apps/web/components/location/GastroProvinceCityFields.tsx` | Bloque reutilizable |
| `apps/web/components/location/ProvinceCitySelect.tsx` | `provincePlaceholder` opcional |
| `apps/web/app/(portal)/cuenta/solicitar-gastro/page.tsx` | Mismos selects |
| `apps/web/components/auth/register/register-wizard-copy.ts` | Hints gastro |
| `apps/web/components/auth/RegisterWizard.tsx` | `city` preferida con label |
| `packages/shared/src/schemas/profile-onboarding.ts` | Mensajes + labels en persist |

## 7. Verificación

```bash
pnpm --filter @yo-te-invito/shared run build
pnpm --filter api run build
pnpm --filter web run build
```

Smoke manual: `/register` → Gastronómico → provincia/ciudad/ dirección → legales → `/gastro`.  
También `/cuenta/solicitar-gastro` si aplica.

`web build` puede fallar por `ProducerReferralMetricsPanel.tsx` (preexistente).

## 8. Pendientes

- Unificar gastro apply en portal de edición si aún usa texto libre en otros formularios (fuera de signup).
- Ampliar catálogo según nuevas ciudades operativas del producto.
