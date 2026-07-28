# CHANGELOG

Este documento registra los principales cambios realizados en EOS Skincare App durante las tres entregas del Trabajo Integrador de Desarrollo de Aplicaciones Moviles 2026.

El historial fue consolidado a partir del codigo actual en `main`, migraciones, tests, documentacion y commits/branches del repositorio. No se marcan como terminadas funcionalidades que solo aparecen en planes o documentos de alcance.

## Entrega 1 - MVP basico

### Funcionalidades incorporadas
- Registro, login por email/password, recuperacion/cambio de contrasena y persistencia de sesion local.
- Onboarding inicial con landing, registro, diagnostico de piel y quiz.
- Cuestionario inicial de tipo de piel persistido en `skin_profiles` y consulta del perfil de piel.
- Navegacion principal por tabs para inicio, rutina, productos, progreso y perfil.
- Creacion y gestion de rutinas de skincare con pasos ordenados.
- Visualizacion de rutina diaria y marcado/desmarcado de pasos completados.
- Asociacion de productos a pasos de rutina mediante `routine_step_products`.
- CRUD de productos con categoria, marca, notas e imagenes en Supabase Storage.
- Historial de progreso por fecha, resumen semanal/mensual, estadisticas y rachas.
- Recordatorios locales con `expo-notifications` desde `services/notifications.ts`.

### Backend y datos
- Backend Express + TypeScript con modulos `auth`, `quiz`, `routines`, `products`, `progress` y `profile`.
- Esquema inicial para `profiles`, `skin_profiles`, `routines`, `routine_steps`, `products`, `routine_step_products`, `routine_logs` y `routine_step_logs`.
- Integracion con Supabase Auth, PostgreSQL y Storage para imagenes de productos.
- Tests iniciales para productos, rutinas, progreso, auth, quiz y middlewares.

### Correcciones y decisiones relevantes
- Se corrigieron flujos de carga y edicion de imagenes de productos en React Native.
- Se ajusto el calculo de rachas y el historial para contemplar progreso diario real.
- Google Sign-In no se considera completado end-to-end en esta entrega: existe soporte backend posterior para `/api/auth/google`, pero el frontend actual conserva botones sociales sin `onPress`.

### Estado de la entrega
- MVP funcional para usuarios finales: rutinas, productos, quiz, progreso, historial y recordatorios locales.
- RLS general del esquema inicial quedo comentada o parcial en migraciones iniciales.

## Entrega 2 - Escalado funcional

### Funcionalidades incorporadas
- Roles `user`, `specialist` y `center_admin` persistidos en `profiles.role`.
- Middleware `authenticate` con JWT real de Supabase y `requireRole` para restringir rutas por rol.
- Navegacion diferenciada: usuario, especialista verificado, especialista pendiente/rechazado y administrador.
- Registro de especialistas con especialidad, matricula, foto de DNI y foto de titulo.
- Validacion administrativa de especialistas con estados `pending`, `verified` y `rejected`, motivo de rechazo y signed URLs para documentos privados.
- Buscador/directorio de especialistas verificados con filtro por nombre/especialidad.
- Vinculacion y desvinculacion cliente-especialista con relacion activa unica.
- Panel de especialista con pacientes vinculados, detalle de piel, rutinas e historial.
- Asignacion de rutinas por especialista a pacientes activos, con `assigned_by`.
- Rutinas asignadas visibles para el cliente, con restriccion para que el cliente no edite su estructura.
- Chat cliente-especialista con historial, lectura de mensajes y Supabase Realtime.
- Soporte de imagenes en chat mediante bucket privado `chat-media`.
- Notificaciones push remotas: registro/desregistro de tokens, envio interno con `notificationsService.sendToUser()` y cron de recordatorios.
- Centro de notificaciones in-app con historial, tabs Todas/No leidas, agrupacion por dia y marcado como leida.
- Campanita con indicador de no leidas y cache compartida de 30 segundos.
- Pantalla de configuracion con edicion de perfil, cambio de contrasena, toggle de notificaciones y re-test de piel.

### Cambios sobre funcionalidades de Entrega 1
- Las rutinas pasaron a distinguir entre rutinas propias y rutinas asignadas por especialista.
- La eliminacion de productos usados en rutinas activas dejo de ser directa: ahora devuelve conflicto, permite quitar el producto de rutinas o reemplazarlo.
- El quiz puede repetirse desde configuracion; cada nuevo resultado actualiza `profiles.skin_type` si el tipo es reconocible.
- El perfil de usuario permite editar nombre y cambiar contrasena, pero no expone una edicion avanzada separada de todos los campos del perfil.
- El listado de productos y rutinas se integro con permisos derivados de rol y relaciones activas.

### Backend y datos
- Nuevas tablas/columnas para roles, especialistas, relaciones cliente-especialista, chat y rutinas asignadas.
- `push_tokens` y `notification_history` estan usados por tipos, repositorios y servicios de notificaciones.
- Politicas RLS especificas para `profiles`, `specialist_profiles`, documentos de especialistas, relaciones, chat y rutinas asignadas.
- Modulos backend agregados o consolidados: `specialists`, `chat`, `notifications`, `admin` y extensiones de `routines`/`products`.
- Tests en espanol para roles, especialistas, chat, notificaciones, productos, rutinas, progreso y middlewares.

