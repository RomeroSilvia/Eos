# EOS — Plan de Trabajo Entrega 3

> Documento ejecutable. Pensado para ser leído por agentes (Claude Code, Codex, Cursor) y por las 5 personas del equipo.
> Sigue la convención ya establecida del repo: **división vertical por módulo** (pantalla + componentes + hook + tipos + servicio + backend + tests + docs), no por capa técnica. Ver `docs/division-modulos.md` y `AGENTS.md` para el precedente de E1/E2.

---

## 0. Lectura obligatoria antes de empezar (todos los módulos)

1. `README.md` (raíz) — visión general del proyecto, stack y cómo correrlo.
2. `AGENTS.md` (raíz) — convenciones generales del repo.
3. `docs/plan_entrega2.md` — alcance, decisiones y criterios de aceptación ya cerrados en E2 (E3 no puede contradecir lo ya entregado sin justificarlo explícitamente).
4. `docs/division-modulos.md` — quién es dueño de qué desde E1/E2 (tu módulo de E3 extiende a tu módulo histórico cuando corresponda).
5. `docs/plan-tecnico.md`, `docs/next-steps.md` — deuda técnica conocida (RLS sin activar, falta refresh de token, falta auth guard global, índices comentados). **No la generes de nuevo si ya está documentada**: si tu módulo la toca, resuélvela como parte de tu entrega.
6. La sección de este documento correspondiente a tu módulo **completa**, no solo el resumen.
7. Backend: patrón obligatorio `routes → controller → service → repository → tests` (carpeta `backend/src/modules/<modulo>/`). Tests en **español**, seguir estilo de `backend/src/modules/routines/tests/*`.
8. Frontend: reusar `components/Button.tsx`, `components/Card.tsx`, `constants/colors.ts`, `constants/routes.ts`. No crear lenguaje visual nuevo sin pasar por `frontend-design` skill.
9. Antes de tocar código existente: `npm test` en `backend/` y `npm run typecheck` deben pasar en limpio (baseline).
10. Cada módulo nuevo de E3 debe tener su propia skill en `agents/skills/e3-<nombre-modulo>/SKILL.md`, siguiendo el formato de `agents/skills/e2-module3-roles-specialist/SKILL.md`, para que cualquier agente (Claude Code/Codex/Cursor) pueda retomarlo sin contexto previo.

---

## 1. Principio de partición (cómo se evita bloqueo entre los 5)

El criterio de partición **no** es "frontend vs backend" ni "feature grande vs feature chica": es **superficie de datos + superficie de pantalla que no se pisa**. Cada módulo:

- Tiene su propio namespace de backend (`backend/src/modules/<x>/`) → cero conflictos de merge en backend.
- Tiene sus propias migraciones SQL numeradas con prefijo de módulo (ver §2) → cero conflictos de esquema.
- Tiene sus propias rutas/pantallas (`app/...`) → cero conflictos de merge en frontend.
- Declara explícitamente qué **tipos compartidos** consume de otros módulos (contrato de solo lectura, nunca de escritura cruzada).

### 1.1 Mapa de los 5 módulos

| # | Módulo | Dueño histórico sugerido | RF/RNF que cubre |
|---|--------|---------------------------|-------------------|
| M1 | **Rutinas Avanzadas & Performance** | Integrante 2 (Rutinas) | RNF-01 (wizard <100ms), RF-01 (edición de pasos) |
| M2 | **Identidad Federada & Sesión** | Integrante 5 (Perfil/Auth) | RF-02 (Google/Apple Sign-In) + hardening de auth (refresh token, auth guard) |
| M3 | **Centros Estéticos & Tablero Admin** | Nuevo (o quien llevó el módulo Admin/Especialistas en E2) | RF-03 (centros jerárquicos), RF-04 (tablero admin) |
| M4 | **Auditoría & Seguridad Transversal** | Nuevo | RF-06 (auditoría exhaustiva) + RNF-Seguridad (RBAC backend estricto, trazabilidad, cifrado en tránsito) |
| M5 | **Planes/Suscripciones & Métricas Globales** | Integrante 4 (Progreso) o nuevo | RF-05 (planes/suscripciones), RF-07 (métricas y reportes por centro) |

Las RNF de **Usabilidad/Accesibilidad**, **Rendimiento general**, **Escalabilidad** y **Disponibilidad** son **transversales**: no las posee un módulo, son criterios de "Definición de Hecho" (DoD) exigidos a los 5 (ver §6).

### 1.2 Dependencias mínimas entre módulos (y cómo se desbloquean)

No hay dependencias *bloqueantes* si se respeta el orden de §3 para las piezas de esquema compartidas. Las únicas relaciones de datos son:

- **M5 depende del esquema de M3** (`centers`, `center_id` en `specialist_profiles`) para poder agrupar métricas por centro.
  → **Mitigación**: M3 publica la migración de `centers` (tabla vacía + FK nullable) en el **Día 1-2**, antes de tener la lógica de negocio completa. M5 arranca contra esa tabla aunque M3 todavía esté construyendo el CRUD de centros. Contrato: `centers(id, name, address, created_at)` + `specialist_profiles.center_id uuid null references centers(id)`.
- **M4 (auditoría) es consumido por M3 y M5**, no al revés: ambos *emiten* eventos, M4 sólo los registra y expone lectura.
  → **Mitigación**: M4 publica primero el **contrato de emisión** (una función/helper `auditLog.record({ actorId, action, entity, entityId, before, after })` + tabla `audit_logs`) en Día 1-2. El resto de módulos la importan como librería; M4 sigue iterando el panel de lectura/reportes en paralelo sin bloquear a nadie.
- **M2 (auth federada) no bloquea a nadie**, pero **todos los módulos nuevos deben usar** el `auth.middleware.ts` existente sin modificarlo salvo que M2 lo extienda explícitamente (ver contrato en §4.2).
- **M1 es el más aislado**: solo toca `app/routine/*`, `hooks/useRoutine.ts`, `services/routines.ts`, `backend/src/modules/routines/`. Cero dependencia de los otros 4.

### 1.3 Contratos explícitos entre módulos (definir y congelar en Día 1-2, antes de programar el resto)

Estos son los **4 contratos** que deben quedar escritos en `docs/e3-contracts.md` (a crear, responsabilidad compartida, cada dueño de módulo redacta el suyo) antes de avanzar con lógica de negocio:

