# Division por modulos verticales

La organizacion del equipo evita dividir por capas tecnicas. Cada integrante trabaja el flujo completo de su modulo: pantalla, componentes, tipos, hook, servicio mock, validaciones, documentacion y pruebas manuales.

## Integrante 1 - Modulo Inicio / Home

Responsabilidades:

- `app/(tabs)/home.tsx`
- `components/HomeMetricCard.tsx`
- `components/HomeReminderItem.tsx`
- `hooks/useHome.ts`
- `types/home.ts`
- mocks del resumen diario

## Integrante 2 - Modulo Rutinas

Responsabilidades:

- `app/(tabs)/routine.tsx`
- `components/RoutineStepCard.tsx`
- `components/RoutineProgressCard.tsx`
- `hooks/useRoutine.ts`
- `types/routine.ts`
- `services/routines.ts`
- endpoints `backend/src/modules/routines/*`
- integracion de check diario con `backend/src/modules/progress/*`

Estado actual:

- Rutinas y pasos usan API EOS/Supabase.
- El listado de rutinas del usuario esta integrado en la tab Rutina.
- El check de pasos queda persistido por dia para que Progreso pueda recuperarlo.

## Integrante 3 - Modulo Productos

Responsabilidades:

- `app/(tabs)/products.tsx`
- futuros `ProductCard` y `ProductSelector`
- `hooks/useProducts.ts`
- `types/product.ts`
- `services/products.ts`

## Integrante 4 - Modulo Progreso / Historial

Responsabilidades:

- `app/(tabs)/progress.tsx`
- `components/ProgressSummaryCard.tsx`
- `components/StreakCard.tsx`
- `components/MonthCalendarCard.tsx`
- `hooks/useProgress.ts`
- `types/progress.ts`
- `services/progress.ts`

## Integrante 5 - Modulo Perfil / Autenticacion / Configuracion

Responsabilidades:

- `app/(tabs)/profile.tsx`
- `app/(auth)/login.tsx`
- `app/(auth)/register.tsx`
- `hooks/useProfile.ts`
- `types/user.ts`
- `services/auth.ts`
- `services/notifications.ts`

## Responsabilidad compartida

- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
- `constants/colors.ts`
- `constants/routes.ts`
- `README.md`
- `CHANGELOG.md`
- `docs/`
- revision de pull requests
- convenciones de nombres, carpetas y formato
- integracion final antes de cada entrega

## Ramas recomendadas

```txt
feature/home-module
feature/routine-module
feature/products-module
feature/progress-module
feature/profile-auth-module
chore/navigation-layout
docs/e1-documentation
```
