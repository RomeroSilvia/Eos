**Resumen Ejecutivo**  
Eos debe construirse como una app móvil incremental, primero enfocada en el hábito diario de skincare y luego escalando hacia múltiples rutinas, autenticación, especialistas y gestión profesional.  
El equipo de 5 integrantes debe trabajar por módulos verticales, donde cada persona implementa pantalla, lógica, datos, tipos, componentes, validaciones, documentación y pruebas de su flujo.  
La prioridad técnica debe ser: MVP estable en máximo 8 semanas, arquitectura clara, datos locales primero, backend progresivo y crecimiento sin rehacer la app desde cero.

# Plan Técnico De Acción Para Eos

## Visión General Del Producto

Eos es una aplicación móvil de seguimiento personal de rutinas de skincare. Su foco inicial no es diagnosticar problemas dermatológicos ni recomendar tratamientos médicos, sino ayudar al usuario a organizar productos, cumplir rutinas y visualizar constancia.

El producto debe evolucionar así:

1. **Entrega 1 / MVP Básico**  
   Seguimiento diario de una rutina personal con productos, pasos, progreso y perfil básico.

2. **Entrega 2 / Escalado funcional horizontal**  
   Múltiples rutinas, historial más completo, autenticación real, roles iniciales y base para especialistas.

3. **Entrega 3 / Producto final escalado vertical**  
   Ecosistema con especialistas, clientes, centros/gabinetes, suscripciones, gestión avanzada y arquitectura escalable.

---

# Arquitectura Recomendada

## Stack Base

**Frontend móvil**
- React Native + Expo.
- TypeScript.
- expo-router para navegación.
- React Hook Form + Zod para formularios y validaciones.
- Zustand o Context API para estado local inicial.
- TanStack Query cuando exista backend remoto.
- AsyncStorage o SQLite local para persistencia inicial.

**Backend progresivo**
- Entrega 1: sin backend obligatorio; mocks y persistencia local.
- Entrega 2: Supabase o Firebase para autenticación, base de datos y storage.
- Entrega 3: backend propio con NestJS o Supabase ampliado, según complejidad del producto.

**Base de datos**
- Entrega 1: modelos TypeScript + datos mock + AsyncStorage/SQLite.
- Entrega 2: PostgreSQL vía Supabase o Firestore.
- Entrega 3: PostgreSQL con modelo multi-tenant para especialistas, clientes y centros.

**Autenticación**
- Entrega 1: perfil local o login mock.
- Entrega 2: Supabase Auth o Firebase Auth.
- Entrega 3: roles, permisos y gestión por organización.

**Notificaciones**
- Entrega 1: Expo Notifications local.
- Entrega 2: recordatorios sincronizados por usuario.
- Entrega 3: notificaciones por especialista, agenda, vencimientos y suscripción.

**Imágenes**
- Entrega 1: imágenes mock/locales.
- Entrega 2: Expo Image Picker + Supabase Storage/Firebase Storage.
- Entrega 3: almacenamiento organizado por usuario, producto, especialista y centro.

**Despliegue**
- Expo Go para desarrollo.
- EAS Build para APK/AAB o TestFlight cuando avance el proyecto.
- Entrega académica con video demo, repo y README reproducible.

---

# Organización Del Equipo

## Regla Principal

No dividir por capas técnicas. Cada integrante trabaja full stack sobre un módulo funcional vertical:

- pantalla;
- componentes;
- tipos;
- lógica;
- servicios futuros;
- datos mock;
- validaciones;
- documentación;
- pruebas manuales;
- integración con navegación.

## Módulos

**Integrante 1 — Inicio / Home**
- Home.
- Resumen de rutina del día.
- Métricas rápidas.
- Recordatorios visibles.
- Integración con tab bar.
- Tipos y mocks del resumen diario.

**Integrante 2 — Rutinas**
- Pantalla Rutina.
- Crear rutinas.
- Pasos de rutina.
- Categorías.
- Marcar pasos como completados.
- Editar/eliminar pasos.
- `RoutineStepCard`.
- `RoutineProgressCard`.

**Integrante 3 — Productos**
- Pantalla Productos.
- Alta, edición y eliminación.
- Categorías.
- Asociación producto-paso.
- `ProductCard`.
- `ProductSelector`.

**Integrante 4 — Progreso / Historial**
- Pantalla Progreso.
- Métricas semanales.
- Racha actual.
- Historial por fecha.
- Calendario mensual.
- `ProgressSummaryCard`.
- `StreakCard`.
- `MonthCalendarCard`.

