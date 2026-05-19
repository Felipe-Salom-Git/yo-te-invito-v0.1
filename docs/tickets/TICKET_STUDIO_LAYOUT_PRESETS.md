# Ticket Studio — orientación y tamaños (presets)

## Orientación

| Modo | Dimensiones base (preset estándar) | Layout |
|------|-----------------------------------|--------|
| **Vertical (portrait)** | 320×560 (intercambia según preset) | Textos apilados arriba-centro; zona QR abajo (`TICKET_TEMPLATE_DEFAULT_QR_ZONE`). Logo/imagen arriba si existe. |
| **Horizontal (landscape)** | 560×320 | **Dos columnas**: información (TEXT + DYNAMIC excepto códigos) a la **izquierda**; **QR** a la **derecha**; campos dinámicos `ticketId` y `orderCode` **debajo del QR** en la misma columna. |

Al cambiar de vertical ↔ horizontal se **recalculan** posiciones normalizadas (no es solo intercambiar `canvasWidth`/`canvasHeight`). Contenido y estilos de cada capa se conservan.

Implementación: `apps/web/lib/producer/ticket-studio-layout-presets.ts` (`assignPortraitLayout`, `assignLandscapeLayout`, `applyOrientationWithLayout`).

## Tamaños (presets)

Misma superficie en píxeles entre portrait y landscape del mismo preset (solo rotan ejes):

| Preset | Portrait (W×H) | Landscape (W×H) |
|--------|----------------|-------------------|
| **Compacto** | 280×520 | 520×280 |
| **Estándar** | 320×560 | 560×320 |
| **Grande** | 360×640 | 640×360 |

Cambiar solo el tamaño **no** re-ejecuta el layout: las coordenadas 0–1 se mantienen; cambia el preview en píxeles.

`sizePreset` es principalmente UI (se infiere al cargar plantilla desde `canvasWidth`/`canvasHeight` con `inferSizePreset`). No requiere columna nueva en API.

## Estilos de capas de texto (TEXT / DYNAMIC)

Definidos en `elementStyleSchema` (`packages/shared`): además de `fontSize`, `color`, `textAlign`, etc., el productor puede usar:

- **`backgroundColor`** — relleno del rectángulo de la capa (hex o `rgba`) para contraste sobre fondo con imagen.
- **`textShadow`** — preset `none` \| `subtle` \| `medium` \| `strong`; en preview se traduce a `text-shadow` CSS (ver `apps/web/lib/producer/ticket-studio-text-shadow.ts`).

Los presets de layout (`assignPortraitLayout` / `assignLandscapeLayout`) conservan y propagan `style` al reordenar capas; no borran estos campos salvo donde el código reemplaza estilos puntuales (p. ej. alineación en columnas).

## Zona QR

Tras cada layout, la zona QR se pasa por `clampQrZone` (mismos márgenes que el backend). En horizontal el borrador objetivo es columna derecha (~56–94% ancho).
