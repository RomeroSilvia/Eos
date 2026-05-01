# Estructura del proyecto Eos

Eos usa Expo SDK 54, TypeScript estricto y expo-router para navegacion basada en archivos.

## Carpetas principales

```txt
app/          Rutas y pantallas principales con expo-router
components/   Componentes UI reutilizables
hooks/        Logica de lectura y composicion por modulo
types/        Contratos TypeScript compartidos
constants/    Paleta, rutas y constantes de producto
services/     Servicios mock y futuros puntos de integracion backend
utils/        Funciones auxiliares puras
assets/       Recursos visuales locales
docs/         Documentacion academica y tecnica
```

## Convenciones

- Cada modulo debe mantener pantalla, componentes, hook, tipos, servicios mock y documentacion alineados.
- No se implementa backend real en la Entrega 1.
- Los servicios mock son el contrato que luego podra migrarse a Supabase, Firebase o backend propio.
- Las pantallas usan `StyleSheet` y la paleta definida en `constants/colors.ts`.
- La navegacion se declara con archivos en `app/`; no se usa React Navigation manual.

## Rutas iniciales

```txt
/
/login
/register
/home
/routine
/products
/progress
/profile
```

## Escalabilidad prevista

El scaffold deja separados los dominios funcionales para incorporar luego persistencia local, autenticacion real, multiples rutinas, especialistas, clientes, centros, suscripciones y almacenamiento de imagenes.