1. **Contrato de auditoría (M4 → todos)**
   ```ts
   // backend/src/modules/audit/audit.types.ts
   type AuditAction = 'create' | 'update' | 'delete' | 'approve' | 'reject' | 'login' | 'role_change';
   type AuditEntity = 'routine' | 'specialist_profile' | 'center' | 'subscription' | 'product' | 'user_profile';
   function recordAuditLog(params: {
     actorId: string; actorRole: string; action: AuditAction;
     entity: AuditEntity; entityId: string;
     before?: unknown; after?: unknown; metadata?: Record<string, unknown>;
   }): Promise<void>;
   ```
   Cualquier módulo que cree/edite/borre algo relevante (rutinas asignadas, altas de especialista, centros, suscripciones) llama a esta función. No debe lanzar excepción si falla (best-effort, igual que `notificationsService.sendToUser`).

2. **Contrato de roles (M2/M3 → todos)**: los roles válidos siguen siendo `user | specialist | center_admin` (RN-E2-02). E3 **no agrega roles nuevos**; `center_admin` pasa a tener scope sobre un `center_id` específico vía tabla `center_admins (user_id, center_id)`. Ningún módulo debe asumir un admin global salvo el rol especial `platform_admin` que M3 declara explícitamente si se necesita (a decidir Día 1, documentar la decisión).

3. **Contrato de esquema de centros (M3 → M5)**: tabla `centers` y FK `specialist_profiles.center_id` se publican primero; el resto de columnas de `centers` (lat/lng, métricas internas) pueden agregarse después sin romper a M5 porque M5 solo consume `id` y `name`.

4. **Contrato de planes (M5 → M3/M4)**: tabla `subscription_plans` y `subscriptions(user_id | center_id, plan_id, status)` no condicionan el acceso de ningún otro módulo en E3 (RF-05 es informativo/gestión, no gating real todavía — el backlog deja explícito que el *enforcement* de acceso por plan es post-E3). Esto evita que M5 bloquee funcionalidades de M1/M2/M3/M4.

### 1.4 Cómo se valida que un módulo integra sin fricción

- **Checklist de PR obligatorio** (ver §10) incluye: "no modifiqué archivos fuera de mi carpeta de módulo, salvo los puntos de extensión documentados en §4".
- Antes de cada merge a `develop`: pipeline corre `npm test` (frontend si aplica) + `cd backend && npm test && npm run typecheck` + lint. Un módulo no puede mergear si rompe los tests de **otro** módulo — eso es la señal de que la partición se violó.
- **Integración semanal** (ver §9): cada viernes se mergean los 5 branches a una rama `integration/e3` y se corre la suite completa + smoke E2E manual de los flujos cruzados (login federado → ver rutina → especialista de un centro → ver métricas).

---

## 2. Esquema de base de datos — convención de migraciones E3

Para evitar choques de archivos en `supabase/migrations/`, cada módulo usa su propio prefijo de timestamp + sufijo:

```
supabase/migrations/
  20260701000100_e3_m1_routine_steps_edit.sql        (M1)
  20260701000200_e3_m2_federated_identity.sql         (M2)
  20260701000300_e3_m3_centers_schema.sql              (M3 — publicar primero, Día 1-2)
  20260701000301_e3_m3_admin_dashboard_views.sql       (M3)
  20260701000400_e3_m4_audit_logs_schema.sql           (M4 — publicar primero, Día 1-2)
  20260701000500_e3_m5_subscriptions_schema.sql        (M5)
  20260701000501_e3_m5_metrics_views.sql               (M5, depende de M3 §1.2)
```

Regla: **nadie edita una migración ya mergeada**; si hay que corregir algo, se agrega una migración nueva. Mismo patrón que `database/e2_*.sql` + `supabase/migrations/2026062*` ya usado en E2.

---

## 3. Orden lógico de implementación (qué se hace primero y por qué)

No hay una cadena estrictamente secuencial entre los 5 módulos — ese es el punto del diseño — pero **dentro de cada módulo** sí hay orden, y hay 2 hitos cross-módulo:

```
Día 1-2   [TODOS] Setup de branch, lectura de contratos, redacción de docs/e3-contracts.md
          [M3] migración `centers` (solo esquema) ----┐
          [M4] migración `audit_logs` + helper ---------┤--> publicados, no bloquean al resto
Día 2-10  [M1] Refactor wizard + edición de pasos (aislado, sin dependencias)
          [M2] Google Sign-In → Apple Sign-In → hardening sesión (aislado)
          [M3] CRUD centros completo + asociar especialistas + tablero admin
          [M4] Instrumentar audit log en M3/M4 propios + panel de lectura + RBAC backend audit
          [M5] Planes/suscripciones (sin dependencia) → métricas por centro (consume M3 desde Día 3+)
Día 10-12 Integración semanal #1 (ver §9), smoke test cruzado
Día 12-18 Hardening, accesibilidad, performance, tests E2E, documentación final
Día 18-20 Integración final, demo, entrega
```

Estimación total: **~20 días hábiles** con 5 personas en paralelo (1 módulo = ~1 persona ≈ 15-18 días-persona de trabajo efectivo por módulo, ver desglose en §5).

---

## 4. Desglose por módulo

### M1 — Rutinas Avanzadas & Performance
**Cubre:** E3-RNF-01, E3-RF-01
**Archivos propios:** `app/routine/*` (Create, Step2-6, Add-step, routine-edit, success), `hooks/useRoutine.ts`, `services/routines.ts`, `backend/src/modules/routines/*`, `types/routine.ts`.
**No toca:** nada fuera de esta lista (si necesita un dato de auditoría, llama al helper de M4 sin importar su lógica interna).

| Tarea | Detalle | Esfuerzo |
|---|---|---|
| T1.1 Perfilar wizard actual | Medir tiempo real de transición entre Step2↔Step6 con flipper/perf hooks de React Native; identificar causa (re-render completo, fetch síncrono, animación bloqueante) | 1 día |
| T1.2 Refactor de estado del wizard | Mover estado del wizard a un solo `useReducer` o context local (evitar prop drilling y re-renders en cascada entre Steps); memoizar componentes pesados (`RoutineStepCard`, `ProductSelector`) | 2 días |
| T1.3 Navegación optimista | Cambiar de paso debe sentirse instantáneo: transición visual sin esperar respuesta de red; persistir en backend de forma async/debounced, no bloqueante | 2 días |
| T1.4 Medición automatizada de performance | Test de performance (puede ser un script con `performance.now()` envuelto en un test de integración o un benchmark manual documentado) que falle si el cambio de paso percibido supera 100ms en dispositivo de referencia | 1 día |
| T1.5 RF-01: editar pasos de rutina ya creada | Extender `routine-edit.tsx`: agregar paso nuevo a rutina existente (ya existe `Add-step.tsx` para creación, reusar componente), editar nombre/orden de paso existente, eliminar paso existente con confirmación | 3 días |
| T1.6 Backend: endpoints de edición de pasos | `PATCH /api/routines/:id/steps/:stepId`, `POST /api/routines/:id/steps`, `DELETE /api/routines/:id/steps/:stepId` en `routines.controller/service/repository`; validar que si la rutina fue `assigned_by` un especialista, el cliente no pueda editar estructura (RN-E2-10, ya documentado en E2 — confirmar que sigue cumpliéndose con los nuevos endpoints) | 2 días |
| T1.7 Integración con auditoría | Cada edición de pasos llama a `recordAuditLog` (contrato M4) | 0.5 día |
| T1.8 Tests | Unit (service/repository en español, estilo `routines.service.test.ts`), integración de wizard (RTL/Testing Library para RN si está configurado, o snapshot + interaction tests), medición de performance documentada | 2 días |
| T1.9 Accesibilidad del wizard | Labels de `accessibilityLabel` en steppers, foco de teclado/lector en cada paso, contraste de `Stepper.tsx` y botones de navegación | 1 día |
| T1.10 Documentación | Actualizar `docs/division-modulos.md` (sección Integrante 2) y crear `agents/skills/e3-routine-wizard-perf/SKILL.md` | 0.5 día |

