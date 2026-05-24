# Documentos legales — fuente Markdown

Textos base para el módulo Legal Admin. **No** incluir prompts de slices ni documentación técnica del módulo aquí.

## Archivos importables

| Archivo | Documento en admin |
|---------|-------------------|
| `01_TERMINOS_Y_CONDICIONES_GENERALES.md` | Términos generales |
| `02_POLITICA_DE_PRIVACIDAD.md` | Privacidad |
| `03_POLITICA_COMPRA_CANCELACION_REEMBOLSO.md` | Compra / cancelación / reembolso |
| `04_CONDICIONES_PRODUCTORES.md` | Productores |
| `05_CONDICIONES_GASTRONOMICOS.md` | Gastronómicos |
| `06_CONDICIONES_RENTALS.md` | Rentals |
| `07_CONDICIONES_HOTELES.md` | Hoteles |
| `08_CONDICIONES_REFERIDOS.md` | Referidos |
| `09_CONDICIONES_TRANSFERENCIA_TICKETS.md` | Transferencia de tickets |
| `10_PROCEDIMIENTO_INTERNO_SOPORTE.md` | Soporte interno (`INTERNAL`) |

## No importados

- `00_INDICE_LEGAL_Y_RESPONSABILIDADES.md` — índice y matriz de responsabilidades (referencia interna).
- `LEGAL_ADMIN_MODULE.md` — documentación técnica del módulo.

## Cargar en la plataforma

```bash
pnpm --filter api run seed:legal-documents
pnpm --filter api run seed:legal-content -- --dry-run
pnpm --filter api run seed:legal-content
```

Luego revisar y publicar en `/admin/legales`. Ver `LEGAL_ADMIN_MODULE.md` §7b.
