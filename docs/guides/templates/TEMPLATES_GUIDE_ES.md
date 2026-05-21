## Guía de Templates del Proyecto
### Ticketera – Yo Te Invito

Esta guía explica todos los **templates de desarrollo disponibles en el proyecto**, su propósito y cuándo deben utilizarse.

Los templates existen para:

- mantener consistencia en el código
- facilitar el trabajo con herramientas de IA (Cursor / Antigravity)
- reducir errores de arquitectura
- acelerar el desarrollo de nuevas funcionalidades
- ayudar a nuevos desarrolladores a entender cómo trabajar en el proyecto

---

# 1. Templates de Prompts (Trabajo con IA)

Estos templates ayudan a interactuar correctamente con herramientas de desarrollo asistido por IA.

---

## PROMPT_HEADER.md

📍 Ubicación  

docs/guides/templates/PROMPT_HEADER.md


### Función

Define un **header estándar para prompts** cuando se trabaja con herramientas de IA como Cursor o Antigravity.

Obliga a la IA a:

- leer la documentación del proyecto
- respetar la arquitectura
- presentar un plan de ejecución
- seguir las reglas del repositorio

### Cuándo usarlo

Siempre que se cree un **nuevo prompt de desarrollo con IA**.

Ejemplo:


[PROMPT_HEADER]

Task:
[Descripción de la tarea]


---

## TASK_PROMPT_TEMPLATE.md

📍 Ubicación


docs/guides/templates/TASK_PROMPT_TEMPLATE.md


### Función

Define la **estructura estándar de una tarea** cuando se pide a una IA implementar algo.

Incluye secciones como:

- contexto de la tarea
- comportamiento esperado
- documentación relevante
- restricciones técnicas
- plan de ejecución

### Cuándo usarlo

Cuando se prepara una **tarea estructurada para IA**.

Especialmente útil para:

- features nuevas
- refactors
- cambios importantes

---

# 2. Templates de Backend

Estos templates ayudan a mantener consistencia en la arquitectura del backend.

---

## MODULE_TEMPLATE.md

📍 Ubicación


docs/guides/templates/MODULE_TEMPLATE.md


### Función

Define la estructura estándar de un **módulo de backend**.

Incluye:

- estructura de carpetas
- responsabilidades de cada capa
- organización de archivos
- documentación obligatoria

### Cuándo usarlo

Cuando se crea un **nuevo módulo de dominio**.

Ejemplos:

- events
- invitations
- guests
- tickets
- tracking

---

## ENDPOINT_TEMPLATE.md

📍 Ubicación


docs/guides/templates/ENDPOINT_TEMPLATE.md


### Función

Estandariza la implementación de **endpoints HTTP**.

Define:

- validación con Zod
- estructura del controller
- formato de respuestas
- manejo de errores

### Cuándo usarlo

Cada vez que se crea o modifica un **endpoint del API**.

Ejemplos:

- POST /events
- GET /tickets
- PATCH /invitations/:id

---

## SERVICE_TEMPLATE.md

📍 Ubicación


docs/guides/templates/SERVICE_TEMPLATE.md


### Función

Define cómo deben implementarse los **services del backend**.

Incluye:

- estructura de métodos
- separación de lógica
- manejo de errores
- orquestación de workflows

### Cuándo usarlo

Cuando se implementa **lógica de negocio**.

Ejemplos:

- crear una invitación
- validar acceso a evento
- generar tickets

---

## REPOSITORY_TEMPLATE.md

📍 Ubicación


docs/guides/templates/REPOSITORY_TEMPLATE.md


### Función

Define cómo organizar el **acceso a datos usando Prisma**.

Incluye:

- queries estándar
- paginación
- filtros
- selección de campos

### Cuándo usarlo

Cuando se crea o modifica **acceso a base de datos**.

Ejemplos:

- queries complejas
- filtros dinámicos
- paginación

---

## ERROR_HANDLING_TEMPLATE.md

📍 Ubicación


docs/guides/templates/ERROR_HANDLING_TEMPLATE.md


### Función

Define el **estándar de manejo de errores** del sistema.

Incluye:

- tipos de errores
- mapping a HTTP responses
- estructura de error responses

### Cuándo usarlo

Cuando se implementa lógica que puede generar errores:

- validaciones
- conflictos
- recursos inexistentes
- errores de negocio

---

# 3. Templates de Frontend

Estos templates ayudan a mantener consistencia en el frontend.

---

## FRONTEND_COMPONENT_TEMPLATE.md

📍 Ubicación


docs/guides/templates/FRONTEND_COMPONENT_TEMPLATE.md


### Función

Define cómo crear **componentes de React/Next.js**.

Incluye:

- estructura del componente
- separación UI / lógica
- manejo de estados
- props tipadas

### Cuándo usarlo

Cuando se crea un **nuevo componente de interfaz**.

Ejemplos:

- EventCard
- TicketList
- InvitationForm

---

## HOOK_TEMPLATE.md

📍 Ubicación


docs/guides/templates/HOOK_TEMPLATE.md


### Función

Estandariza la creación de **custom hooks**.

Incluye:

- inputs
- outputs
- manejo de loading
- manejo de errores
- estado interno

### Cuándo usarlo

Cuando se crea lógica reutilizable en frontend.

Ejemplos:

- useEvents
- useTickets
- useInvitations

---

# 4. Templates de Documentación

---

## DOCS_TEMPLATE.md

📍 Ubicación


docs/guides/templates/DOCS_TEMPLATE.md


### Función

Define el formato estándar de **documentación de módulos o componentes**.

Incluye:

- propósito
- flujo de datos
- dependencias
- endpoints asociados
- edge cases

### Cuándo usarlo

Cuando se documenta:

- un módulo
- una integración
- un componente importante

---

# 5. Filosofía del sistema de templates

Todos los templates existen para garantizar:

- consistencia en el código
- arquitectura predecible
- facilidad para trabajar con IA
- onboarding rápido de nuevos developers

El objetivo es que cualquier desarrollador pueda:

1. Leer esta guía
2. Elegir el template correcto
3. Implementar código siguiendo un patrón claro

---

# 6. Recomendación de flujo de trabajo

Cuando se implemente una nueva funcionalidad:

1. Crear la tarea usando `TASK_PROMPT_TEMPLATE.md`
2. Usar `MODULE_TEMPLATE.md` si se necesita un módulo nuevo
3. Implementar endpoints usando `ENDPOINT_TEMPLATE.md`
4. Implementar lógica usando `SERVICE_TEMPLATE.md`
5. Implementar acceso a datos con `REPOSITORY_TEMPLATE.md`
6. Aplicar `ERROR_HANDLING_TEMPLATE.md`
7. Crear componentes usando `FRONTEND_COMPONENT_TEMPLATE.md`
8. Crear hooks usando `HOOK_TEMPLATE.md`
9. Documentar usando `DOCS_TEMPLATE.md`

---

# Fin de la guía de templates