**Total estimado M1:** ~15 días-persona.

**Criterios de aceptación:**
- Transición entre pasos del wizard medida en <100ms percibidos (documentar metodología y resultado en el PR).
- Se puede agregar, editar y eliminar pasos de una rutina ya creada (propia o asignada, respetando permisos).
- Tests unitarios e de integración en verde; cobertura del módulo no baja respecto al baseline de E2.
- 0 regresiones en flujo de creación de rutina (E1/E2).

---

### M2 — Identidad Federada & Sesión
**Cubre:** E3-RF-02 + hardening de auth (deuda técnica de `docs/next-steps.md`: refresh de token, auth guard global) + notificaciones en tiempo real (extensión del módulo de notificaciones que ya posee, ver `docs/division-modulos.md` — Integrante 5)
**Archivos propios:** `app/(auth)/*`, `app/_layout.tsx` (punto de extensión documentado, ver abajo), `services/auth.ts`, `services/notifications.ts`, `app/notifications.tsx`, `hooks/useHasUnreadNotifications.ts`, `backend/src/modules/auth/*`, `backend/src/middlewares/auth.middleware.ts` (punto de extensión).
**Nota:** el paquete `@react-native-google-signin/google-signin` ya está instalado en `package.json` — confirmar si ya hay wiring parcial en `services/auth.ts` antes de empezar (evitar duplicar).

| Tarea | Detalle | Esfuerzo |
|---|---|---|
| T2.1 Auditar estado actual de Google Sign-In | `next-steps.md` dice "Google" ya implementado parcialmente — confirmar si es login social real o solo botón. Documentar gap real. | 0.5 día |
| T2.2 Completar Google Sign-In (Android + iOS) | Configurar OAuth client IDs, flujo nativo con el SDK ya instalado, intercambio de token con Supabase Auth (`signInWithIdToken`) | 2 días |
| T2.3 Apple Sign-In (solo iOS) | `expo-apple-authentication`, flujo nativo, intercambio con Supabase Auth; gating de UI: el botón solo aparece en iOS | 2 días |
| T2.4 Vinculación de identidades | Si un usuario ya existe por email y luego usa Google/Apple con el mismo email, no duplicar perfil (mismo criterio que RN de "Autenticación social" en la tabla de excepciones del documento de alcance) | 1.5 días |
| T2.5 Refresh de token automático | Resolver punto pendiente de `next-steps.md` #7: interceptor en `services/api/client.ts` que detecte 401 por token expirado y refresque sesión con Supabase antes de reintentar | 2 días |
| T2.6 Auth guard global en navegación | Resolver punto pendiente de `next-steps.md` #3: en `app/_layout.tsx`, redirigir a `/login` si no hay sesión y la ruta es protegida — **este es el único archivo compartido que M2 toca**, debe coordinarse explícitamente con el resto (ver Punto de extensión abajo) | 1.5 días |
| T2.7 Backend: validar `id_token` de Google/Apple | Si se requiere validación adicional server-side (más allá de lo que valida Supabase), agregar en `auth.service.ts` | 1 día |
| T2.8 Manejo de errores de excepción ya definidos | Implementar exactamente la fila "Autenticación social" de la tabla de excepciones del documento de alcance: token ausente → 400, token inválido → 401, email duplicado con otro proveedor → mensaje claro sin duplicar perfil | 1 día |
| T2.9 Tests | Unit de `auth.service`, mocks de Supabase `signInWithIdToken`, tests de `requireRole.middleware` sin romper (ya existen en `backend/src/middlewares/tests/`) | 1.5 días |
| T2.10 Accesibilidad | Botones de Google/Apple con `accessibilityRole="button"` y `accessibilityLabel` descriptivo, tamaño táctil mínimo 44x44 | 0.5 día |
| T2.11 **Notificaciones en tiempo real** | El centro de notificaciones (`app/notifications.tsx`) y el badge (`useHasUnreadNotifications.ts`) hoy requieren recargar la app para reflejar notificaciones nuevas. Suscribir un canal de Supabase Realtime sobre `notification_history` (mismo patrón ya probado en `database/e5_chat_messages_media_realtime.sql` para el chat) para que la lista y el badge se actualicen automáticamente al llegar una notificación, sin recarga ni pull-to-refresh manual | 2 días |
| T2.12 Manejo de reconexión del canal realtime | Resuscribir el canal al volver del background / recuperar conectividad, y degradar con gracia (fallback a fetch normal) si Realtime no está disponible — no debe romper el flujo principal (mismo criterio de tolerancia a fallos que el resto de RF-12/notificaciones) | 1 día |
| T2.13 Documentación | `agents/skills/e3-federated-auth/SKILL.md`, actualizar `docs/env.md` con nuevas env vars (Google client ID, Apple service ID); documentar el patrón de suscripción realtime reutilizable para otros módulos | 0.5 día |

**Total estimado M2:** ~17 días-persona.

**Punto de extensión compartido — `app/_layout.tsx`:**
M2 es el único módulo autorizado a modificar este archivo en E3 (agrega el guard de sesión). Si M3/M4/M5 necesitan agregar una ruta protegida nueva, **no tocan la lógica del guard**, solo agregan su ruta a la lista de rutas protegidas que M2 expone como constante en `constants/routes.ts` (ya existe ese archivo y es responsabilidad compartida según `docs/division-modulos.md`).

**Criterios de aceptación:**
- Login con Google funciona end-to-end en Android e iOS, sin duplicar perfiles.
- Login con Apple funciona end-to-end en iOS.
- Sesión expirada se refresca automáticamente sin desloguear al usuario en uso normal.
- Navegar a una ruta protegida sin sesión redirige a `/login`.
- Una notificación nueva aparece en el badge y en el centro de notificaciones **sin recargar la app ni hacer pull-to-refresh**, verificado con dos sesiones simultáneas (una que dispara la notificación, otra que la recibe en vivo).
- Si el canal realtime se cae, la app sigue funcionando con el fetch tradicional (degradación sin romper el flujo principal).
- Tests en verde, 0 regresiones en login/registro por email existente.

