# Agregar un banco o una plantilla desde `.eml` reales

Receta para cuando haya correos reales de un banco nuevo (Banreservas primero) o de un formato nuevo de un banco
conocido (por ejemplo, correos en "sin procesar" de Ajustes). Reglas de fondo en `CLAUDE.md` (sección "Parsers de
correos bancarios"): nunca se adivina un monto ni se inventa un parser sin correo real.

## 1. Conseguir los `.eml`

- **Los entrega el usuario**: guardarlos en `fixtures-raw/<bank>/_downloaded/`.
- **O se descargan** de los correos sin procesar de una cuenta ya vinculada:

  ```bash
  bun run dev:download-eml --account <correo> [--target remote] [--all]
  ```

  Qué hace: busca en `unparsed_emails` (los no resueltos; con `--all`, todos) de esa cuenta, abre el login del
  proveedor en el navegador y baja el MIME original de cada correo a `fixtures-raw/<bank>/_downloaded/`
  (`<bank>` = `_unknown` si el correo no tiene banco). Usa un access token **en memoria** obtenido del login; **no**
  lee los tokens de Vault y **nunca revoca** el permiso de Google (revocar desvincularía la cuenta real). Si
  inicias sesión con otra cuenta, aborta. Los que ya existen se saltan. Para Gmail necesita `GOOGLE_CLIENT_ID` y
  `GOOGLE_CLIENT_SECRET` en `supabase/functions/.env`; para Outlook, `EXPO_PUBLIC_MS_CLIENT_ID` en `.env.local`.

`fixtures-raw/` está en `.gitignore`: nada de lo que hay ahí se versiona.

## 2. Anonimizar y generar la fixture

1. Crear (una vez) `fixtures-raw/anonymize.local.json` con datos **ficticios** en `replace`:

   ```json
   {
     "replacements": [
       { "find": "GOMEZ PEÑA, MARIA", "replace": "JUAN PEREZ" },
       { "find": "# 5678", "replace": "# 1234" },
       { "find": "XXXXXXX5678", "replace": "XXXXXXX1234" },
       { "find": "8095551234", "replace": "8095550000" },
       { "find": "CONF-998877", "replace": "CONF-000000" }
     ],
     "forbidden": ["persona@gmail.example"]
   }
   ```

   - `replacements`: nombres, últimos 4 de tarjeta o cuenta, números de cuenta, confirmaciones y teléfonos reales.
     Sin distinguir mayúsculas; se aplican del término más largo al más corto, y también si el correo trae el
     nombre detrás de una entidad HTML (`PE&Ntilde;A`).
   - `forbidden`: términos sin reemplazo que no deben aparecer (por ejemplo el correo de la persona).
   - Un término de **solo dígitos** cuenta como número completo: `5678` no toca `15,678.00` ni `956789`.
   - **Límite conocido:** si un último-4 parece un año (`2026`), el número suelto también aparece en las fechas
     (`16/09/2026`). Reemplaza la forma enmascarada completa (`# 2026`, `XXXX2026`) en vez del número suelto.
   - Además, toda secuencia de 10 a 15 dígitos se enmascara sola.

2. Anonimizar:

   ```bash
   bun run eml:anonymize fixtures-raw/<bank>/_downloaded/<x>.eml fixtures-raw/<bank>/<caso>.eml
   ```

   Escribe un `.eml` mínimo (From, Subject, Date, Message-ID y el HTML en UTF-8 plano). Si después de anonimizar
   queda algún término de la config en el `.eml` o en el texto normalizado, **no escribe** y sale con error.
   Revisa a ojo el texto normalizado que imprime (montos y fechas reales se conservan; nada personal).

3. Generar la fixture derivada (se versiona):

   ```bash
   bun run fixtures:build
   ```

   No es recursivo: lo que está en `_downloaded/` nunca genera fixtures.

## 3. Banco nuevo: remitente y registro

Confirmar el remitente exacto y el dominio en el `.eml` (`From`). Mover el banco de `parsers/candidates.ts` a un
`BankParser` en `parsers/<bank>/index.ts` con `senderDomains`, `senderAddresses`, `templates` e `ignored`, y
registrarlo en `parsers/index.ts`. `senderAddresses` alimenta tanto el `$filter` de Outlook como la consulta de
Gmail (`bankSenderAddresses()`): una sola fuente.

## 4. Una plantilla por formato

Por cada formato distinto: escribir **primero** el test (`<template>.test.ts`) que carga la fixture JSON y asserta
la lista exacta de `ParsedTransaction`; luego la plantilla en `parsers/<bank>/<template>.ts`, con `parseAmount()` y
`parseLocalDate()` de `normalize.ts` (nada de regex ad hoc para montos o fechas). Política todo o nada: si una fila
no se puede mapear, `parse()` devuelve `[]`. Los correos conocidos que no son un gasto (ingresos, códigos de
seguridad, publicidad del banco) se declaran como `IgnoredEmail` del banco.

## 5. Verificar y documentar

`bun run check` en verde. Revisión del diff. Documentar el formato del banco en `CLAUDE.md` (sección del banco:
asunto, columnas, mapeo de estados, formatos de fecha y monto).

## 6. Desplegar y reprocesar (con aprobación del usuario)

1. `bunx supabase functions deploy sync-mail`.
2. Reiniciar el cursor de las cuentas afectadas para releer desde el inicio (la ingesta es idempotente por
   `message_id`). Ejemplo de SQL para una cuenta `active` (reemplazar `<user_id>` y `<account_id>`):

   ```sql
   update public.linked_accounts
   set sync_cursor = public.initial_sync_cursor('<user_id>')
   where id = '<account_id>' and status = 'active';
   ```

3. `bun run dev:sync --target remote` (o esperar al cron de 15 min).
4. Marcar `unparsed_emails.resolved = true` de los que ahora se leen o se ignoran.

## 7. Antes de `git push`

El repositorio es público: revisar el diff completo y confirmar que ningún dato personal (nombres, correos,
cuentas, teléfonos, confirmaciones) quedó en `parsers/<bank>/fixtures/*.json` ni en tests. `fixtures-raw/` no se
versiona.
