# V3.1 Etapa 6 Slice 6.7 — Scanner offline UX

**Fecha:** 2026-06-10

## Componentes

| Componente | Rol |
|------------|-----|
| `ScannerConnectionStatus` | Online/offline, listado, pendientes, conflictos, sync |
| `OfflineConflictPanel` | Detalle conflictos |
| `DoorScannerClient` | CTAs guardar/borrar/sync/PDF |

## Estados visuales

1. Online (verde)
2. Offline (ámbar)
3. Sin listado (gris)
4. Listado guardado (verde)
5. Listado desactualizado (ámbar)
6. Pendiente sync (ámbar)
7. Sincronizando (azul)
8. Sincronizado (verde)
9. Conflictos (rojo)
10. Error sync (rojo, resumen última sync)

## Mobile-first

Pills compactos, copy no técnico, aviso offline antes de escanear.

## Pendiente Slice 6.8

QA integral dispositivo físico + cierre etapa.
