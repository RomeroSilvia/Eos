# Contrato tecnico del modulo Progreso

## 1. Objetivo del modulo Progreso

El modulo Progreso permite visualizar el avance del usuario en sus rutinas de skincare a partir de datos ya registrados por otros modulos.

Su objetivo es exponer informacion calculada para que la app pueda mostrar:

- progreso semanal;
- progreso mensual;
- racha actual;
- mejor racha historica;
- calendario de cumplimiento;
- historial por fecha.

Este modulo no representa diagnosticos dermatologicos ni recomendaciones clinicas. Su foco es medir constancia y cumplimiento de habitos.

## 2. Responsabilidad del modulo Progreso

Progreso es un modulo de lectura y calculo.

### Progreso si hace

- Lee `routine_logs`.
- Lee `routine_step_logs`.
- Calcula metricas de avance.
- Expone endpoints de consulta.
- Devuelve resumen semanal, mensual, rachas y calendario.
- Devuelve historial de logs por fecha.

### Progreso no hace

- No crea rutinas.
- No crea pasos.
- No crea productos.
- No asocia productos a pasos.
- No crea `routine_logs`.
- No actualiza `routine_logs`.
- No crea `routine_step_logs`.
- No actualiza `routine_step_logs`.

La escritura de logs pertenece al modulo Rutina / Tracking.

## 3. Responsabilidad del modulo Rutina / Tracking

El modulo Rutina / Tracking debe generar y mantener los datos que Progreso consume.

Debe crear o actualizar logs cuando el usuario:

- inicia o realiza una rutina;
- marca un paso como completado;
- desmarca un paso;
- completa una rutina.

Estos registros son la fuente principal de datos para que Progreso pueda calcular metricas. Si Rutina / Tracking no crea logs consistentes, Progreso no puede mostrar resultados confiables.

## 4. Tablas requeridas

Progreso necesita leer estas tablas de Supabase.

### `routine_logs`

| Campo | Descripcion |
|---|---|
| `id` | Identificador del log de rutina. |
| `user_id` | Usuario propietario del log. |
| `routine_id` | Rutina asociada. |
| `log_date` | Fecha del registro en formato `YYYY-MM-DD`. |
| `completed_at` | Fecha/hora en que se completo la rutina (`null` si no). |
| `completion_percentage` | Porcentaje de completitud (0-100). |
| `created_at` | Fecha/hora de creacion. |
| `updated_at` | Fecha/hora de ultima actualizacion. |

### `routine_step_logs`

| Campo | Descripcion |
|---|---|
| `id` | Identificador del log de paso. |
| `routine_log_id` | Log de rutina asociado. |
| `step_id` | Paso de rutina asociado. |
| `is_completed` | Indica si el paso fue completado. |
| `completed_at` | Fecha/hora en que se completo el paso (`null` si no). |
| `created_at` | Fecha/hora de creacion. |
| `updated_at` | Fecha/hora de ultima actualizacion. |

## 5. Contrato funcional

### `PeriodProgress`

Reglas:

- `totalRoutines` = cantidad de `routine_logs` del periodo.
- `completedRoutines` = cantidad de `routine_logs` con rutina completa.
- `percent` = `completedRoutines / totalRoutines * 100`.
- Si `totalRoutines = 0`, entonces `percent = 0`.

Una rutina se considera completa si:

- `completion_percentage >= 100`; o
- `completed_at !== null`.

### `CalendarDayStatus`

| Estado | Regla |
|---|---|
| `empty` | No hay logs ese dia. |
| `completed` | Hay logs ese dia y todos estan completos. |
| `partial` | Hay al menos un log completo, pero no todos. |
| `pending` | Hay logs, pero ninguno esta completo. |

### `StreakProgress`

Reglas:

- `currentStreak`: cantidad de dias consecutivos hasta hoy con al menos una rutina completada.
- `longestStreak`: mayor cantidad historica de dias consecutivos con al menos una rutina completada.

La racha se calcula por dia, no por cantidad de rutinas. Si un usuario completa dos rutinas el mismo dia, ese dia cuenta una sola vez para la racha. La semana inicia el lunes.

## 6. Tipos de respuesta

Los tipos publicos del modulo viven en:

```txt
backend/src/modules/progress/progress.types.ts
```