---

### M3 — Centros Estéticos & Tablero Admin
**Cubre:** E3-RF-03, E3-RF-04
**Archivos propios (nuevos):** `app/(tabs-admin)/centers.tsx`, `app/(tabs-admin)/metrics.tsx` (vista básica, métricas avanzadas las completa M5), `backend/src/modules/centers/*`, extiende `backend/src/modules/admin/*` (ya existe de E2: alta/baja de especialistas — **no reescribir, extender**).
**Migración propia que se publica primero (Día 1-2):** `centers` + FK nullable en `specialist_profiles`.

| Tarea | Detalle | Esfuerzo |
|---|---|---|
| T3.1 Diseñar esquema jerárquico de centros | `centers(id, name, address, phone, created_at, updated_at)`, `center_admins(user_id, center_id, role)` para admins con scope, FK `specialist_profiles.center_id` | 1 día |
| T3.2 Migración + RLS de centros | Política: un `center_admin` solo lee/escribe especialistas de su propio `center_id`; un futuro `platform_admin` (definir si se necesita, documentado en contrato §1.3) ve todos | 1.5 días |
| T3.3 Backend CRUD de centros | `centers.routes/controller/service/repository`: alta, edición, baja (soft-delete recomendado para no romper FK histórica), listado | 2 días |
| T3.4 Asociar especialista a centro | Extender `admin.service.ts` existente (E2) para que al aprobar un especialista (`updateSpecialistStatus`) se pueda asignar `center_id`; o endpoint separado `PATCH /api/admin/specialists/:id/center` | 1.5 días |
| T3.5 Tablero admin — alta/baja de especialistas | **Ya implementado en E2** (`admin.controller/service` + `(tabs-admin)/index.tsx`) — E3 solo agrega la dimensión "centro" a la UI existente, no reconstruye el flujo. Verificar y documentar qué falta literalmente. | 1 día |
| T3.6 Tablero admin — métricas globales (vista básica) | Cantidad de especialistas activos/pendientes, cantidad de clientes, todo filtrable por centro — la agregación pesada y los reportes exportables son responsabilidad de M5 (RF-07); M3 expone solo los contadores simples en el tablero | 2 días |
| T3.7 UI de gestión de centros | Pantalla de alta/edición/listado de centros, selector de centro al gestionar especialistas | 2.5 días |
| T3.8 Integración con auditoría | Alta/baja/edición de centro y reasignación de especialista a centro llaman a `recordAuditLog` (contrato M4) | 0.5 día |
| T3.9 Tests | Unit de `centers.service/repository`, tests de RLS por centro (puede ser test de integración contra Supabase local), tests de controller para nuevo endpoint de asignación | 2 días |
| T3.10 Accesibilidad | Tablero con tablas/listas navegables por teclado (web) y lector de pantalla (mobile), contraste en badges de estado (pendiente/verificado/rechazado) | 1 día |
| T3.11 Documentación | `agents/skills/e3-centers-admin/SKILL.md`, publicar el contrato de esquema de §1.3 punto 3 en `docs/e3-contracts.md` | 0.5 día |

**Total estimado M3:** ~15.5 días-persona.

**Criterios de aceptación:**
- Se puede crear, editar y dar de baja un centro estético.
- Un especialista puede asociarse a un centro desde el panel admin.
- El tablero admin filtra especialistas/clientes por centro.
- Acciones administrativas quedan auditadas (verificable en el panel de M4).
- RLS impide que un `center_admin` vea datos de otro centro.

---

### M4 — Auditoría & Seguridad Transversal
**Cubre:** E3-RF-06 + RNF-Seguridad (RBAC estricto en backend, trazabilidad, revisión de cifrado en tránsito)
**Archivos propios:** `backend/src/modules/audit/*` (nuevo), `app/(tabs-admin)/audit-log.tsx` (nuevo, panel de lectura), `backend/src/middlewares/` (solo lectura/revisión, no reescritura — ver Punto de extensión).
**Migración propia que se publica primero (Día 1-2):** `audit_logs(id, actor_id, actor_role, action, entity, entity_id, before jsonb, after jsonb, metadata jsonb, created_at)`.

| Tarea | Detalle | Esfuerzo |
|---|---|---|
| T4.1 Diseñar y migrar `audit_logs` | Índices por `entity, entity_id` y por `actor_id, created_at` para consultas rápidas de "quién modificó qué rutina y cuándo" (RNF-Seguridad explícito del documento de alcance) | 1 día |
| T4.2 Helper `recordAuditLog` | Implementar el contrato de §1.3, `fire-and-forget` (no debe romper el flujo principal si falla, mismo patrón que `notificationsService.sendToUser`) | 1.5 días |
| T4.3 Publicar el contrato como paquete interno | Exportar desde `backend/src/modules/audit/audit.service.ts`, documentar import (`import { recordAuditLog } from '../audit/audit.service'`) para que M1/M3/M5 lo consuman sin acoplarse a la implementación interna | 0.5 día |
| T4.4 Backend: endpoints de lectura de auditoría | `GET /api/admin/audit-log?entity=&entityId=&actorId=&from=&to=` con paginación, protegido por rol admin | 2 días |
| T4.5 Panel de lectura en frontend | Tabla filtrable de eventos de auditoría en `(tabs-admin)/audit-log.tsx`, reusando componentes de `Card.tsx` y patrones del tablero existente | 2 días |
| T4.6 Auditoría de eventos propios de auth | Login exitoso/fallido, cambio de rol → coordinar con M2 para instrumentar `auth.service.ts` (M2 hace la llamada, M4 solo provee el contrato — sin tocar el código de M2) | 1 día |
| T4.7 Revisión de RBAC backend estricto | Auditar **todas** las rutas nuevas de E3 (M1/M2/M3/M5) para confirmar que usan `requireRole.middleware.ts` correctamente y que la validación de rol nunca depende solo del frontend (RN-E2-23 ya documentada en E2, extender el checklist a E3) | 2 días |
| T4.8 Revisión de cifrado en tránsito | Confirmar HTTPS end-to-end en backend desplegado, headers de seguridad (helmet o equivalente si no está), revisión de que tokens/documentos firmados (`createSignedUrl`, ya usado en `admin.service.ts`) sigan el mismo patrón en endpoints nuevos | 1 día |
| T4.9 Revisión de exposición de errores | Confirmar que `error.middleware.ts` sigue sin filtrar stack traces al cliente (RN-E2-24) en los módulos nuevos | 0.5 día |
| T4.10 Tests | Unit de `audit.service`, test de integración de que una acción en M1/M3/M5 efectivamente genera un registro (usar mocks/spies sobre el helper, no testear la lógica interna de los otros módulos) | 2 días |
| T4.11 Accesibilidad del panel | Tabla de auditoría con headers semánticos, filtros con labels, paginación accesible por teclado | 0.5 día |
| T4.12 Documentación | `agents/skills/e3-audit-security/SKILL.md` con el checklist de seguridad para que cualquier módulo futuro lo reutilice; checklist de seguridad consolidado va también en §7 de este documento | 1 día |