### Correcciones relevantes
- Correccion de permisos y ownership en rutinas asignadas.
- Correcciones de upload de documentos de especialistas e imagenes de productos.
- Sanitizacion de errores visibles al usuario y de errores de autenticacion/autorizacion.
- Mejora del refresh de pantallas de notificaciones, chat, productos y home al volver a foco.

### Estado de la entrega
- Entrega 2 quedo implementada de forma amplia para roles, especialistas, relaciones, chat, notificaciones remotas y rutinas asignadas.
- Hay una inconsistencia documental: `database/e2_schema.sql` de la raiz no contiene la definicion completa de `push_tokens`, aunque la tabla aparece en tipos generados, repositorio, README y servicios.

## Entrega 3 - Producto final escalado

### Funcionalidades incorporadas
- Edicion avanzada de pasos en rutinas existentes: agregar, editar y eliminar pasos.
- Endpoints anidados para pasos de rutina: `POST/PATCH/DELETE /api/routines/:id/steps/:stepId`.
- Wizard de rutinas refactorizado con estado centralizado, persistencia async/debounced y guardia de performance `perf:routine-wizard`.
- Accesibilidad reforzada en el wizard y pantallas tocadas: labels, roles, estados accesibles, feedback de carga y errores.
- Componentes compartidos y limpieza visual: `LoadingState`, `AppHeader`, botones con loading, menus/acciones reorganizadas y rutas centralizadas.

### Centros esteticos y administracion
- Modulo `centers` con CRUD, soft delete, upload de imagen de centro y scope por `center_admin`.
- Tabla `centers`, tabla `center_admins` y columna `specialist_profiles.center_id`.
- Asociacion de especialistas a centros desde el panel administrativo.
- Visualizacion del centro asociado en directorio/detalle de especialistas y tarjetas relacionadas.
- Dashboard basico por centro con especialistas totales, verificados, pendientes y clientes vinculados indirectamente mediante especialistas.
- Pantallas admin para centros y metricas por centro.

### Rutinas y experiencia de usuario
- Rutinas asignadas por especialista siguen protegidas frente a edicion por el cliente.
- Cambios de rutina y pasos se integran con auditoria best-effort.
- Se agregaron mejoras de loading, errores amigables y estados vacios en flujos principales.

### Seguridad y auditoria
- Modulo `audit` con helper `recordAuditLog` best-effort.
- Endpoint `GET /api/admin/audit-log` protegido por `center_admin`.
- Panel de auditoria con filtros por entidad, actor, rango de fechas y paginacion.
- Eventos auditados para rutinas, pasos, productos, centros, suscripciones, perfil de usuario, solicitudes de especialistas, re-test de piel y vinculos cliente-especialista.
- Respuesta de auditoria enriquecida con nombres legibles y saneamiento de datos sensibles en suscripciones.
- RLS versionada para `centers`, `center_admins`, `subscription_plans` y `subscriptions`; `audit_logs` quedo sin RLS habilitado y depende del control de acceso backend.

### Metricas, reportes y suscripciones
- Modulo `subscriptions` con CRUD de planes, asignacion de suscripciones a usuarios, cambio/cancelacion de estado y busqueda de usuarios asignables.
- Pantallas admin para planes y suscripciones.
- `subscriptions.status` es informativo y no bloquea funcionalidades de otros modulos.
- Integracion del plan con chat: limites de mensajes/imagenes y habilitacion de videollamadas segun capacidades del plan.
- Vistas/indices de metricas globales y pantallas de metricas por centro.

### Cambios tecnicos relevantes
- Nuevas migraciones E3 para centros, imagenes de centro, auditoria, suscripciones y vistas de metricas.
- Refactors de separacion de capas, uso de `TABLE_NAMES`, centralizacion de tipos y servicios, limpieza de codigo muerto y normalizacion de errores.
- Cobertura ampliada: 30 suites backend/middleware con 304 tests al momento de esta consolidacion.
- Documentacion actualizada: README, setup de backend/base de datos, contratos E3, seguridad Supabase y performance del wizard.

### Estado de la entrega
- Entrega 3 quedo implementada para rutinas avanzadas, centros, auditoria, planes/suscripciones, metricas y mejoras generales.

## Funcionalidades parciales o postergadas
Al cierre de la Entrega 3, las funcionalidades principales definidas para el producto quedaron implementadas. Los siguientes elementos se registran como posibles mejoras posteriores:

- Completar la autenticación social con Google y Apple desde la aplicación móvil.
- Incorporar renovación automática de sesión ante la expiración del token.
- Agregar actualización en tiempo real al centro de notificaciones.
- Extender la asignación de suscripciones para contemplar directamente a los centros estéticos.
- Incorporar reportes administrativos avanzados, exportación de datos y filtros analíticos adicionales.
- Ampliar las pruebas automatizadas del frontend y agregar pruebas end-to-end.
- Continuar fortaleciendo las políticas de seguridad y acceso a datos de las tablas históricas del proyecto.