**Integrante 5 — Perfil / Autenticación / Configuración**
- Perfil.
- Login/registro inicial.
- Tipo de piel.
- Preferencias de recordatorios.
- Configuración básica de notificaciones.
- Servicios base de auth y notifications.

---

# Entrega 1 / MVP Básico

## Objetivo De La Etapa

Habilitar el flujo principal del producto: que una persona pueda registrar una rutina diaria de skincare, asociar productos, completar pasos y ver progreso básico.

La app debe demostrar valor sin depender todavía de una infraestructura compleja.

## Duración Estimada

**6 a 8 semanas**, con equipo de 5 integrantes.

## Distribución De Responsabilidades

| Integrante | Módulo | Alcance Entrega 1 |
|---|---|---|
| 1 | Home | Resumen diario, rutina activa, cards de métricas, recordatorios visibles |
| 2 | Rutinas | Una rutina diaria editable, pasos, completar/descompletar pasos |
| 3 | Productos | CRUD local de productos y asociación simple a pasos |
| 4 | Progreso | Historial semanal, racha básica, porcentaje de cumplimiento |
| 5 | Perfil/Auth/Config | Perfil local, tipo de piel, preferencias de recordatorios, notificaciones locales |

## Tareas Técnicas Priorizadas

1. **Inicialización del proyecto**
   - Dependencia: ninguna.
   - Crear app Expo con TypeScript.
   - Configurar expo-router.
   - Crear estructura base por módulos.
   - Configurar ESLint/Prettier.
   - Definir paleta, tipografías, espaciado y componentes base.

2. **Diseño UX/UI en Figma**
   - Dependencia: definición del alcance MVP.
   - Diseñar navegación principal.
   - Diseñar pantallas Home, Rutinas, Productos, Progreso y Perfil.
   - Definir componentes reutilizables.
   - Documentar flujo principal.

3. **Modelado de tipos**
   - Dependencia: alcance funcional definido.
   - Crear tipos:
     - `UserProfile`.
     - `SkinType`.
     - `Routine`.
     - `RoutineStep`.
     - `Product`.
     - `ProductCategory`.
     - `DailyRoutineLog`.
     - `ReminderPreference`.

4. **Mocks compartidos**
   - Dependencia: tipos base.
   - Crear datos mock por módulo.
   - Evitar duplicación de entidades.
   - Usar IDs consistentes entre productos, rutinas y logs.

5. **Navegación general**
   - Dependencia: estructura base.
   - Tabs: Home, Rutina, Productos, Progreso, Perfil.
   - Definir rutas internas para crear/editar.

6. **Módulo Rutinas**
   - Dependencia: tipos y navegación.
   - Crear pantalla de rutina diaria.
   - Crear pasos.
   - Editar/eliminar pasos.
   - Marcar pasos como completados.
   - Calcular progreso de rutina.

7. **Módulo Productos**
   - Dependencia: tipos base.
   - Crear listado de productos.
   - Crear/editar/eliminar producto.
   - Categorizar productos.
   - Asociar producto a paso de rutina.

8. **Módulo Home**
   - Dependencia: rutinas y progreso básico.
   - Mostrar rutina del día.
   - Mostrar cantidad de pasos completados.
   - Mostrar racha actual.
   - Mostrar próximos recordatorios.

9. **Módulo Progreso**
   - Dependencia: logs de rutina.
   - Guardar historial diario local.
   - Mostrar cumplimiento semanal.
   - Mostrar racha actual.
   - Mostrar historial por fecha.

10. **Módulo Perfil / Configuración**
   - Dependencia: estructura base.
   - Crear perfil local.
   - Seleccionar tipo de piel.
   - Configurar horarios de recordatorio.
   - Preparar servicio de notificaciones locales.

11. **Persistencia local**
   - Dependencia: módulos funcionales.
   - Usar AsyncStorage o SQLite.
   - Persistir productos, rutinas, perfil y logs.
   - Cargar estado al iniciar la app.

12. **Integración final**
   - Dependencia: módulos completos.
   - Resolver estados vacíos.
   - Validar navegación.
   - Probar flujo completo:
     - crear producto;
     - crear rutina;
     - asociar producto;
     - completar pasos;
     - consultar progreso.

13. **QA manual**
   - Dependencia: integración.
   - Pruebas en Android.
   - Pruebas en Expo Go.
   - Checklist por módulo.
   - Registro de bugs y correcciones.

## Criterios De Done

La Entrega 1 está completa si:

- El usuario puede crear al menos una rutina diaria.
- El usuario puede agregar, editar y eliminar pasos.
- El usuario puede crear al menos un producto y asociarlo a un paso.
- El usuario puede marcar pasos como completados.
- La Home muestra resumen del día.
- Progreso muestra:
  - porcentaje semanal;
  - racha actual;
  - historial básico por fecha.
- El perfil permite guardar tipo de piel y preferencias.
- Los datos persisten al cerrar y abrir la app.
- No hay crashes en el flujo principal.
- Cada módulo tiene documentación breve.
- Cada integrante realizó pruebas manuales de su módulo.
- Existe video demo funcional.
- README permite ejecutar el proyecto desde cero.

## Riesgos Y Mitigaciones

**Riesgo 1: integración tardía entre módulos**  
Mitigación: integrar desde la semana 2 usando mocks compartidos y tabs funcionales aunque las pantallas estén incompletas.

**Riesgo 2: modelos de datos inconsistentes**  
Mitigación: definir tipos globales antes de implementar pantallas y revisar cambios de modelos en PR.

**Riesgo 3: scope creep del MVP**  
Mitigación: bloquear funcionalidades médicas, recomendaciones automáticas, comunidad, IA diagnóstica y pagos hasta etapas posteriores.

## Stack Y Herramientas Clave

- React Native + Expo: rápido para MVP móvil.
- TypeScript: reduce errores entre módulos.
- expo-router: navegación simple por archivos.
- AsyncStorage o SQLite: persistencia local.
- Expo Notifications: recordatorios locales.
- Figma: diseño previo.
- GitHub Projects o Trello: seguimiento semanal.
- GitHub Pull Requests: revisión cruzada.

## Entregables Académicos

- Documento de alcance de Entrega 1.
- RF/RNF del MVP.
- User stories por módulo.
- Criterios de aceptación.
- Figma con pantallas principales.
- Repositorio GitHub.
- README con instalación, scripts y estructura.
- CHANGELOG `v0.1.0`.
- Video demo de 3 a 5 minutos.
- Evidencia de uso de IA:
  - prompts usados;
  - decisiones tomadas con ayuda de IA;
  - revisión crítica del equipo;
  - qué se aceptó, modificó o descartó.

---

# Entrega 2 / Escalado Funcional Horizontal

## Objetivo De La Etapa

Ampliar el producto para soportar múltiples rutinas, usuarios autenticados, historial más robusto y una base inicial para roles y especialistas.

Esta etapa convierte el MVP local en una app sincronizable y multiusuario.

## Duración Estimada

**6 a 8 semanas** adicionales.

## Distribución De Responsabilidades

| Integrante | Módulo | Alcance Entrega 2 |
|---|---|---|
| 1 | Home | Home personalizada por usuario, próximas rutinas, resumen semanal |
| 2 | Rutinas | Múltiples rutinas: mañana, noche, semanal, personalizada |
| 3 | Productos | Productos con imágenes, vencimientos opcionales, filtros |
| 4 | Progreso | Historial mensual, calendario más completo, métricas por rutina |
| 5 | Perfil/Auth/Config | Auth real, sesión, roles iniciales, sync de preferencias |

## Tareas Técnicas Priorizadas

1. **Elección e integración backend**
   - Dependencia: evaluación técnica.
   - Recomendación: Supabase por PostgreSQL, Auth, Storage y APIs rápidas.
   - Alternativa: Firebase si el equipo prioriza integración simple y tiempo.

2. **Diseño del modelo remoto**
   - Dependencia: tipos Entrega 1.
   - Tablas sugeridas:
     - `users`.
     - `profiles`.
     - `routines`.
     - `routine_steps`.
     - `products`.
     - `routine_step_products`.
     - `daily_logs`.
     - `reminders`.
     - `roles`.

3. **Autenticación real**
   - Dependencia: backend.
   - Registro.
   - Login.
   - Logout.
   - Recuperación básica de sesión.
   - Protección de rutas.

4. **Migración de estado local a remoto**
   - Dependencia: auth y modelo DB.
   - Adaptar servicios por módulo.
   - Separar interfaz de servicio de implementación.
   - Mantener mocks para pruebas.

5. **Múltiples rutinas**
   - Dependencia: modelo remoto.
   - Crear rutinas por tipo:
     - mañana;
     - noche;
     - personalizada.
   - Activar/desactivar rutinas.
   - Ordenar pasos.