**Total estimado M4:** ~15.5 días-persona.

**Punto de extensión compartido:** M4 **lee** código de los middlewares existentes para auditar, pero solo modifica `auth.middleware.ts`/`requireRole.middleware.ts` si encuentra un bug de seguridad real — en ese caso, el cambio se reporta y coordina con M2 (dueño histórico de auth) antes de mergear.

**Criterios de aceptación:**
- Toda acción de alta/edición/baja sobre rutinas asignadas, especialistas, centros y suscripciones queda registrada con actor, timestamp, entidad y diff antes/después.
- Panel admin permite filtrar auditoría por usuario, entidad y rango de fechas.
- Checklist de seguridad (§7) ejecutado y documentado para los 5 módulos, no solo para M4.
- Ninguna ruta nueva de E3 depende solo de validación de rol en frontend.

---

### M5 — Planes/Suscripciones & Métricas Globales
**Cubre:** E3-RF-05, E3-RF-07
**Archivos propios:** `app/(tabs-admin)/plans.tsx`, `app/(tabs-admin)/reports.tsx`, `backend/src/modules/subscriptions/*`, `backend/src/modules/reports/*`.
**Dependencia de datos (no bloqueante, ver §1.2):** consume `centers.id/name` de M3 desde el Día 3 en adelante; si M3 se retrasa, M5 trabaja contra datos seed/mock de centros hasta que la tabla real esté disponible (mismo `centers` table, solo placeholder de filas).

| Tarea | Detalle | Esfuerzo |
|---|---|---|
| T5.1 Diseñar esquema de planes/suscripciones | `subscription_plans(id, name, price, features jsonb, level)`, `subscriptions(id, owner_type 'user'|'center', owner_id, plan_id, status, started_at, ends_at)` | 1.5 días |
| T5.2 Migración + seed de planes base | Insertar 2-3 planes de ejemplo (básico/premium) vía seed script (estilo `database/dev_center_admin_seed.sql`) | 1 día |
| T5.3 Backend CRUD de planes (admin) | Alta/edición/baja de `subscription_plans`, asignar/cambiar plan de un usuario o centro | 2.5 días |
| T5.4 Frontend de gestión de planes | Pantalla admin para listar/crear/editar planes y asignar suscripción a un cliente o centro | 2.5 días |
| T5.5 Dejar explícito que el *enforcement* de acceso por plan queda fuera de alcance de E3 | Documentar en el código y en `docs/e3-contracts.md` que `subscriptions.status` es informativo en esta entrega (gating real es backlog post-E3), para que nadie intente bloquear features de otros módulos en base a esto | 0.5 día |
| T5.6 Backend: agregaciones de métricas globales | Vistas o queries agregadas: cantidad de clientes registrados, especialistas activos, consultas realizadas (de `chat` module), rutinas asignadas, % cumplimiento promedio (reusar lógica de `progress` module si aplica) — todo filtrable por centro usando `specialist_profiles.center_id` de M3 | 3 días |
| T5.7 Endpoint de reportes por centro | `GET /api/admin/reports?centerId=&from=&to=` con los indicadores de T5.6 | 1.5 días |
| T5.8 Frontend de reportes | Pantalla con tarjetas de métricas + tabla/lista por centro, reusar `StatCard.tsx`/`StatsSection.tsx` ya existentes en `components/progress/stats/` (no reinventar componentes de estadísticas) | 2.5 días |
| T5.9 Integración con auditoría | Alta/edición/baja de plan y de suscripción llaman a `recordAuditLog` (contrato M4) | 0.5 día |
| T5.10 Tests | Unit de `subscriptions.service`, `reports.service` (queries agregadas con datos mockeados), tests de controller | 2.5 días |
| T5.11 Accesibilidad | Gráficos/tarjetas de métricas con texto alternativo y no solo color para indicar estado (cumplimiento alto/bajo) | 1 día |
| T5.12 Documentación | `agents/skills/e3-subscriptions-reports/SKILL.md` | 0.5 día |

**Total estimado M5:** ~19.5 días-persona (el módulo más pesado en agregaciones; si el equipo lo ve desbalanceado contra M1/M2, mover T5.6-T5.8 — la parte de reportes — a sprint de integración compartido entre M3 y M5).

**Criterios de aceptación:**
- Admin puede crear y editar planes, y asignarlos a usuarios o centros.
- Reporte por centro muestra clientes, especialistas activos, consultas, rutinas asignadas y cumplimiento promedio, correcto contra datos de prueba conocidos.
- Ninguna funcionalidad de otros módulos quedó bloqueada por estado de suscripción (verificado explícitamente en code review).

---

## 5. Resumen de estimaciones

| Módulo | Días-persona | Riesgo de desvío |
|---|---|---|
| M1 — Rutinas & Performance | ~15 | Medio (medir "100ms percibidos" es subjetivo, definir metodología temprano) |
| M2 — Identidad Federada | ~17 | Alto (dependiente de configuración externa: Google Cloud Console, Apple Developer — no depende del equipo) |
| M3 — Centros & Tablero Admin | ~15.5 | Bajo |
| M4 — Auditoría & Seguridad | ~15.5 | Medio (revisar RBAC de los otros 4 módulos requiere que esos módulos tengan avance) |
| M5 — Planes & Métricas | ~19.5 | Alto (depende de datos de varios módulos; considerar recortar alcance de reportes si hace falta) |

Con 5 personas trabajando 1 módulo cada una a tiempo completo, calendario realista: **~3.5-4 semanas** incluyendo integración (M5 y M2 son los cuellos de botella de calendario, no de bloqueo entre pares).

---

## 6. Definición de Hecho (DoD) transversal — aplica a los 5 módulos

Ningún módulo se considera terminado si no cumple **todo** lo siguiente, sin excepción:

1. **Funcional:** todos los criterios de aceptación de su sección (§4) cumplidos y verificados manualmente al menos una vez.
2. **Testing integrado, no al final:** cada tarea de código en §4 incluye su test en el mismo PR que el código (unit mínimo; integración donde aplique). No se acepta "lo testeo después".
3. **Documentación viva:** `agents/skills/e3-<modulo>/SKILL.md` actualizado en el mismo PR que cambia el comportamiento que describe — no se documenta al final del sprint.
4. **Accesibilidad (checklist §8) cumplido.**
5. **Seguridad (checklist §7) cumplido.**
6. **Rendimiento:** pantallas propias cargan <1.5s con datos de prueba realistas; llamadas a backend propias <2s bajo latencia simulada de 100ms (usar throttling de red en el emulador/dispositivo para verificar, no asumir).
7. **Responsive:** UI propia verificada en al menos 2 tamaños de pantalla (teléfono chico y tablet) o el equivalente de ancho en web si aplica.
8. **CI en verde:** `npm test`, `npm run typecheck`, `npm run lint` sin errores nuevos.
9. **`README.md` actualizado:** ningún módulo se da por terminado, y ningún PR llega a `main`, si el README no refleja el estado real del proyecto tras el cambio (ver regla completa en §10.1).

---

## 7. Checklist de ciberseguridad por componente (usar en cada PR)

- [ ] Toda ruta backend nueva pasa por `auth.middleware.ts` salvo que sea explícitamente pública (documentar por qué).
- [ ] Toda ruta que requiere rol específico usa `requireRole.middleware.ts` — la validación de rol **nunca** depende solo de ocultar un botón en frontend.
- [ ] Ninguna respuesta de error expone stack trace, query SQL o detalle interno (revisar contra `error.middleware.ts`).
- [ ] Si el endpoint maneja archivos (docs de especialista, imágenes), usa URLs firmadas con expiración corta, igual que `admin.service.ts` ya hace — nunca URLs públicas permanentes.
- [ ] Si el endpoint escribe datos sensibles o de negocio crítico, llama a `recordAuditLog` (contrato M4).
- [ ] Inputs validados y normalizados en el `service`, no confiar en lo que llega del `controller` sin chequear (mismo patrón que `normalizeLicenseStatus`/`normalizeRejectionReason` en `admin.service.ts`).
- [ ] No se commitean secrets; nuevas env vars documentadas en `docs/env.md` y agregadas a `.env.example`/`backend/.env.example`.
- [ ] RLS de Supabase revisada para cualquier tabla nueva (recordar que `next-steps.md` señala que RLS general del proyecto sigue pendiente de activar — cada módulo de E3 debe activar RLS para **sus propias tablas nuevas**, sin esperar a que se resuelva la deuda global).
- [ ] Si el módulo toca autenticación, confirmar que tokens no quedan logueados en consola/analytics.

---

## 8. Checklist de accesibilidad por componente (usar en cada PR)

- [ ] Todo elemento interactivo (botón, input, tab) tiene `accessibilityLabel`/`accessibilityRole` apropiado.
- [ ] Tamaño táctil mínimo 44x44 pt en botones e íconos accionables.
- [ ] Contraste de texto sobre fondo cumple mínimo WCAG AA (4.5:1 texto normal, 3:1 texto grande) — verificar contra `constants/colors.ts`, no introducir colores nuevos sin chequear contraste.
- [ ] Estados de error/éxito no se comunican solo por color (agregar ícono o texto).
- [ ] Formularios nuevos muestran mensajes de validación visibles y asociados al campo (no solo un toast genérico) — esto también resuelve la deuda técnica #5 de `next-steps.md` para los módulos que la toquen.
- [ ] Navegación por teclado funcional en las vistas que corran en web (tablero admin).
- [ ] Textos no truncados sin alternativa de lectura completa (tooltips/expand) en pantallas chicas.

---

## 9. Estrategia de integración (cómo y cuándo convergen los 5 módulos)

1. **Branches:** cada módulo trabaja en `feature/e3-m<n>-<slug>` (ej. `feature/e3-m1-routine-wizard-perf`), igual convención que `feature/e2-push-notifications` usado en E2.
2. **Integración semanal (no solo al final):** cada viernes, los 5 branches mergean a `integration/e3` vía PR. Se corre la suite completa (`npm test` raíz + backend) y un smoke manual de 15-20 min cubriendo: login federado (M2) → crear/editar rutina (M1) → admin aprueba especialista y lo asocia a un centro (M3) → acción queda en auditoría (M4) → aparece en el reporte del centro (M5). Este smoke es la prueba de que la partición no generó deuda de integración oculta.
3. **Quién resuelve conflictos:** si dos módulos tocan el mismo archivo compartido (`constants/routes.ts`, `constants/colors.ts`, `app/(tabs-admin)/_layout.tsx` al agregar tabs nuevas), el merge lo resuelve quien lo detecta primero y notifica al otro dueño — nunca se sobreescribe en silencio.
4. **Congelamiento de contratos:** una vez publicados los contratos de §1.3 (Día 2), cambiarlos requiere acuerdo explícito de los módulos que los consumen, no solo del dueño.
5. **Entrega final:** integración el día 18-19, regresión completa de E1+E2+E3 (no solo E3) antes de la demo, ya que varios módulos tocan código histórico (rutinas, auth, admin).

---

## 10. Checklist de PR (aplicar a cada Pull Request de E3)

- [ ] Toca solo archivos de mi módulo, o un punto de extensión documentado en §4.
- [ ] Tests incluidos en el mismo PR, no en uno posterior.
- [ ] `SKILL.md` de mi módulo actualizado si cambió el comportamiento que describe.
- [ ] **`README.md` actualizado si este PR cambia algo que el README describe** (ver regla obligatoria abajo).
- [ ] Checklist de seguridad (§7) revisado.
- [ ] Checklist de accesibilidad (§8) revisado.
- [ ] `npm test`, `npm run typecheck`, `npm run lint` en verde.
- [ ] Si agrego una tabla/columna nueva: migración con prefijo `e3_m<n>_` y RLS para esa tabla, y la fila correspondiente completada en `docs/e3-supabase-security.md` (§12).
- [ ] Si mi módulo emite eventos relevantes para negocio: llama a `recordAuditLog`.
- [ ] Si esta es la última tarea de mi módulo: agregué mi entrada a `CHANGELOG.md` (§14.1) y exporté mi historial de conversaciones con el agente para el `.cm` final (§14.2).

### 10.1 Regla obligatoria: `README.md` actualizado en cada push a `main`

El `README.md` de la raíz **no puede quedar desactualizado nunca**. Ningún PR de E3 se mergea a `main` sin que el `README.md` refleje el estado real del proyecto a esa fecha. Esto aplica a los 5 módulos por igual, no es responsabilidad de una sola persona.

