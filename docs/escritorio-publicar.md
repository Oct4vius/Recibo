# Publicar la app de escritorio

El instalador de Windows lo construye la Action `release-desktop`
(`.github/workflows/release-desktop.yml`) al empujar una etiqueta `desktop-v*`.
Publica el instalador y `latest.json` en GitHub Releases; las copias instaladas
se actualizan solas desde ahí.

## Receta

1. Subir la versión en **dos** archivos, con el mismo número:
   - `desktop/src-tauri/tauri.conf.json` (`version`: es la que muestra la app).
   - `desktop/src-tauri/Cargo.toml` (`version`; luego `cargo check` actualiza `Cargo.lock`).
2. Commit y push a `main`.
3. Etiquetar con la misma versión y empujar la etiqueta:
   `git tag desktop-v1.0.1 && git push origin desktop-v1.0.1`
4. Esperar la Action (pestaña Actions de `Oct4vius/Recibo`). Corre `desktop:check`
   y `desktop:rust-test` antes de construir; si fallan, no publica nada.
5. Revisar la release `Recibo <versión>` y probar el instalador.

`bun run desktop:build-debug` sirve para probar el instalador en local; no firma
actualizaciones y no se usa en la Action.

## Secretos de GitHub

Solo nombres; los valores no van en el repo ni en este documento.

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `EXPO_PUBLIC_MS_CLIENT_ID`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

Las cuatro `EXPO_PUBLIC_*` las exige el build (`missingEnv`): sin ellas falla.

## Si se pierde la clave de actualizaciones

La clave privada vive en `$HOME/.tauri/recibo-updater.key` y, aparte, en el
gestor de contraseñas del usuario (con su contraseña). La pública está en
`tauri.conf.json`.

Si se pierde, no se puede firmar nada que las copias instaladas acepten: dejan de
recibir actualizaciones y hay que **reinstalar a mano** una versión nueva, hecha
con una clave nueva (cuya pública reemplaza a la de `tauri.conf.json`).

## SmartScreen

El instalador no está firmado con un certificado de Windows. La primera vez
SmartScreen muestra "Windows protegió su PC": elegir "Más información" y luego
"Ejecutar de todas formas". Las actualizaciones desde la app no repiten el aviso.

## Comportamiento que conviene saber

- Recibo **no** arranca con Windows por su cuenta: es una casilla en Ajustes,
  apagada por defecto.
- Hacer clic en una notificación de Windows abre la app solo mientras la
  notificación está en pantalla; desde el Centro de notificaciones no.
- Si alguien bloquea las notificaciones de Recibo en la Configuración de Windows,
  la app no puede saberlo y un aviso puede perderse.