6. **Productos mejorados**
   - Dependencia: Storage.
   - Agregar imagen de producto.
   - Agregar marca, categoría y fecha de apertura.
   - Filtros por categoría.
   - Asociación múltiple con pasos.

7. **Historial avanzado**
   - Dependencia: logs remotos.
   - Calendario mensual.
   - Métricas por rutina.
   - Cumplimiento semanal y mensual.
   - Días consecutivos calculados de forma consistente.

8. **Roles iniciales**
   - Dependencia: auth.
   - Roles mínimos:
     - usuario;
     - especialista invitado o placeholder.
   - No habilitar aún funciones clínicas complejas.

9. **Notificaciones mejoradas**
   - Dependencia: rutinas múltiples.
   - Programar recordatorios por rutina.
   - Permitir activar/desactivar.
   - Guardar preferencias por usuario.

10. **Estados de red y errores**
   - Dependencia: backend.
   - Loading.
   - Error.
   - Empty state.
   - Reintento manual.
   - Mensajes simples.

11. **Pruebas e integración**
   - Dependencia: módulos migrados.
   - Probar usuario nuevo.
   - Probar usuario existente.
   - Probar logout/login.
   - Probar persistencia remota.

## Criterios De Done

La Entrega 2 está completa si:

- Existe login y registro reales.
- Cada usuario ve solo sus datos.
- Se pueden crear múltiples rutinas.
- Los productos pueden tener imagen.
- El historial muestra vista semanal y mensual.
- Las métricas se calculan por usuario.
- Los datos persisten en backend.
- Hay manejo de errores de red.
- Existe al menos un rol inicial preparado.
- La app sigue funcionando de forma estable en Expo/EAS.
- El README documenta variables de entorno.
- Se incluye diagrama de base de datos.
- Se actualiza CHANGELOG `v0.2.0`.

## Riesgos Y Mitigaciones

**Riesgo 1: migración desordenada de local a remoto**  
Mitigación: crear servicios por módulo con interfaces claras antes de cambiar la fuente de datos.

**Riesgo 2: errores de permisos entre usuarios**  
Mitigación: aplicar Row Level Security en Supabase o reglas equivalentes en Firebase.

**Riesgo 3: métricas inconsistentes**  
Mitigación: definir una única regla para calcular cumplimiento, racha y rutina completada.

## Stack Y Herramientas Clave

- Supabase Auth: autenticación rápida.
- Supabase PostgreSQL: datos relacionales adecuados para rutinas, pasos y productos.
- Supabase Storage: imágenes de productos.
- TanStack Query: cache, loading y sincronización.
- Zod: validaciones de formularios.
- EAS Build: builds compartibles.

## Entregables Académicos

- Documento de alcance Entrega 2.
- RF/RNF actualizados.
- User stories nuevas.
- Diagrama entidad-relación.
- Figma actualizado con flujos de auth y múltiples rutinas.
- README con backend y variables de entorno.
- CHANGELOG `v0.2.0`.
- Video demo con usuario nuevo y usuario existente.
- Evidencia de PRs y code reviews.
- Evidencia de uso de IA:
  - diseño de modelo;
  - revisión de riesgos;
  - generación de casos de prueba;
  - comparación entre Supabase/Firebase.

---

# Entrega 3 / Producto Final Escalado Vertical

## Objetivo De La Etapa

Preparar Eos como producto escalable para usuarios, especialistas, clientes y centros/gabinetes, con roles, gestión avanzada y arquitectura lista para crecimiento.

Esta etapa transforma la app de seguimiento personal en una plataforma de bienestar y gestión profesional, sin caer en diagnóstico médico automático.

## Duración Estimada

**8 a 10 semanas** adicionales.

## Distribución De Responsabilidades

| Integrante | Módulo | Alcance Entrega 3 |
|---|---|---|
| 1 | Home | Dashboard según rol: usuario, especialista o centro |
| 2 | Rutinas | Rutinas asignadas por especialista, plantillas y seguimiento |
| 3 | Productos | Catálogo recomendado, productos por especialista/centro |
| 4 | Progreso | Reportes para usuario y especialista, evolución por cliente |
| 5 | Perfil/Auth/Config | Roles avanzados, permisos, organización/centro |

## Tareas Técnicas Priorizadas

1. **Redefinición de roles y permisos**
   - Dependencia: roles iniciales Entrega 2.
   - Roles:
     - usuario;
     - especialista;
     - administrador de centro;
     - cliente/paciente no clínico.
   - Definir permisos por acción.