```ts
export type PeriodProgress = {
  percent: number;
  completedRoutines: number;
  totalRoutines: number;
};

export type StreakProgress = {
  currentStreak: number;
  longestStreak?: number;
};

export type CalendarDayStatus = 'completed' | 'partial' | 'pending' | 'empty';

export type CalendarDayProgress = {
  date: string;
  status: CalendarDayStatus;
};

export type ProgressSummary = {
  weeklyProgress: PeriodProgress;
  monthlyProgress: PeriodProgress;
  streakProgress: StreakProgress;
  calendarProgress: CalendarDayProgress[];
};
```

## 7. Endpoints expuestos

Las rutas estan registradas bajo `/api/progress` y requieren autenticacion (Bearer token). El `user_id` se obtiene de `req.user.id` — no se pasa en la URL.

### `GET /api/progress/summary`

Devuelve el resumen de progreso del usuario autenticado.

#### Response example

```json
{
  "weeklyProgress": {
    "percent": 80,
    "completedRoutines": 4,
    "totalRoutines": 5
  },
  "monthlyProgress": {
    "percent": 60,
    "completedRoutines": 12,
    "totalRoutines": 20
  },
  "streakProgress": {
    "currentStreak": 3,
    "longestStreak": 7
  },
  "calendarProgress": [
    { "date": "2026-05-01", "status": "completed" },
    { "date": "2026-05-02", "status": "partial" },
    { "date": "2026-05-03", "status": "empty" }
  ]
}
```

#### Errores esperados

| Status | Causa |
|---|---|
| `401` | Token ausente o invalido. |
| `500` | Error de Supabase o error interno del service. |

### `GET /api/progress/history`

Devuelve los `routine_logs` del usuario para el periodo solicitado.

#### Query params

| Parametro | Requerido | Descripcion |
|---|---|---|
| `date` | No | Fecha en formato `YYYY-MM-DD` para filtrar un dia especifico. |

#### Errores esperados

| Status | Causa |
|---|---|
| `400` | `date` no tiene formato `YYYY-MM-DD`. |
| `401` | Token ausente o invalido. |
| `500` | Error de Supabase o error interno del service. |

### `GET /api/progress/history/:date`

Devuelve el detalle de un dia especifico.

#### Errores esperados

| Status | Causa |
|---|---|
| `400` | `date` no tiene formato `YYYY-MM-DD`. |
| `401` | Token ausente o invalido. |
| `500` | Error de Supabase o error interno del service. |

### `GET /api/progress/stats`

Devuelve estadisticas avanzadas: ranking de rutinas, estadisticas de productos, comparativas semanal/mensual.

#### Errores esperados

| Status | Causa |
|---|---|
| `401` | Token ausente o invalido. |
| `500` | Error de Supabase o error interno del service. |

## 8. Casos de borde

| Caso | Resultado esperado |
|---|---|
| Usuario sin logs | Progreso semanal y mensual en `0`, racha actual `0`, calendario sin romper. |
| Dia sin registros | Estado `empty`. |
| Dia con registros pero ninguno completo | Estado `pending`. |
| Dia con algunos registros completos | Estado `partial`. |
| Dia con todos los registros completos | Estado `completed`. |
| Usuario con varias rutinas en un mismo dia | Todas cuentan para `PeriodProgress`; para racha, el dia cuenta una sola vez. |
| Usuario con racha cortada | `currentStreak` se corta en el primer dia hacia atras sin rutina completa. |
| Error de Supabase | El controller responde `500` con mensaje de error controlado. |

## 9. Acuerdos del equipo — estado actual

| Punto | Estado |
|---|---|
| El modulo Rutina crea `routine_logs` | Confirmado e implementado |
| El modulo Rutina crea `routine_step_logs` | Confirmado e implementado |
| La fecha se guarda como `YYYY-MM-DD` en `log_date` | Confirmado |
| Puede haber mas de una rutina por dia | Si, el esquema lo permite |
| Rutina completa = `completion_percentage >= 100` o `completed_at !== null` | Confirmado |
| El campo se llama `step_id` (no `routine_step_id`) | Confirmado |
| Dias sin rutina programada aparecen como `empty` en calendario | Confirmado |
| Si el usuario desmarca un paso, `is_completed` vuelve a `false` | Confirmado |

## 10. Notas de implementacion

- El modulo no escribe en Supabase; es exclusivamente de lectura y calculo.
- Los tests unitarios del service y controller mockean repository/service y no usan Supabase real.
- El calendario se calcula para el mes actual completo.
- La semana inicia el lunes.
