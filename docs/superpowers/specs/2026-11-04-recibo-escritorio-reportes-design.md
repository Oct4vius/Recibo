# Reportes para imprimir o guardar en PDF (Recibo de escritorio)

Fecha: 2026-11-04. Se suma a `docs/superpowers/specs/2026-10-30-recibo-escritorio-design.md`; valen sus reglas de
estilo, palabras, seguridad y datos (y las de `CLAUDE.md`).

## 1. Intención

La madre del usuario lleva sus cuentas en una **libreta**: anota cada gasto con la fecha, la categoría y el monto, y suma
al final del mes. Pidió poder **sacar o imprimir reportes** de lo que ha gastado, para llevar sus cuentas y ver en qué
gasta cada mes (palabras del usuario). El reporte le da en papel, ya hecho, lo que hoy escribe a mano.

### Metas
- **Reporte del mes:** cada gasto del mes agrupado por categoría, con subtotales y el total (maqueta B, elegida por el
  usuario).
- **Reporte del año:** el total por categoría y por mes, sin la lista de cada gasto (decisión del usuario: unos 300
  gastos no caben en una hoja y no los necesita).
- **Imprimir** y **guardar en PDF**, los dos (pedido del usuario).
- **Encontrarlo sola:** una sección nueva **"Reportes"** en la columna (opción A, elegida por el usuario).

### No metas
- Excel, CSV o enviar el reporte por correo o WhatsApp.
- Rangos de fechas a la medida, semanas o varios meses juntos.
- Reportes de otra persona, comparar meses o gráficos.
- Elegir qué columnas salen o cambiar el diseño de la hoja.

### Antimetas (fracaso aunque funcione)
- Que un total del reporte no cuadre con lo que dice la app ("Este mes", "Meses anteriores") o el teléfono para el mismo
  período.
- Que se pierda en la ventana de impresión de Windows para guardar el PDF.
- Una hoja que impresa se lea mal: letra chica, gris claro o colores que no salen en blanco y negro.

## 2. La sección "Reportes"

- Nueva sección en la columna fija, **entre "Presupuesto" y "Mis correos"**, con ícono y nombre "Reportes".
- Arriba, dos opciones a la vista: **"Del mes"** (abre así) y **"Del año"**.
- Debajo, el período con las flechas ‹ › de siempre: `Octubre 2026` o `2026`. Abre en el mes o el año actual; la flecha ›
  se desactiva en el actual, como en "Este mes".
- **Vista previa:** la hoja tal como saldrá impresa, en la misma pantalla.
- Dos botones visibles: **"Imprimir"** y **"Guardar en PDF"**.
  - "Imprimir" abre la ventana de impresión de Windows con la hoja.
  - "Guardar en PDF" guarda el archivo sin pasar por la ventana de impresión: pregunta dónde guardarlo con la ventana
    normal de Windows, con un nombre ya puesto (`Recibo - Octubre 2026.pdf`, `Recibo - 2026.pdf`) y la carpeta Documentos
    sugerida. Al terminar: `PDF guardado` (un aviso breve, como "Gasto guardado").
- Estados: cargando, placeholders con la forma de la hoja; error, una frase con "Reintentar", como el resto de la app.
- Un período sin gastos muestra la hoja con `No hubo gastos en octubre.` y los botones siguen disponibles.

## 3. La hoja del mes (maqueta B)

