# División por módulos verticales

La organización del equipo evita dividir por capas técnicas. Cada integrante trabaja el flujo completo de su módulo: pantalla, componentes, tipos, hook, servicio, validaciones, documentación y pruebas.

## Integrante 1 — Módulo Inicio / Home

Responsabilidades:

- `app/(tabs)/home.tsx`
- `components/HomeMetricCard.tsx`
- `components/HomeReminderItem.tsx`
- `hooks/useHome.ts`
- `types/home.ts`
- Integración con rutina activa y progreso diario

Estado actual:

- Home muestra rutina activa del día con progreso, métricas y recordatorios con toggle.
- Consume datos reales del backend a través de `useHome`.

## Integrante 2 — Módulo Rutinas

Responsabilidades:

- `app/(tabs)/routine.tsx`
- `app/routine/` (wizard Create → Step2–Step6 → success, Add-step, routine-edit)
- `components/RoutineStepCard.tsx`
- `components/RoutineProgressCard.tsx`
- `components/RoutineSectionCard.tsx`
- `components/RoutineStepItem.tsx`
- `hooks/useRoutine.ts`
- `types/routine.ts`
- `services/routines.ts`
- `backend/src/modules/routines/`
- Integración del check diario con `backend/src/modules/progress/`

Estado actual:

- CRUD completo de rutinas y pasos integrado con Supabase.
- Wizard de creación en 6 pasos implementado.
- Edición de rutinas y agregar pasos disponibles.
- El check de pasos persiste por día en `routine_logs` / `routine_step_logs`.

## Integrante 3 — Módulo Productos

Responsabilidades:

- `app/(tabs)/products.tsx`
- `app/products/` (index, [id], create, result)
- `components/ProductCard.tsx`
- `components/ProductSelector.tsx`
- `hooks/useProducts.ts`
- `types/product.ts`
- `services/products.ts`
- `backend/src/modules/products/`

Estado actual:

- CRUD completo de productos con subida de imágenes a Supabase Storage.
- Asociación de productos a pasos de rutina implementada.
- Flujo `returnTo` para navegar de vuelta a Add-step al crear un producto desde el wizard.

## Integrante 4 — Módulo Progreso / Historial

Responsabilidades:

- `app/(tabs)/progress.tsx`
- `app/progress/stats.tsx`
- `app/progress/history/index.tsx`
- `app/progress/history/[date].tsx`
- `components/progress/` (ProgressBar, MonthCalendarCard, StreakCard, ProgressSummaryCard, etc.)
- `components/progress/stats/` (StatCard, RoutineStatsSection, ProductStatsSection, etc.)
- `hooks/useProgress.ts`
- `hooks/useProgressHistory.ts`
- `hooks/useProgressStats.ts`
- `types/progress.ts`
- `services/progress.ts`
- `utils/progress.ts`
- `utils/month-calendar.utils.ts`
- `backend/src/modules/progress/`

Estado actual:

- Módulo implementado con datos reales de Supabase.
- Resumen semanal/mensual, racha actual, calendario mensual, historial por fecha y estadísticas avanzadas.
- Tests unitarios en `backend/src/modules/progress/tests/`.
- Contrato técnico documentado en `docs/progress-module-contract.md`.

## Integrante 5 — Módulo Perfil / Autenticación / Configuración

Responsabilidades:

- `app/(tabs)/profile.tsx`
- `app/(auth)/` (login, register, forgot-password, update-password)
- `app/landing.tsx`
- `app/start-diagnosis.tsx`
- `app/start-quiz.tsx`
- `app/quiz.tsx`
- `app/quiz-results.tsx`
- `app/resultados.tsx`
- `hooks/useProfile.ts`
- `types/user.ts`
- `services/auth.ts`
- `services/notifications.ts`
- `backend/src/modules/auth/`
- `backend/src/modules/quiz/`

Estado actual:

- Autenticación real con Supabase Auth implementada (registro, login, Google, recuperación de contraseña).
- Flujo de onboarding con quiz de diagnóstico de piel (5 preguntas → `skin_profiles`).
- Sesión persistida con `expo-secure-store`.
- Backend módulo quiz implementado con endpoints `/api/quiz/save` y `/api/quiz/profile`.

## Responsabilidad compartida

- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `constants/colors.ts`
- `constants/routes.ts`
- `components/Button.tsx`, `components/Card.tsx`, `components/FloatingActionMenu.tsx`
- `README.md`
- `CLAUDE.md`
- `docs/`
- Revisión de pull requests
- Convenciones de nombres, carpetas y formato
- Integración final antes de cada entrega
