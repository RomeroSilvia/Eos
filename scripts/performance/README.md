# Evidencia de performance y optimizaciones

Esta carpeta convierte la sección **Performance y optimizaciones** de `doc_tecnica_final.docx` en comprobaciones reproducibles. Ningún resultado generado debe contener datos personales ni secretos.

## 1. Guardia automatizada completa

```bash
npm run perf:verify
```

Ejecuta la medición sintética del wizard (`p95 <= 100 ms`) y verifica en el código los mecanismos documentados: TTL de 30 s, de-duplicación, caché de chat en memoria/disco, compresión 1280 px/calidad 0.7 y mutex de notificaciones.

La auditoría de código prueba que el mecanismo sigue presente; no demuestra latencia, consumo de batería ni comportamiento en todos los dispositivos.

Para generar un JSON adjuntable con estas verificaciones:

```bash
npm run perf:evidence -- --iterations=500 --latency=100 --output=artifacts/performance/automated.json
```

## 2. Cold start y memoria reales en Android

Requisitos: build instalada, dispositivo/emulador conectado y `adb` disponible.

```bash
npm run perf:android -- --package=com.eos.app --activity=.MainActivity --iterations=10 --output=artifacts/performance/android.json
```

El reporte registra dispositivo y versión de Android, min/mediana/p95/máximo/promedio de cold start, y PSS de memoria luego del último arranque. Reemplazar package/activity por los valores del build real.

No se fija un umbral porque la documentación técnica no declara uno para cold start o memoria. Para evidencia comparable, usar siempre el mismo build, dispositivo, estado térmico y número de iteraciones.

## 3. Primer frame real del wizard

`npm run perf:routine-wizard` es una guardia sintética. El cumplimiento real del RNF-01 se valida en un build de desarrollo con los logs `[routine-wizard:first-frame]` y el campo `tapToFirstFrameMs`, repitiendo el flujo en dispositivo/emulador. El criterio documentado es p95 <= 100 ms.

## Cobertura actual

| Afirmación | Evidencia automatizada | Evidencia en dispositivo |
| --- | --- | --- |
| Wizard optimista, p95 <= 100 ms | Sí, guardia sintética + Jest | Sí, necesaria para primer frame real |
| TTL Home/Productos | Presencia del contrato | Prueba de requests recomendada |
| Notificaciones cross-instance/de-dup | Presencia del contrato | Prueba de requests recomendada |
| Caché de chat memoria/disco/de-dup | Presencia del contrato | Descarga real recomendada |
| Compresión pre-upload | Parámetros comprobados | Tamaño/tiempo real recomendado |
| Mutex de reprogramación | Presencia del contrato | Concurrencia real recomendada |
| Cold start | No unit test | Sí, `perf:android` |
| Memoria | No unit test | Sí, `perf:android` |
| Batería | No | Perfil prolongado con Android Studio/Perfetto |

Los tests unitarios cubren la lógica y los parsers, pero no sustituyen benchmarks sobre hardware. La batería requiere un escenario temporal definido; el documento solo la menciona como título y no proporciona duración, carga o umbral.
