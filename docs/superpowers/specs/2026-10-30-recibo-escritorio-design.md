# Recibo de escritorio (Windows) para una sola usuaria

Fecha: 2026-10-30. Backend, reglas de datos y lógica: los de Recibo (`CLAUDE.md`, `docs/ALCANCE.md`). Diseño de la app
móvil, solo como referencia de funciones: `docs/superpowers/specs/2026-10-06-plan-4-ui-design.md` y siguientes.

## 1. Intención

La madre del usuario es la tercera usuaria de Recibo, pero no usa el teléfono para esto: **prefiere la computadora**. Esta
app de Windows es **su única forma de usar Recibo**. Al abrirla quiere saber **cuánto ha gastado este mes y en qué**
(palabras del usuario).

Ella usa WhatsApp Web y Facebook, pero **se pierde con los menús**: "mientras más minimalista, mejor". Aun así, la app
debe tener **las demás funciones de Recibo** (pedido del usuario).

### Metas
- **Lo primero que se ve, siempre:** el gasto del mes y en qué categorías se fue.
- **Paridad de funciones** con la app móvil, sin perder la simpleza (ver sección 3).
- **Avisos de presupuesto en Windows**, como en el teléfono, aunque se cierre la ventana. La app sigue junto al reloj,
  como WhatsApp en la computadora (decisión de Claude, aceptada por el usuario).
- **La sesión se pide una sola vez:** la contraseña solo la primera vez; después abre directo en "Este mes" hasta que
  alguien cierre la sesión (decisión del usuario).
- **Actualizaciones sin pasos técnicos:** un botón "Actualizar" cuando hay una versión nueva.

### No metas
- Otro backend, otra base o datos nuevos. Usa el mismo proyecto de Supabase y su misma cuenta.
- Un asistente de bienvenida o un tutorial: **el usuario instala y configura la app** (entra con la cuenta de ella y
  vincula su correo) la primera vez (decisión del usuario).
- macOS, Linux, una versión web o una tienda de aplicaciones.
- El estilo Persona 5 de la app móvil.
- Firma del instalador con certificado de Windows (es pago; ver Restricciones).

### Antimetas (fracaso aunque funcione)
- **Que se pierda buscando algo, o que no entienda la interfaz** (palabras del usuario).
- Menús escondidos (tres puntos, clic derecho, hamburguesa), íconos sin texto o palabras técnicas ("vincular cuenta",
  "historial", "sincronizar", "ignorado").
- Que un total de la app no cuadre con lo que dice el teléfono para la misma cuenta.

## 2. Decisiones de cómo se construye

- **Tauri 2** (decisión de Claude, aceptada por el usuario): interfaz web (React + TypeScript) en una ventana nativa de
  Windows; instalador pequeño.
- **Vive en el mismo repositorio**, en `desktop/` (decisión de Claude, aceptada por el usuario), por estas razones:
  - comparte los tipos generados, las reglas de fechas y montos y las consultas, sin copiarlos (SOLID y DRY, regla del
    usuario);
  - usa las mismas migraciones y pruebas pgTAP;
  - la CI que protege `main` también la cubre.
  Todo en `dev`, como siempre.
- **Reutilización:** la lógica pura de `src/` (`src/lib/money.ts`, `src/lib/dates.ts`, los filtros, `history/categories.ts`,
  `labels`, las funciones de `api.ts` que solo llaman a Supabase…) se usa desde `desktop/`, no se duplica. Lo que hoy
  depende del teléfono se separa detrás de una interfaz pequeña. Por ejemplo, `src/lib/supabase.ts` usa `expo-secure-store`
  para guardar la sesión: la app de escritorio inyecta su propio almacenamiento.
- **Backend sin cambios esperados.** `link-account` ya acepta un código obtenido en el navegador con redirect
  `http://localhost:53682/callback`, para Gmail y para Outlook (lo usan `scripts/dev-link-gmail.ts` y
  `scripts/dev-link-outlook.ts`).
- **Bun** para todo lo de JavaScript; **nunca** npm, npx ni yarn (regla del proyecto). La parte de Tauri usa Cargo.
- **Costo cero**: GitHub Releases (repo público) para distribuir y actualizar, sin servicios pagos.

## 3. La app

### 3.1 Estructura: columna fija a la izquierda (elegida por el usuario)
- Una ventana con una **columna fija** de seis secciones, **siempre visibles**, con ícono **y** nombre:
  - **Este mes** (abre por defecto)
  - **Movimientos**
  - **Meses anteriores**
  - **Presupuesto**
  - **Mis correos**
  - **Ajustes**
- La sección activa se marca con el color del papel, como una pestaña del ticket.
- No hay menús desplegables ni submenús en la columna.
- Maqueta de referencia (no versionada): `.superpowers/brainstorm/*/content/desktop-layout.html`, opción A.

### 3.2 Este mes
Propuesta de Claude, mostrada en la maqueta A:

- **Arriba:** "Octubre 2026" con flechas ‹ › para ver meses anteriores sin cambiar de pantalla. La flecha › se desactiva
  en el mes actual.
