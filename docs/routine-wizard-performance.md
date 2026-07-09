# M1 T1.1 - Perfilado del wizard de rutinas

## Objetivo

Medir el tiempo percibido entre el tap de avance y el primer frame renderizado de la pantalla siguiente en el wizard `Create -> Step2 -> Step6`, sin cambiar todavía el comportamiento funcional.

## Instrumentación agregada

- `hooks/useRoutineWizardProfiler.ts` registra métricas solo fuera de producción.
- Cada pantalla del wizard llama a `useRoutineWizardProfiler('<Step>')`.
- Cada acción de avance llama a `markRoutineWizardTransition(from, to)` antes de navegar o antes del trabajo async que actualmente bloquea la navegación.
- Los trabajos async relevantes llaman a `logRoutineWizardWork(...)`.

Los logs aparecen en Metro/DevTools con estos prefijos:

```text
[routine-wizard:first-frame]
[routine-wizard:interactions-complete]
[routine-wizard:work]
```

## Métrica principal

`tapToFirstFrameMs` mide desde el tap en "Continuar" hasta el primer frame observado en la pantalla destino. Si supera `100ms`, incumple el RNF-01 de E3.

`mountMs` mide el tiempo desde que la pantalla destino montó hasta el frame siguiente. Sirve para separar render pesado de espera previa a la navegación.

## Hallazgos iniciales del código actual

1. `Step2 -> Step3` no navega hasta terminar `createRoutine` o `assignRoutineToPatient`. Bajo latencia real, el tiempo percibido incluye red y no puede garantizar `<100ms`.
2. `Step3 -> Step4` espera `updateRoutine` antes de navegar. Si el backend responde lento, la transición queda bloqueada aunque la pantalla siguiente no dependa visualmente de esa respuesta para mostrarse.
3. `Step4` dispara `loadRoutineState` al enfocar. Este trabajo no bloquea el `router.push`, pero sí puede provocar renders adicionales al llegar los pasos.
4. `Step6` carga el resumen con `getRoutineById` después de montar. La navegación puede sentirse rápida, pero el contenido muestra estado de carga hasta que responde la API.
5. `Step5` usa contenido estático de productos, por lo que hoy no representa el costo real de asociar productos a pasos.

## Cómo medir manualmente

1. Ejecutar la app en modo desarrollo.
2. Crear una rutina y avanzar por `Create`, `Step2`, `Step3`, `Step4`, `Step5` y `Step6`.
3. Registrar para cada transición el valor `tapToFirstFrameMs`.
4. Repetir con latencia simulada de `100ms` en el emulador/dispositivo.
5. Considerar como cuello de botella cualquier transición con `tapToFirstFrameMs > 100`.

## Implicancias para las próximas tareas

- T1.2 reduce renders innecesarios compartiendo estado del wizard sin prop drilling y memoizando componentes pesados.
- T1.3 hace optimistas `Step2 -> Step3` y `Step3 -> Step4`: `Step2` inicia la creación de rutina en segundo plano y `Step3` pinta sin esperar la red; `Step3` navega a `Step4` antes de persistir `time_of_day`.
- T1.4 puede reutilizar `markRoutineWizardTransition` y `useRoutineWizardProfiler` como base para un benchmark automatizado.

## T1.3 - Navegación optimista

El flujo actualizado evita que la red bloquee el primer frame de la pantalla siguiente:

1. `Step2` valida el formulario, guarda nombre/objetivo en el reducer e inicia `createRoutineInBackground(...)`.
2. El `router.push('/routine/Step3')` ocurre inmediatamente después de iniciar la promesa.
3. Cuando el backend devuelve la rutina, el provider actualiza `state.routineId`.
4. `Step3` permite continuar cuando existe un `routineId` real.
5. `Step3 -> Step4` navega primero y ejecuta `updateRoutineDataInBackground(...)` después, dejando `time_of_day` actualizado en el reducer desde el tap.

Si la creación falla, el provider deja el error en `state.error` y se muestra una alerta. Si falla la actualización del tipo de rutina, el usuario ya está en `Step4`, pero recibe una alerta para reintentar.