- Tamaño **carta**, vertical.
- Título `Gastos de octubre 2026` y la línea `Impreso el 4 de noviembre de 2026` (fecha local del perfil).
- Una sección por categoría, de la que **más gastó a la que menos**, y **"Sin categoría" al final** (mismo orden que "En qué
  se fue").
  - Cada gasto: fecha corta (`1 oct`), en qué (el comercio o la descripción; `Sin descripción` si no tiene) y monto.
  - Dentro de cada categoría, los gastos por fecha, del más viejo al más nuevo.
  - Al final de la sección: `Subtotal Supermercado` y su monto.
- Al final de la hoja: `Total del mes (23 gastos)` y el total.
- **Qué entra:** solo lo que **cuenta como gasto**, con la misma definición que usan los totales de la app (la vista
  `public.spending_transactions`). No salen los gastos marcados "No contar este gasto", las devoluciones ni las categorías
  que no cuentan como gasto (p. ej. "Transferencias propias"). Así el total es el de "Este mes".
- **Dólares:** el gasto muestra su monto en dólares y al lado el equivalente `≈ RD$ …` (el mismo que muestra la app). Los
  subtotales y el total van en pesos, como en la app.
- Si no cabe en una hoja, sigue en la siguiente; el encabezado de una categoría no queda solo al pie de una página.

## 4. La hoja del año

- Título `Gastos de 2026` y la línea `De enero a octubre · impreso el 4 de noviembre de 2026`. El año en curso llega hasta
  el mes actual; un año pasado dice `De enero a diciembre`.
- El total del año en grande y `214 gastos en el año`.
- Dos bloques, uno al lado del otro si caben:
  - **Por categoría:** cada categoría con su porcentaje del año y su monto, de mayor a menor, "Sin categoría" al final, y
    el total. Debajo de "Sin categoría", sus **dos gastos más grandes** del año: fecha, en qué y monto (pedido del
    usuario). Si hay uno solo, uno; si no hay, nada.
  - **Por mes:** cada mes del período con su monto, y el total. Un mes sin gastos sale con `RD$ 0.00`.
- Cabe en una hoja.

## 5. Estilo

- El estilo "recibo" de la app (letra de ticket en títulos y montos, líneas punteadas), pero **en blanco y negro** y con
  texto oscuro: nada que dependa del color para leerse. Sin fondo de color en la impresión.
- Letra base de al menos 11 pt impresa; los montos alineados a la derecha en columna.
- La vista previa en pantalla es la misma hoja sobre el papel de la app.

## 6. Datos y reglas

- **Las sumas, en SQL.** Los subtotales por categoría y el total salen de las RPC que ya cuadran con la app
  (`get_category_spending`, `get_spending_summary`, `get_history`), nunca de sumar en el cliente.
- **La lista de gastos del mes** necesita, para cada gasto que cuenta, su fecha, comercio, categoría, monto, moneda y
  equivalente en pesos. Hoy la vista `spending_transactions` no trae el comercio ni el id; probablemente haga falta una
  migración pequeña (ampliar la vista o una RPC de solo lectura acotada al mes) con su prueba pgTAP. **No** se repite el
  filtro de "qué cuenta como gasto" en la app.
- Los dos gastos más grandes de "Sin categoría" en el año, también con la definición de la vista, en SQL.
- Fechas y límites de mes y año en la zona del perfil, con las reglas de siempre (`budget_period_bounds`, `dates.ts`).
- Nada de esto escribe en la base: los reportes son solo lectura.
- Sin servicios nuevos ni pagos.

## 7. Pruebas

- Vitest para la lógica pura nueva (agrupar y ordenar, textos, nombre del archivo, partir en páginas si hay lógica propia).
- pgTAP si cambia la base: que la lista del mes cuadre exactamente con `get_category_spending` del mismo mes, incluidos
  gastos en dólares, ignorados y categorías que no cuentan.
- Prueba manual: imprimir y guardar un PDF de un mes con gastos en dólares y de un año; comparar los totales con "Este mes"
  y "Meses anteriores".

## 8. Lo que decide el constructor

- Cómo se genera el PDF sin pasar por la ventana de impresión (la impresión del WebView o una librería), y cómo se arma la
  vista previa.
- El permiso de Tauri para guardar el archivo (lo mínimo: la ventana de "Guardar como" y escribir ese archivo).
- La forma exacta de la consulta o migración para la lista del mes.
- Íconos y espaciados de la sección.

### Decisiones mías (de Claude), por si el usuario quiere cambiarlas
- El nombre de tu madre no va en la hoja: la app no guarda nombres, solo el correo.
- Dentro de cada categoría, los gastos van del más viejo al más nuevo, como en una libreta.
- "Guardar en PDF" sugiere la carpeta Documentos y un nombre ya puesto.
- La sección va entre "Presupuesto" y "Mis correos".