2. **Modelo multi-tenant**
   - Dependencia: roles.
   - Agregar:
     - `organizations`.
     - `specialists`.
     - `clients`.
     - `client_specialist_links`.
     - `routine_templates`.
   - Aislar datos por organización cuando corresponda.

3. **Dashboard por rol**
   - Dependencia: permisos.
   - Usuario: rutina y progreso personal.
   - Especialista: clientes asignados.
   - Centro: especialistas, clientes y estado general.

4. **Rutinas asignadas**
   - Dependencia: especialista-cliente.
   - Especialista crea plantilla.
   - Especialista asigna rutina.
   - Usuario acepta o visualiza rutina asignada.
   - Usuario registra cumplimiento.

5. **Reportes avanzados**
   - Dependencia: historial consolidado.
   - Cumplimiento mensual.
   - Comparación por rutina.
   - Export básico o vista compartible.
   - Sin diagnóstico automático.

6. **Gestión avanzada de productos**
   - Dependencia: catálogo.
   - Productos propios.
   - Productos sugeridos por especialista.
   - Productos del centro.
   - Asociación con plantillas.

7. **Arquitectura de servicios**
   - Dependencia: crecimiento funcional.
   - Separar servicios por dominio:
     - auth;
     - routines;
     - products;
     - progress;
     - organizations.
   - Centralizar manejo de errores.

8. **Seguridad y auditoría básica**
   - Dependencia: permisos.
   - Validar acceso a datos.
   - Registrar cambios importantes.
   - Revisar reglas de seguridad.

10. **Optimización**
   - Dependencia: datos reales.
   - Paginación en clientes/historial.
   - Cache controlado.
   - Lazy loading de imágenes.
   - Minimizar renders innecesarios.

## Criterios De Done

La Entrega 3 está completa si:

- La app soporta al menos dos roles funcionales reales.
- Un especialista puede tener clientes asociados.
- Se pueden asignar rutinas o plantillas.
- El usuario puede completar una rutina asignada.
- El especialista puede consultar progreso del cliente.
- Existe modelo para centros/gabinetes.
- Existe modelo de suscripciones, aunque el pago esté simulado.
- Hay reglas de permisos documentadas.
- El sistema mantiene buen rendimiento con datos mock ampliados.
- La documentación técnica explica la arquitectura final.
- Se entrega video demo con flujo usuario-especialista.

## Riesgos Y Mitigaciones

**Riesgo 1: complejidad excesiva de roles**  
Mitigación: implementar solo permisos necesarios y documentar los casos no cubiertos.

**Riesgo 2: filtrado incorrecto de datos entre especialistas/clientes**  
Mitigación: aplicar seguridad en backend, no solo en frontend.

**Riesgo 3: producto demasiado amplio para el tiempo disponible**  
Mitigación: dejar pagos reales, chat, agenda avanzada e IA médica como futuras mejoras.

## Stack Y Herramientas Clave

- Supabase PostgreSQL o backend NestJS + PostgreSQL.
- Row Level Security o middleware de permisos.
- TanStack Query para cache y paginación.
- Expo EAS para distribución.
- Storage remoto para imágenes.
- Feature flags simples para activar/desactivar módulos avanzados.
- Sentry o logging básico si el tiempo lo permite.

## Entregables Académicos

- Documento final del producto.
- RF/RNF completos.
- User stories por rol.
- Arquitectura final.
- Diagrama de base de datos actualizado.
- Diagrama de navegación.
- Figma completo.
- README final.
- CHANGELOG `v1.0.0`.
- Video demo final.
- Evidencia de testing manual.
- Evidencia de PRs y revisiones.
- Evidencia de uso de IA:
  - prompts relevantes;
  - decisiones asistidas;
  - validación humana;
  - limitaciones éticas;
  - funcionalidades descartadas.

---

# Organización De Carpetas Recomendada

```txt
src/
  app/
    (tabs)/
      index.tsx
      routines.tsx
      products.tsx
      progress.tsx
      profile.tsx
    auth/
    routine/
    product/
  modules/
    home/
      components/
      hooks/
      mocks/
      services/
      types/
      docs/
    routines/
      components/
      hooks/
      mocks/
      services/
      types/
      docs/
    products/
      components/
      hooks/
      mocks/
      services/
      types/
      docs/
    progress/
      components/
      hooks/
      mocks/
      services/
      types/
      docs/
    profile/
      components/
      hooks/
      mocks/
      services/
      types/
      docs/
  shared/
    components/
    constants/
    theme/
    types/
    utils/
```

---

# Recomendaciones De Git Y Trabajo Colaborativo