- **Total del mes** en grande (`formatMoney`) y "Llevas N gastos este mes".
- **Barra del presupuesto mensual** (solo el mensual en esta pantalla, porque ella piensa en el mes; el semanal vive en
  Presupuesto; decisión de Claude): "77 % de tu presupuesto · Te quedan RD$ …". Desde el 100 %: "Te pasaste por RD$ …",
  con la barra en rojo. Sin presupuesto: "Aún no tienes presupuesto" y un enlace a la sección Presupuesto.
- **"En qué se fue":** las categorías de mayor a menor, con monto, porcentaje y una barrita, y "Sin categoría" al final en
  gris. Mismo orden y mismos datos que el desglose del teléfono (`get_category_spending`), así que siempre cuadra con el
  total.
- **Clic en una categoría** → Movimientos filtrado por esa categoría y ese mes.
- **Botón visible "＋ Agregar gasto"** (gasto manual, para el efectivo): abre un panel con monto, comercio, categoría y
  fecha, con las mismas reglas del teléfono (`source = 'manual'`, monto en centavos enteros).
- **Mes sin gastos:** "Aún no hay gastos este mes."

### 3.3 Las demás secciones (paridad con el teléfono; textos y distribución propuestos por Claude)
- **Movimientos:**
  - lista paginada (keyset, como el teléfono), agrupada por día;
  - filtros **a la vista** (mes, categoría, banco), no detrás de un botón de filtros;
  - clic en un gasto → panel lateral para cambiar la categoría, "No contar este gasto" (ignorar) y "Ya lo revisé";
  - los gastos manuales se pueden editar y borrar, con confirmación;
  - los gastos en dólares muestran `≈ RD$ …`.
- **Meses anteriores:**
  - barras por mes con el desglose por categoría del mes elegido (la misma lógica del teléfono);
  - Mes como vista principal; Semana, Año y "Todo" como opciones a la vista.
- **Presupuesto:**
  - el monto mensual y el semanal, cada uno con un campo grande;
  - umbrales de aviso (80 % y 100 %).
- **Mis correos:**
  - qué correo está conectado y su estado en palabras ("Funcionando", "Dejó de funcionar");
  - el usuario vincula desde aquí (Gmail u Outlook) y puede desconectar;
  - puede haber más de un correo (como en el teléfono): una fila por correo;
  - si un correo falla: "Este correo dejó de conectarse. Pide ayuda para volver a conectarlo." (decisión de Claude: ella
    no repara la conexión sola; sin nombres propios en el código, porque el repo es público).
- **Ajustes:**
  - categorías propias y reglas ("Siempre poner <comercio> en <categoría>");
  - avisos encendidos o apagados;
  - tasa del dólar de respaldo;
  - cambiar contraseña (con la contraseña actual, como el teléfono);
  - "Cerrar sesión";
  - la versión de la app.

### 3.4 Inicio de sesión y sesión
- Pantalla con correo y contraseña (registro cerrado: sin "Crear cuenta" ni "Olvidé mi contraseña", como el teléfono).
- **Solo la primera vez** (decisión del usuario). La sesión se guarda en el almacén de credenciales de Windows; nunca en
  un archivo de texto plano.
- Abre directo en "Este mes" hasta "Cerrar sesión".
- Si la sesión expira sin remedio: vuelve la pantalla de inicio con "Vuelve a escribir tu contraseña".

### 3.5 Vincular el correo
- **Flujo del navegador:** se abre el navegador, ella (o el usuario) entra en Google o Microsoft, y la app recibe el
  código en `http://localhost:53682/callback`. Se valida `state`; Outlook usa PKCE.
- El código va a `link-account` con `{ provider: 'gmail', code, redirectUri }` o
  `{ provider: 'outlook', code, codeVerifier, redirectUri }`.
- **Reglas de seguridad intactas:**
  - la app **nunca** canjea el código ni ve tokens;
  - el refresh token sigue solo en Vault;
  - scopes de solo lectura.
- Mientras espera: "Termina de entrar en la ventana del navegador…" y un botón "Cancelar".

### 3.6 Avisos de presupuesto
- Notificaciones de Windows con el mismo texto que el teléfono: `Llevas el 80 % de tu presupuesto mensual`, cuerpo
  `Toca para ver tu gasto.`, sin montos.
- Hacer clic en el aviso abre la ventana en "Este mes".
- Mismo reclamo en el servidor (`claim_budget_alerts`). Nunca se reclama sin sesión, sin la preferencia encendida o sin
  permiso de notificaciones (la misma regla `shouldCheck` del teléfono).
- **Al encender los avisos:** primero `silence_budget_alerts()`, igual que el teléfono.
- **Revisión:** al abrir, al volver a la ventana y cada 15 minutos mientras la app corre.
- **Junto al reloj:**
  - cerrar la ventana la oculta (la app sigue en el área de notificaciones);
  - el ícono tiene "Abrir Recibo" y "Salir";
  - abrir Recibo al encender la computadora es una opción en Ajustes, apagada por defecto (decisión del usuario). Si está
    apagada, los avisos solo llegan después de abrir la app; encendida, arranca oculta junto al reloj.

