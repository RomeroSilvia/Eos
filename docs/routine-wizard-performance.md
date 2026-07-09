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
- T1.4 agrega `npm run perf:routine-wizard` como guardia automatizada para que las transiciones optimistas fallen si el p95 supera 100ms.

## T1.3 - Navegación optimista

El flujo actualizado evita que la red bloquee el primer frame de la pantalla siguiente:

1. `Step2` valida el formulario, guarda nombre/objetivo en el reducer e inicia `createRoutineInBackground(...)`.
2. El `router.push('/routine/Step3')` ocurre inmediatamente después de iniciar la promesa.
3. Cuando el backend devuelve la rutina, el provider actualiza `state.routineId`.
4. `Step3` permite continuar cuando existe un `routineId` real.
5. `Step3 -> Step4` navega primero y ejecuta `updateRoutineDataInBackground(...)` después, dejando `time_of_day` actualizado en el reducer desde el tap.

Si la creación falla, el provider deja el error en `state.error` y se muestra una alerta. Si falla la actualización del tipo de rutina, el usuario ya está en `Step4`, pero recibe una alerta para reintentar.

## T1.4 - Medicion automatizada

Comando:

```bash
npm run perf:routine-wizard
```

El script `scripts/routine-wizard-performance.js` simula latencia de backend de `100ms` y mide si la navegacion de `Step2 -> Step3` y `Step3 -> Step4` queda agendada de forma sincronica antes de esperar la promesa de persistencia.

Criterio de aceptacion automatizado:

- `p95 <= 100ms` para cada transicion.
- La navegacion debe ejecutarse de forma sincronica dentro del handler.
- Si un cambio vuelve a esperar el backend antes de navegar, el script falla.

Opciones utiles:

```bash
node scripts/routine-wizard-performance.js --threshold=100 --iterations=500 --latency=150
```

Esta medicion es una guardia automatizada de regresion. La validacion final de RNF-01 sigue usando los logs reales de `useRoutineWizardProfiler` en dispositivo/emulador, porque solo ahi se observa el costo real de render y primer frame.

## T1.8 - Cobertura de tests

Tests automatizados agregados para M1:

- `backend/src/modules/routines/tests/routines.service.test.ts`: reglas de ownership, endpoints anidados, auditoria y permisos de rutinas asignadas.
- `backend/src/modules/routines/tests/routines.controller.test.ts`: validacion de parametros y delegacion controller -> service.
- `backend/src/modules/routines/tests/routines.frontend-service.test.ts`: contratos de `services/routines.ts`, incluyendo endpoints anidados de pasos.
- `backend/src/modules/routines/tests/routines.performance-script.test.ts`: guardia automatizada de performance y regresion de navegacion sincronica.

Comandos:

```bash
cd backend
npm test -- routines
npm run typecheck
```

El repo no tiene React Native Testing Library configurado en frontend. Por eso la cobertura de interaccion del wizard queda dividida entre tests de contrato del servicio frontend, tests backend de reglas de negocio y el guard de performance. La verificacion visual/interactiva final sigue siendo manual con los logs de `useRoutineWizardProfiler`.

## T1.9 - Accesibilidad

El wizard de rutinas expone semantica accesible en sus controles principales:

- `Stepper` anuncia `Paso N de 6` como `progressbar`.
- Inputs del wizard y edicion de rutina tienen `accessibilityLabel`.
- Opciones tipo objetivo/tipo de rutina usan `accessibilityRole="radio"` y `accessibilityState.selected`.
- Botones de avance, guardado, confirmacion, edicion y eliminacion tienen labels descriptivos y estado `disabled` cuando corresponde.
- Acordeones de confirmacion usan `accessibilityState.expanded`.
- Iconos decorativos quedan fuera del arbol accesible.

Step5 mantiene botones placeholder de productos marcados como `disabled` hasta que exista una accion real de asociacion de productos en esa pantalla.

## T1.10 - Documentacion y skill

Documentacion de cierre de M1:

- `docs/division-modulos.md` resume el estado actualizado del modulo Rutinas.
- `docs/e3-contracts.md` documenta el contrato M1 con auditoria best-effort.
- `agents/skills/e3-routine-wizard-perf/SKILL.md` deja instrucciones operativas para retomar el modulo.
