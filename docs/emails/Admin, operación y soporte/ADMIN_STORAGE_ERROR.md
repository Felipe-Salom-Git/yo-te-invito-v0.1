# TEMPLATE_ID
`ADMIN_STORAGE_ERROR`

## From
`operaciones@yoteinvito.club`

## Subject
Error operativo de storage — {{errorType}}

## Preview text
Se detectó un problema al subir, leer o procesar un archivo.

## Body
Hola {{adminName}},

Se detectó un error operativo relacionado con storage o carga de archivos.

**Resumen**

- Severidad: {{severity}}
- Tipo de error: {{errorType}}
- Código: {{errorCode}}
- Fecha/hora: {{occurredAt}}
- Entorno: {{environment}}

**Archivo / entidad**

- Ruta u objeto: {{storageObjectPath}}
- Entidad: {{entityType}} / {{entityId}}
- Usuario: {{userEmail}}

{{#if errorMessage}}
**Mensaje registrado**

{{errorMessage}}
{{/if}}

**Acción sugerida**

Revisar permisos, tamaño/formato del archivo, bucket/configuración de storage y logs del backend antes de reintentar o corregir manualmente.

## CTA principal
Ver detalle en admin — {{adminUrl}}

## Footer corto/legal
Este email es una alerta operativa interna de Yo Te Invito.  
No incluir credenciales ni claves de storage en respuestas por email.

© {{currentYear}} Yo Te Invito. Todos los derechos reservados.

## Variables sugeridas
```txt
{{adminName}}
{{severity}}
{{errorType}}
{{errorCode}}
{{occurredAt}}
{{environment}}
{{storageObjectPath}}
{{entityType}}
{{entityId}}
{{userEmail}}
{{errorMessage}}
{{adminUrl}}
{{currentYear}}
```
