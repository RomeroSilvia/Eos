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

| Campo esperado por contrato | Campo actual en `database.types.ts` | Descripcion |
|---|---|---|
| `id` | `id` | Identificador del log de rutina. |
| `user_id` | `user_id` | Usuario propietario del log. |
| `routine_id` | `routine_id` | Rutina asociada. |
| `date` | `log_date` | Fecha del registro en formato `YYYY-MM-DD`. |
| `completed` | TODO | Booleano conceptual de rutina completa. Hoy se infiere con `completed_at !== null` o `completion_percentage >= 100`. |
| `completed_at` | `completed_at` | Fecha/hora en que se completo la rutina. |
| `created_at` | `created_at` | Fecha/hora de creacion. |

Campos actuales adicionales:

- `completion_percentage`
- `updated_at`

### `routine_step_logs`

| Campo esperado por contrato | Campo actual en `database.types.ts` | Descripcion |
|---|---|---|
| `id` | `id` | Identificador del log de paso. |
| `routine_log_id` | `routine_log_id` | Log de rutina asociado. |
| `routine_step_id` | `step_id` | Paso de rutina asociado. |
| `completed` | `is_completed` | Indica si el paso fue completado. |
| `completed_at` | `completed_at` | Fecha/hora en que se completo el paso. |
| `created_at` | `created_at` | Fecha/hora de creacion. |

Campos actuales adicionales:

- `updated_at`

> Importante: los nombres finales deben coincidir con `backend/src/database/database.types.ts` y con las tablas reales de Supabase. Si el equipo decide usar `date` y `completed`, debe actualizar tipos, SQL y queries. Si se mantiene el esquema actual, Progreso debe seguir usando `log_date`, `completion_percentage` e `is_completed`.

## 5. Contrato funcional

### `PeriodProgress`

Reglas:

- `totalRoutines` = cantidad de `routine_logs` del periodo.
- `completedRoutines` = cantidad de `routine_logs` con rutina completa.
- `percent` = `completedRoutines / totalRoutines * 100`.
- Si `totalRoutines = 0`, entonces `percent = 0`.

En la implementacion actual, una rutina se considera completa si:

- `completion_percentage >= 100`; o
- `completed_at !== null`.

TODO: confirmar si se agregara un campo booleano `completed` en `routine_logs`.

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

La racha se calcula por dia, no por cantidad de rutinas. Si un usuario completa dos rutinas el mismo dia, ese dia cuenta una sola vez para la racha.

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

Las rutas estan registradas bajo:

```txt
/api/progress
```

### `GET /api/progress/summary/:userId`

Devuelve el resumen de progreso del usuario.

#### Parametros

| Parametro | Ubicacion | Requerido | Descripcion |
|---|---|---|---|
| `userId` | path param | Si | ID del usuario. |

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
    {
      "date": "2026-05-01",
      "status": "completed"
    },
    {
      "date": "2026-05-02",
      "status": "partial"
    },
    {
      "date": "2026-05-03",
      "status": "empty"
    }
  ]
}
```

#### Errores esperados

| Status | Causa |
|---|---|
| `400` | Falta `userId`. |
| `500` | Error de Supabase o error interno del service. |

### `GET /api/progress/history/:userId?date=YYYY-MM-DD`

Devuelve los `routine_logs` del usuario para una fecha especifica.

#### Parametros

| Parametro | Ubicacion | Requerido | Descripcion |
|---|---|---|---|
| `userId` | path param | Si | ID del usuario. |
| `date` | query param | Si | Fecha en formato `YYYY-MM-DD`. |

#### Validaciones

- `userId` requerido.
- `date` requerido.
- `date` debe tener formato `YYYY-MM-DD`.

#### Response example

```json
[
  {
    "id": "routine-log-id",
    "user_id": "user-id",
    "routine_id": "routine-id",
    "log_date": "2026-05-04",
    "completed_at": "2026-05-04T12:00:00.000Z",
    "completion_percentage": 100,
    "created_at": "2026-05-04T12:00:00.000Z",
    "updated_at": "2026-05-04T12:00:00.000Z"
  }
]
```

#### Errores esperados

| Status | Causa |
|---|---|
| `400` | Falta `userId`. |
| `400` | Falta `date`. |
| `400` | `date` no usa formato `YYYY-MM-DD`. |
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

## 9. Acuerdos necesarios con el equipo

Puntos pendientes para confirmar con Rutina / Tracking y Base de Datos:

- Confirmar que el modulo Rutina crea `routine_logs`.
- Confirmar que el modulo Rutina crea `routine_step_logs`.
- Confirmar que la fecha se guarda como `YYYY-MM-DD`.
- Confirmar si puede haber mas de una rutina por dia.
- Confirmar si `completed` en `routine_logs` representa rutina completa.
- Confirmar si se mantendra el esquema actual con `completion_percentage` y `completed_at` en lugar de `completed`.
- Confirmar si `routine_step_id` se llamara `step_id` o si se renombrara.
- Confirmar que pasa si el usuario desmarca un paso ya completado.
- Confirmar si los dias sin rutina programada deben mostrarse como `empty` o no aparecer en calendario.

## 10. Notas de implementacion actual

- El modulo ya expone `GET /api/progress/summary/:userId`.
- El modulo ya expone `GET /api/progress/history/:userId?date=YYYY-MM-DD`.
- El modulo no escribe en Supabase.
- Los tests unitarios del service y controller mockean repository/service y no usan Supabase real.
- La semana inicia el lunes.
- El calendario se calcula para el mes actual completo.
