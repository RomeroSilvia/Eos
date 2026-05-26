# Variables de entorno

Eos usa variables separadas para frontend y backend.

## Frontend Expo

Archivo en la raíz del proyecto:

```txt
.env
```

Variables:

```txt
EXPO_PUBLIC_API_URL=http://localhost:3000/api
EXPO_PUBLIC_USE_MOCKS=false
```

- `EXPO_PUBLIC_API_URL` — URL base del backend. Opcional: si no se define, se autodetecta desde `Constants.expoConfig.hostUri` (útil en Expo Go con dispositivos físicos). En Android, `localhost` se mapea automáticamente a `10.0.2.2` para emuladores.
- `EXPO_PUBLIC_USE_MOCKS` — Cuando es `true`, todos los servicios devuelven datos hardcodeados sin llamar al backend. Valor por defecto: `false`.

Para probar desde un celular físico, reemplazar `localhost` por la IP local de la máquina (ej. `http://192.168.1.x:3000/api`).

## Backend Node.js

Archivo:

```txt
backend/.env
```

Variables:

```txt
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://<proyecto>.supabase.co
SUPABASE_ANON_KEY=<anon_key>
SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
CORS_ORIGIN=http://localhost:8081
PASSWORD_RESET_REDIRECT_URL=http://localhost:8081/update-password
```

- `PORT` — Puerto del servidor. Default: `3000`.
- `NODE_ENV` — Entorno de ejecución (`development` / `production`). Afecta el nivel de detalle en errores.
- `SUPABASE_URL` — URL del proyecto Supabase.
- `SUPABASE_ANON_KEY` — Clave anónima pública de Supabase.
- `SUPABASE_SERVICE_ROLE_KEY` — Clave de service role. Solo para el backend. Nunca exponer al cliente.
- `CORS_ORIGIN` — Origen permitido por CORS. Default: `http://localhost:8081`.
- `PASSWORD_RESET_REDIRECT_URL` — URL de redirección para el email de recuperación de contraseña. En producción debe apuntar al dominio real.

## Seguridad

- No commitear archivos `.env` reales (están en `.gitignore`).
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe llegar al frontend ni aparecer en logs.
- Antes de producción, revisar y activar RLS en Supabase (ver `docs/database-setup.md`).
