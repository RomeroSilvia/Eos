# Estructura del proyecto Eos

Eos usa Expo SDK 54, TypeScript estricto y expo-router para navegacion basada en archivos. El proyecto esta dividido en una app movil (frontend) y un backend propio con Express + Supabase.

## Estructura general

```txt
Eos/
├── app/              Rutas y pantallas (expo-router)
├── components/       Componentes UI reutilizables
├── hooks/            Logica de lectura y composicion por modulo
├── services/         Clientes HTTP y servicios de dominio
│   └── api/          Cliente base fetch con soporte mock/real
├── types/            Contratos TypeScript compartidos
├── constants/        Paleta de colores y rutas
├── utils/            Funciones auxiliares puras
├── assets/           Recursos visuales locales
├── docs/             Documentacion academica y tecnica
├── database/         Schema SQL inicial
└── backend/          Servidor Express independiente
    └── src/
        ├── app.ts
        ├── server.ts
        ├── config/       Variables de entorno y cliente Supabase
        ├── database/     Tipos del schema y nombres de tablas
        ├── middlewares/  Error y notFound
        ├── modules/      Modulos por dominio (auth, products, profile, progress, routines)
        │   └── <modulo>/ controller · repository · routes · service
        └── utils/        ApiError y asyncHandler
```

## Pantallas (app/)

```txt
app/
├── _layout.tsx         Layout raiz
├── index.tsx           Redireccion inicial
├── (auth)/
│   ├── login.tsx
│   └── register.tsx
└── (tabs)/
    ├── _layout.tsx
    ├── home.tsx
    ├── products.tsx
    ├── profile.tsx
    ├── progress.tsx
    └── routine.tsx
```

## Rutas de la API (backend)

```txt
GET  /api/health
/api/auth/...
/api/products/...
/api/profile/...
/api/progress/...
/api/routines/...
```

## Convenciones

- Las pantallas usan `StyleSheet` y la paleta definida en `constants/colors.ts`.
- La navegacion se declara con archivos en `app/`; no se usa React Navigation manual.
- `services/api/client.ts` expone `apiRequest<T>` que puede apuntar al backend real o a mocks segun `EXPO_PUBLIC_USE_MOCKS`.
- El backend sigue el patron controller → service → repository por cada modulo.
- El acceso a datos usa el cliente Supabase definido en `backend/src/config/supabase.ts`.

## Escalabilidad prevista

Los dominios funcionales estan separados para incorporar multiples rutinas, especialistas, clientes, centros, suscripciones y almacenamiento de imagenes.