## Ramas

Usar una rama principal protegida:

```txt
main
develop
feature/home-dashboard
feature/routines-module
feature/products-module
feature/progress-module
feature/profile-auth-config
fix/navigation-tabs
docs/update-readme-entrega-1
```

## Flujo

1. Cada integrante trabaja en su rama `feature/modulo`.
2. Cada PR debe apuntar a `develop`.
3. Nadie mergea directo a `main`.
4. Antes de cada entrega se crea una rama:
   - `release/entrega-1`
   - `release/entrega-2`
   - `release/entrega-3`
5. Al aprobar la entrega, merge a `main` y tag:
   - `v0.1.0`
   - `v0.2.0`
   - `v1.0.0`

## Pull Requests

Cada PR debe incluir:

- Qué módulo modifica.
- Qué pantalla o flujo agrega.
- Capturas o video corto.
- Checklist de pruebas manuales.
- Riesgos conocidos.
- Issues relacionados.
- Evidencia de que no rompe navegación.

## Revisión De Código

Reglas mínimas:

- Al menos 1 review por PR.
- PRs pequeños, idealmente de menos de 400 líneas cuando sea posible.
- No mezclar refactor grande con feature.
- Validar nombres, tipos, estados vacíos, errores y consistencia visual.
- Revisar que el módulo no duplique tipos compartidos.

---

# Definición Global De Calidad

## Requisitos Funcionales Base

- Crear rutinas.
- Crear pasos.
- Crear productos.
- Asociar productos a pasos.
- Marcar pasos completados.
- Ver progreso.
- Ver historial.
- Configurar perfil.
- Configurar recordatorios.

## Requisitos No Funcionales

- App usable en Android.
- Navegación clara.
- Persistencia de datos.
- Tiempo de carga razonable.
- Componentes reutilizables.
- Tipado estricto.
- Sin funcionalidades médicas riesgosas.
- Código organizado por módulo.
- Documentación reproducible.

---

# Línea De Tiempo Visual

| Semana | Etapa | Hito | Módulo responsable |
|---|---|---|---|
| Semana 1 | Entrega 1 | Setup Expo, repo, navegación base, Figma inicial | Compartido |
| Semana 2 | Entrega 1 | Tipos, mocks, theme y tabs funcionales | Compartido |
| Semana 3 | Entrega 1 | Rutinas y pasos básicos | Rutinas |
| Semana 4 | Entrega 1 | Productos y asociación con pasos | Productos |
| Semana 5 | Entrega 1 | Home, progreso semanal y perfil local | Home / Progreso / Perfil |
| Semana 6 | Entrega 1 | Persistencia local y notificaciones básicas | Perfil / Compartido |
| Semana 7 | Entrega 1 | Integración, QA manual y correcciones | Compartido |
| Semana 8 | Entrega 1 | Video demo, README, changelog y release `v0.1.0` | Compartido |
| Semana 9 | Entrega 2 | Selección backend y modelo remoto | Perfil/Auth / Compartido |
| Semana 10 | Entrega 2 | Auth real y sesión de usuario | Perfil/Auth |
| Semana 11 | Entrega 2 | Migración de rutinas y productos a backend | Rutinas / Productos |
| Semana 12 | Entrega 2 | Múltiples rutinas y productos con imágenes | Rutinas / Productos |
| Semana 13 | Entrega 2 | Historial mensual y métricas por rutina | Progreso |
| Semana 14 | Entrega 2 | Home personalizada y recordatorios sincronizados | Home / Perfil |
| Semana 15 | Entrega 2 | Roles iniciales, QA e integración | Compartido |
| Semana 16 | Entrega 2 | Demo, documentación y release `v0.2.0` | Compartido |
| Semana 17 | Entrega 3 | Diseño de roles avanzados y multi-tenant | Perfil/Auth |
| Semana 18 | Entrega 3 | Modelo especialistas, clientes y centros | Perfil/Auth / Compartido |
| Semana 19 | Entrega 3 | Dashboard por rol | Home |
| Semana 20 | Entrega 3 | Plantillas y rutinas asignadas | Rutinas |
| Semana 21 | Entrega 3 | Catálogo avanzado de productos | Productos |
| Semana 22 | Entrega 3 | Reportes para usuario y especialista | Progreso |
| Semana 23 | Entrega 3 | Suscripciones mock y permisos finales | Perfil/Auth |
| Semana 24 | Entrega 3 | Optimización, QA, documentación y release `v1.0.0` | Compartido |