- **Qué actualizar:** stack/dependencias nuevas (ej. `expo-apple-authentication`), variables de entorno nuevas (Google client ID, Apple service ID — coordinar con `docs/env.md`), comandos nuevos de `package.json` si se agregan, estructura de carpetas si se crean módulos nuevos (`backend/src/modules/centers`, `backend/src/modules/audit`, `backend/src/modules/subscriptions`), y la sección de "estado actual"/funcionalidades si el README la tiene (mismo criterio que ya usa `docs/next-steps.md` para no quedar obsoleto).
- **Cuándo:** en el mismo PR donde se introduce el cambio que vuelve obsoleto al README — no en un PR aparte "de documentación" al final. Si el cambio no afecta nada de lo que el README describe, no hace falta tocarlo, pero el PR debe decirlo explícitamente (ej. en la descripción: "No aplica cambio de README").
- **Quién lo verifica:** quien aprueba el PR confirma que el punto del checklist (§10) fue revisado, no solo tildado. Si el reviewer detecta que el README quedó desactualizado, bloquea el merge hasta que se corrija — mismo criterio que un test roto.
- **Enforcement en CI:** agregar al pipeline un paso simple que falle si hay cambios en `app/`, `backend/src/`, `package.json` o `supabase/migrations/` **sin** un cambio correspondiente en `README.md` dentro del mismo PR (un diff-check, no necesita ser inteligente: si tocaste código y no tocaste el README, el PR se marca para revisión manual obligatoria antes de poder mergear a `main`). Esto evita que la regla dependa solo de la disciplina individual.
- **Responsable de integración (§9):** en cada integración semanal a `integration/e3`, y obligatoriamente antes de cualquier merge a `main`, se revisa que el README compile como guía real de "cómo levantar el proyecto hoy" (instalar, correr, variables de entorno) — no solo como changelog de features.

---

## 11. Riesgos técnicos y mitigación

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Configuración de Google/Apple Sign-In bloqueada por credenciales externas (Apple Developer account, Google Cloud project) fuera del control del equipo | Alta | Alto (bloquea M2) | Resolver acceso a las consolas de Google/Apple en Día 1, en paralelo a T2.1; si no hay cuenta de Apple Developer disponible, hacer Apple Sign-In en modo mock/feature-flag y dejarlo documentado como bloqueado por infraestructura externa, no por el equipo |
| "100ms percibidos" (RNF-01) es difícil de medir objetivamente en RN/Expo | Media | Medio | Definir metodología de medición en T1.1 antes de optimizar (de lo contrario no hay forma de declarar "hecho"); usar tiempo entre tap y primer frame pintado, no tiempo de fetch completo |
| M5 (reportes) termina más tarde que M3 (centros) y bloquea su propio módulo | Media | Medio | M5 arranca con datos seed de centros desde Día 1 (no espera a M3 real), conecta a datos reales cuando M3 publica el CRUD completo — el contrato de esquema (§1.3) ya alcanza |
| RLS pendiente desde E2 (deuda técnica conocida) se vuelve más urgente al sumar `audit_logs`, `centers`, `subscriptions` con datos sensibles | Alta | Alto | Cada módulo de E3 activa RLS de sus tablas nuevas como parte de su propio DoD (§6), no como tarea separada al final — esto evita que la deuda de E1/E2 se herede a E3 |
| Conflictos de merge en archivos compartidos (`_layout.tsx`, `routes.ts`, `colors.ts`) | Media | Bajo | Puntos de extensión documentados explícitamente por módulo (§4); integración semanal detecta esto temprano, no en el día 19 |
| Auditoría (M4) agrega latencia a operaciones de escritura de otros módulos | Baja | Medio | `recordAuditLog` es fire-and-forget (no se espera su resultado antes de responder al cliente), mismo patrón ya validado con `notificationsService.sendToUser` en E2 |
| Agregaciones de métricas (M5) son lentas con datos reales crecientes | Media | Medio | Usar vistas materializadas o queries indexadas desde el diseño inicial (T5.6), no optimizar reactivamente; reusar el patrón de índices que `next-steps.md` ya señala como pendiente para todo el proyecto |

---

## 12. Reglas de seguridad de Supabase (obligatorias para E3)

`docs/next-steps.md` deja constancia de que el schema general del proyecto tiene RLS comentado/pendiente desde E1/E2. Para E3 esto **no es opcional**: cada tabla nueva creada por cualquier módulo debe nacer con RLS activado desde su propia migración. Esta sección es la referencia única de qué política le corresponde a cada tabla; cada dueño de módulo la completa con el detalle exacto en `docs/e3-supabase-security.md` (a crear, mismo formato que los `*_rls_policies.sql` ya existentes en `database/`) antes de cerrar su módulo.

| Tabla | Módulo dueño | Regla de RLS mínima |
|---|---|---|
| `centers` | M3 | Lectura: cualquier usuario autenticado (necesario para buscador de especialistas por centro). Escritura: solo `platform_admin` o `center_admin` del propio `center_id` (ver definición del rol en §1.3). |
| `center_admins` | M3 | Lectura/escritura: solo `platform_admin`; un `center_admin` puede leer su propia fila, nunca las de otro. |
| `specialist_profiles.center_id` (columna nueva) | M3 | Hereda las políticas ya existentes de `specialist_profiles_rls_policies.sql`; agregar regla explícita de que un `center_admin` solo puede actualizar el `center_id` de especialistas de su propio centro. |
| `audit_logs` | M4 | Escritura: únicamente vía `service_role` desde el backend (igual que el cron de notificaciones, nunca desde el cliente/anon key). Lectura: solo roles `specialist`/`center_admin` sobre eventos de su propio scope, y `platform_admin` sobre todo — **nunca exponer `audit_logs` completo a un cliente final**. |
| `subscription_plans` | M5 | Lectura: pública para usuarios autenticados (necesitan ver qué planes existen). Escritura: solo `platform_admin`. |
| `subscriptions` | M5 | Lectura/escritura: el propio `owner_id` (si `owner_type='user'`) o el `center_admin` del centro (si `owner_type='center'`); `platform_admin` ve todo. |
| `routine_steps` (edición, RF-01) | M1 | Hereda RLS de `routines`/`routine_steps` ya definida en `e2_schema.sql`; confirmar explícitamente que un cliente no puede hacer `UPDATE`/`DELETE` sobre pasos de una rutina con `assigned_by` distinto de `null` (RN-E2-10), ahora que existen endpoints de edición nuevos. |
| `notification_history` (consumo realtime, M2) | M2 | La suscripción Realtime debe respetar RLS: cada usuario solo puede suscribirse/leer sus propias notificaciones (`auth.uid() = user_id`); confirmar que el canal de Supabase Realtime no expone notificaciones de otros usuarios por error de filtro client-side. |

Reglas generales que aplican a **todas** las tablas nuevas de E3 (no solo a la tabla principal de cada módulo):

