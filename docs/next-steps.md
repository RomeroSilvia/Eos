# Next steps

## Estado actual

El proyecto tiene implementados los módulos principales con integración real a Supabase.

### Implementado

1. Autenticación real con Supabase Auth (registro, login, Google, recuperación de contraseña).
2. Middleware JWT (`auth.middleware.ts`) que valida Bearer token y setea `req.user.id`.
3. CRUD completo de rutinas y pasos con persistencia en Supabase.
4. Asociación de productos a pasos de rutina.
5. Persistencia diaria de pasos completados con `routine_logs` y `routine_step_logs`.
6. CRUD de productos con subida de imágenes a Supabase Storage.
7. Módulo Progreso: resumen semanal/mensual, racha, calendario y estadísticas avanzadas.
8. Módulo Quiz: 5 preguntas, guardado en `skin_profiles`, perfil de piel por usuario.
9. Flujo de onboarding: `landing → register → start-diagnosis → start-quiz → quiz → quiz-results`.
10. Home consume rutina activa y progreso diario real.
11. Pantallas de historial por fecha y estadísticas avanzadas.
12. Edición de rutinas y wizard de creación completo (6 pasos).
13. Tests unitarios para products, progress y routines.
14. Push notifications con cron job (08:00 y 21:00), mensajes personalizados por rutina, historial persistido en `notification_history` y pantalla in-app con agrupación por día.
15. Roles diferenciados (`user`, `specialist`, `center_admin`) con navegación y middleware por rol.
16. `RemindersSection` — sección de recordatorios en home y perfil derivada de las rutinas activas del usuario, con navegación a la tab de rutinas.
17. Asignación de rutinas por especialista: columna `assigned_by` en `routines` con RLS por relación activa especialista-paciente.
18. Pantalla de configuración (`app/settings.tsx`): edición de perfil, cambio de contraseña, toggle de notificaciones y re-test de piel.
19. `SpecialistHomeCard` en home con especialista vinculado, estados de loading/error y CTA de búsqueda.
20. Tests de controllers para routines y specialists.directory (20 suites, 186 tests en total).
21. Chat con medios: envío de imágenes desde galería, separadores de fecha, soporte de videollamada y actualizaciones en tiempo real via Supabase Realtime.

## Tareas pendientes recomendadas

1. **RLS en Supabase** — Activar Row Level Security y definir políticas por usuario antes de cualquier despliegue en producción. El schema actual tiene estas secciones comentadas.
2. **Triggers `updated_at`** — Agregar triggers en Supabase para actualizar automáticamente el campo `updated_at` en cada tabla.
3. **Auth guard en navegación** — `app/_layout.tsx` no tiene protección de rutas automática. Si el usuario no tiene sesión y accede a una ruta protegida, debería redirigir a `/login`.
4. **Módulo Quiz — separar capas** — El controller de quiz actualmente consulta Supabase directamente. Seguir el patrón del resto de módulos: extraer a `quiz.service.ts` y `quiz.repository.ts`.
5. **Manejo de errores en formularios** — Algunos formularios de creación no muestran estados de error o loading visibles al usuario.
6. **Paginación** — El historial de progreso y los listados de productos no tienen paginación; puede ser necesario con datos reales acumulados.
7. **Refresh de token** — No hay lógica de refresh automático del JWT cuando expira.
8. **Índices en base de datos** — El schema inicial tiene índices comentados; confirmar los patrones de acceso y crearlos.
9. **Buscador de especialistas** — El endpoint de búsqueda existe pero el filtro por rol en Supabase PostgREST sobre tablas embebidas puede no funcionar correctamente; requiere revisión.
10. **Tabs del especialista con datos reales** — Las tabs de consultas, pacientes y rutinas del especialista aún no consumen datos reales del backend.

## No hacer todavía

- Roles avanzados (especialista-cliente, centros).
- Recomendaciones automáticas de productos.
- Funcionalidades clínicas o de diagnóstico médico.