### 3.7 Actualizaciones (decisión de Claude)
- Se publican en GitHub Releases del repo, con el actualizador de Tauri (artefactos firmados con su clave, que es gratis).
- Al abrir, si hay versión nueva: una franja arriba con "Hay una versión nueva" y un botón "Actualizar". La app se
  actualiza y se reinicia sola.
- Nunca se actualiza a mitad de algo sin avisar.

## 4. Estilo y movimiento (propuesta de Claude con los criterios de Emil Kowalski)

- **Estilo "recibo"** (maqueta A, elegida por el usuario para que se vea más divertida): cada pantalla es un ticket de papel
  con el borde de abajo rasgado, letra de ticket y líneas punteadas. Los paneles laterales conservan la letra normal.
- **Colores:**
  - fondo claro y cálido, texto casi negro, contraste AA como mínimo;
  - **un solo color de acento**, un verde tranquilo, para la sección activa, los botones principales y las barras;
  - el rojo solo aparece si se pasa del presupuesto;
  - paleta en un solo archivo de tokens, como `colors.json` en el teléfono.
- **Letra:** grande. Unos 17–18 px de base, el total del mes alrededor de 48 px y los botones de al menos 44 px de alto.
- **Palabras de todos los días:** "Meses anteriores", "Mis correos", "No contar este gasto", "Ya lo revisé". Cada botón
  dice lo que hace; no hay íconos solos.
- **Movimiento casi nulo** (es una herramienta que se usa a menudo):
  - las secciones cambian **al instante**, sin deslizarse;
  - los botones se hunden un poco al hacer clic (`scale(0.97)`, alrededor de 120 ms, ease-out);
  - los paneles laterales entran en unos 200 ms con un ease-out fuerte (`cubic-bezier(0.23, 1, 0.32, 1)`) y salen más
    rápido;
  - las barras se llenan una vez al cargar, sin rebote;
  - nada entra escalonado ni se mueve por adorno, salvo el sello "ANOTADO" al guardar un gasto: es poco frecuente y
    confirma la acción;
  - con "reducir animaciones" de Windows (`prefers-reduced-motion`), solo cambios de opacidad.
- **Hover** solo en computadoras con mouse (`@media (hover: hover)`): un cambio de fondo suave.
- **Carga:** placeholders con la forma del contenido, nunca una pantalla en blanco. Errores en una frase clara con
  "Reintentar".

## 5. Pruebas y calidad
- Vitest para la lógica pura nueva o extraída (la misma política del proyecto: sin tests de componentes ni pantallas).
- Lo compartido con el teléfono sigue con sus pruebas de siempre; `bun run check` debe seguir verde para las dos apps.
- Si hiciera falta un cambio de base (no se espera), migración + pgTAP como siempre.
- La CI gana un job que compila y prueba `desktop/`.
- Antes de entregar: probar el instalador en una cuenta de Windows limpia, de punta a punta:
  1. iniciar sesión;
  2. vincular un correo;
  3. ver "Este mes";
  4. recibir un aviso;
  5. actualizar a una versión de prueba.

## 6. Restricciones conocidas
- **Clave del actualizador:** la clave privada que firma las actualizaciones nunca va al repo. Vive en un secreto de
  GitHub Actions (o solo en la máquina del usuario); la clave pública va en la configuración de Tauri.
- **Herramientas nuevas en la máquina de desarrollo:** Rust y las Build Tools de Visual Studio, que Tauri necesita. Se
  instalan con la aprobación del usuario antes de empezar.
- **Instalador sin firmar** (el certificado es pago): Windows SmartScreen muestra una advertencia la primera vez. La pasa
  el usuario al instalar.
- **Google sigue "En producción" sin verificar:** la pantalla de advertencia de Google también aparece al vincular Gmail
  desde la computadora.
- El redirect `http://localhost:53682/callback` ya está registrado en los clientes OAuth (lo usan los scripts de la
  terminal). Si el puerto está ocupado en la computadora de ella, vincular falla con un mensaje claro; no se cambia de
  puerto, porque Microsoft no ignora el puerto en cuentas personales.
- Supabase free puede pausar el proyecto: mismo estado "backend pausado" que el teléfono, sin reintentar en bucle.
- `docs/ALCANCE.md` debe anotar esta app de escritorio (hoy no la menciona; "versión web" sigue fuera de alcance).

## 7. Lo que decide el constructor
- La forma de compartir el código con `src/` (alias de rutas, un paquete interno del workspace o mover lo puro a una
  carpeta común), siempre que no se duplique lógica y que el teléfono siga igual.
- La biblioteca de componentes, de haber alguna. Debe permitir controlar los detalles de movimiento de la sección 4; nada
  pesado.
- Los plugins de Tauri para el almacén de credenciales, las notificaciones, el ícono junto al reloj, el arranque con
  Windows y el actualizador.
- El ícono de la app.
