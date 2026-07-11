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
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
EXPO_PUBLIC_PROGRESS_USER_ID=
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google_web_oauth_client_id>
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=<google_android_oauth_client_id>
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=<google_ios_oauth_client_id>
```

- `EXPO_PUBLIC_API_URL` — URL base del backend. Opcional: si no se define, se autodetecta desde `Constants.expoConfig.hostUri` (útil en Expo Go con dispositivos físicos). En Android, `localhost` se mapea automáticamente a `10.0.2.2` para emuladores.
- `EXPO_PUBLIC_USE_MOCKS` — Cuando es `true`, todos los servicios devuelven datos hardcodeados sin llamar al backend. Valor por defecto: `false`.
- `EXPO_PUBLIC_SUPABASE_URL` — URL del proyecto Supabase. Requerida para el chat en tiempo real (Supabase Realtime).
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — Clave anónima pública de Supabase. Requerida para el chat en tiempo real.
- `EXPO_PUBLIC_PROGRESS_USER_ID` — ID de usuario para el módulo de progreso en modo mock. Por defecto: `user-marta`.

Para probar desde un celular físico, reemplazar `localhost` por la IP local de la máquina (ej. `http://192.168.1.x:3000/api`).

### Google Sign-In

Variables:

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` - OAuth Client ID tipo Web. La app nativa lo usa para solicitar `idToken` y enviarlo a `POST /api/auth/google`.
- `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` - OAuth Client ID tipo Android, asociado al package `com.eos.skincare` y a las huellas SHA del build. La libreria no lo recibe por `configure()`, pero debe existir en Google Cloud para que Android valide el cliente nativo.
- `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` - OAuth Client ID tipo iOS, asociado al bundle id `com.eos.skincare`. `app.config.js` deriva el URL scheme `com.googleusercontent.apps...` durante el build/prebuild.

El paquete instalado `@react-native-google-signin/google-signin` en su version publica soporta Android e iOS. En web, la implementacion incluida lanza un error de metodo no implementado; por eso EOS deshabilita este flujo en web. Si se necesita Google Sign-In web, hay que implementar un flujo web separado compatible con Google Identity Services y el contrato `POST /api/auth/google`.

Configuracion requerida:

1. Crear en Google Cloud un OAuth Client ID tipo Web y cargarlo en `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`.
2. Crear un OAuth Client ID tipo Android para `com.eos.skincare`, con las huellas SHA-1/SHA-256 del keystore usado por el build, y cargarlo en `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`.
3. Crear un OAuth Client ID tipo iOS para `com.eos.skincare` y cargarlo en `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`.
4. Ejecutar el build nativo con esas variables presentes para que `app.config.js` pueda registrar el URL scheme de iOS.
5. No registrar ni imprimir `idToken`, access tokens ni refresh tokens.

### Sesión en frontend

En iOS y Android la sesión se guarda con `expo-secure-store`. En web se mantiene la estrategia SPA existente basada en `localStorage`; esto permite conservar la sesión entre recargas, pero no protege frente a un XSS que ejecute JavaScript en el origen de la app. Por eso no se deben loguear tokens ni renderizar HTML no confiable.

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
