# Variables de entorno

Eos usa variables separadas para frontend y backend.

## Frontend Expo

Archivo raiz:

```txt
.env
```

Variables:

```txt
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_USE_MOCKS=true
```

`EXPO_PUBLIC_USE_MOCKS=true` mantiene los servicios mock actuales. En tareas futuras se podra cambiar a `false` para empezar a usar la API real.

## Backend Node.js

Archivo:

```txt
backend/.env
```

Variables:

```txt
PORT=3000
NODE_ENV=development
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CORS_ORIGIN=http://localhost:8081
```

## Seguridad

- No commitear archivos `.env` reales.
- No usar `SUPABASE_SERVICE_ROLE_KEY` en el frontend.
- Solo el backend puede usar service role key, y preferentemente en operaciones controladas.
- Para probar desde un celular fisico, reemplazar `localhost` por la IP local de la maquina.