1. RLS **activado** (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`) desde la misma migración que crea la tabla — nunca en una migración posterior "para después".
2. Política por defecto **deny-all**; cada acceso permitido se declara explícitamente (mismo criterio que ya usan `e2_profiles_rls_policies.sql` y `specialist_profiles_rls_policies.sql`).
3. Ninguna tabla con datos sensibles (documentos de especialistas, auditoría, suscripciones con datos de pago si se llegan a sumar) se consulta desde el cliente con la `anon key`; solo el backend con `service_role` cuando la operación lo requiere (mismo patrón que `notification.job.ts` y `admin.service.ts` ya usan).
4. Si una tabla usa Supabase Storage (ej. documentos, imágenes), seguir el patrón ya validado en `database/specialist_docs_storage_policies.sql` / `database/product_images_storage_policies.sql`: bucket privado + URL firmada con expiración corta, nunca URL pública permanente.
5. Cada módulo agrega a `docs/e3-supabase-security.md` el SQL real de sus políticas (no solo la tabla de arriba), para que quede como referencia auditable — este archivo es el equivalente para E3 de lo que `database/*_rls_policies.sql` fue para E2.

---

## 13. Estándares de documentación de código (aplica a todo el equipo)

- **Inline comments:** solo para explicar *por qué*, no *qué* (el código ya dice qué hace). Mismo criterio que ya se ve en `admin.service.ts` (comentarios explicando recuperación de URLs firmadas, no narrando cada línea).
- **Docstrings/JSDoc:** obligatorios en funciones exportadas de `service.ts` y `repository.ts` que no sean autoexplicativas por nombre (ej. `recordAuditLog`, agregaciones de `reports.service.ts`).
- **Arquitectura:** cualquier decisión de diseño no trivial (ej. por qué `subscriptions.status` no hace enforcement todavía, por qué el guard de sesión vive en `_layout.tsx`) se documenta en `docs/e3-contracts.md` o en el `SKILL.md` del módulo, no solo en el mensaje de commit.
- **Tests como documentación:** nombres de test en español describiendo el comportamiento (estilo ya usado: `it('debería rechazar X cuando Y')`), igual que el resto del repo.

---

## 14. Entregables documentales finales (obligatorios, responsabilidad compartida)

Estos 3 entregables no son de un módulo en particular — son responsabilidad compartida de las 5 personas y se cierran recién al final, pero **se alimentan durante todo el desarrollo**, no se escriben de un día para el otro antes de entregar.

### 14.1 `CHANGELOG.md` con historial de las 3 entregas
El repo ya tiene `CHANGELOG.md` en la raíz (usado en E1/E2). Para el cierre de E3 debe quedar con una sección por entrega, en orden cronológico, con el detalle real de qué se construyó en cada una (no solo el título del RF):

```markdown
## Entrega 1
- RF-01 a RF-10: rutinas, productos, progreso, historial, cuestionario inicial, gestión de usuarios.
- ...

## Entrega 2
- RF-11 a RF-20: edición de usuario, notificaciones push, multi-rol, especialistas, chat, etc.
- Changelog de RF modificados (RF-01, RF-04, RF-09) documentado igual que en `alcance_e2`.

## Entrega 3
- E3-RNF-01, E3-RF-01 a E3-RF-07: ver detalle por módulo.
- Notificaciones en tiempo real (extensión no listada originalmente en el alcance de E3, agregada por necesidad de UX).
```
Cada módulo agrega su propia entrada a la sección "Entrega 3" en el mismo PR donde cierra su última tarea — no se redacta retroactivamente.

### 14.2 Archivo `.cm` final con todas las conversaciones de la entrega
Cada integrante exporta/consolida el historial completo de sus conversaciones con el agente (Claude Code/Codex/Cursor) usado durante E3 en un único archivo `.cm` por entrega (mismo criterio que el equipo ya viene usando en entregas anteriores para la trazabilidad del uso de IA). Checklist para este archivo:

- Incluye **todas** las sesiones de trabajo de los 5 módulos, no solo las del integrante que lo consolida — cada quien aporta su propio export antes del cierre.
- No se editan ni recortan las conversaciones para "verse mejor"; se entregan completas, en el orden en que ocurrieron.
- Se guarda en la raíz del repo o en `docs/` junto al resto de la documentación de la entrega, con nombre identificable (ej. `entrega3.cm` o el nombre que use la cátedra).
- Responsable de consolidación: se define entre el equipo, pero el plazo de entrega de cada export individual es el mismo que el de integración final (§9, día 18-19) — no se puede consolidar si llega tarde.

### 14.3 Documentación de reglas de seguridad de Supabase
No es un archivo nuevo aislado: es la consolidación de lo ya pedido en §12. `docs/e3-supabase-security.md` debe quedar, al cierre de la entrega, con:

- La tabla completa de §12 (RLS por tabla) actualizada con el detalle real implementado, no solo el plan.
- El SQL efectivo de cada política, igual de explícito que los archivos ya existentes (`database/e2_profiles_rls_policies.sql`, `database/specialist_profiles_rls_policies.sql`, etc.) — se puede linkear a la migración correspondiente en vez de duplicar el SQL si ya está versionado ahí.
- Una sección explícita confirmando el estado de la deuda histórica: si en E3 se terminó de activar RLS en las tablas de E1/E2 que estaban pendientes (`next-steps.md` #1), decirlo; si no, dejar constancia de cuáles quedan pendientes y por qué.

---

## 15. Para agentes de código (Claude Code / Codex / Cursor)

Si estás retomando este plan como agente autónomo:

1. Identificá tu módulo (M1-M5) según la tarea asignada.
2. Leé §0 completo antes de tocar código.
3. Leé tu sección en §4 completa, no solo la tabla de tareas.
4. Antes de programar lógica de negocio que dependa de otro módulo (M5 sobre M3, cualquiera sobre M4), verificá si el contrato de §1.3 ya está publicado en `docs/e3-contracts.md`. Si no existe ese archivo todavía, creálo vos mismo con tu parte del contrato y avisá explícitamente en el PR que los otros módulos lo necesitan.
5. No asumas que otro módulo ya implementó algo — verificá en el código real (`grep`/`find` en el repo) antes de duplicar lógica.
6. Cada vez que termines una tarea de la tabla de tu módulo, actualizá `agents/skills/e3-<tu-modulo>/SKILL.md` en el mismo commit.
7. Si tu tarea crea una tabla nueva, completá tu fila correspondiente en §12 con el SQL real, en `docs/e3-supabase-security.md`.
8. Agregá tu entrada a `CHANGELOG.md` (§14.1) en el mismo PR donde cerrás tu última tarea del módulo.
9. Corré §10 (checklist de PR) como lista de verificación final antes de abrir el Pull Request.
