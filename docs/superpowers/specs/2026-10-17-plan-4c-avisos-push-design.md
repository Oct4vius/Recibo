# Plan 4c — Avisos de presupuesto (locales, sin Firebase) y APK final

Fecha: 2026-10-17. Spec de la app: `docs/superpowers/specs/2026-10-06-plan-4-ui-design.md`. Alcance: `docs/ALCANCE.md`.
Criterio de éxito de la v1: una compra aparece en la app en menos de 20 minutos, sumada al gasto, y avisa si cruza el
presupuesto. Esto es lo único que falta.

## 1. Intención

Que cada persona (el usuario, su pareja y su madre) reciba en su teléfono un aviso cuando su gasto de la semana o del mes
llega al 80 % y al 100 % de su presupuesto, sin tener que abrir la app.

**Decisión del usuario (2026-10-17): sin Firebase y sin montos.** En Android no hay avisos remotos sin Firebase Cloud
Messaging, así que el aviso lo genera **la propia app** como **notificación local**: una tarea en segundo plano pregunta
periódicamente al servidor si hay un umbral recién cruzado. El usuario acepta la puntualidad aproximada que eso implica
(normalmente 15–30 min, a veces más con el teléfono en reposo o con ahorro de batería; si se fuerza el cierre de la app,
no hay avisos hasta volver a abrirla). A cambio, nada pasa por Google ni por Expo y no hay credenciales nuevas.

### Metas
- Aviso al **80 %** y al **100 %** del presupuesto **semanal** y **mensual** (los que ya existen: uno por período y
  persona, en DOP), solo para los umbrales encendidos en Ajustes (`profiles.alert_thresholds`).
- **Una vez por umbral y período**: el 80 % de esta semana avisa una sola vez; la semana siguiente puede volver a avisar.
  Si un gasto salta del 70 % al 105 %, llega **solo el aviso del 100 %** y el 80 % queda dado por avisado.
- **Lo ya cruzado al activar no avisa** (decisión del usuario): al encender "Avisos en este teléfono" o un umbral, los
  umbrales que el período actual ya cruzó quedan reclamados en silencio; solo avisan los cruces posteriores.
- **Cambiar el límite reinicia los avisos del período** (decisión del usuario): al editar el monto de un presupuesto se
  borran sus reclamos del período actual y se reclaman en silencio los umbrales que el nuevo límite ya tiene cruzados.
- **Texto sin montos** (decisión del usuario):
  - 80 %: título **"Llevas el 80 % de tu presupuesto semanal"**, cuerpo **"Toca para ver tu gasto."**
  - 100 %: título **"Llegaste a tu presupuesto semanal"**, cuerpo **"Toca para ver tu gasto."**
  - "mensual" en lugar de "semanal" para el presupuesto del mes.
- Tocar el aviso abre la app en **Inicio** (decisión de Claude).
- **Permiso al activar** (decisión del usuario). En Ajustes → Avisos, un interruptor **"Avisos en este teléfono"**,
  apagado al instalar:
  - Encenderlo → Android pregunta "¿Permitir notificaciones?". Si acepta: se registra la tarea en segundo plano, se
    reclaman en silencio los umbrales ya cruzados y se guarda la preferencia en el teléfono. Si rechaza: el interruptor
    vuelve a apagado y aparece "Avisos bloqueados en el teléfono" con un botón que abre la configuración de Android.
  - Apagarlo o **cerrar sesión** → se cancela la tarea y se borra la preferencia del teléfono.
  - Los interruptores de 80 % y 100 % siguen eligiendo qué umbrales avisan.
- Además de la tarea en segundo plano, **al abrir la app** (o volver a ella) se hace la misma revisión de inmediato.
- **APK final** de la v1 con todo lo anterior.

### No metas
- Avisos remotos (Firebase/FCM, Expo Push), montos en el aviso, presupuestos por categoría, horas de silencio, iOS.
- `push_tokens` queda sin uso en la v1 (no se borra: no bloquea un futuro push remoto).

### Anti-metas
- Avisos repetidos del mismo umbral y período, o dos avisos (80 y 100) por un solo gasto.
- Que el aviso use un total distinto del que muestra la app (misma fuente: `spending_transactions.amount_dop`).
- Que la tarea en segundo plano gaste batería o datos de más (una consulta pequeña por corrida, sin descargar listas).

## 2. Decisiones

| Tema | Decisión |
|---|---|
| Qué cuenta | El mismo gasto que los totales: `spending_transactions.amount_dop` (incluye la conversión USD del 3c, excluye ignorados, reversas y categorías que no cuentan). Períodos en la zona del perfil, semana desde el lunes, exactamente como `get_spending_summary`; la regla de límites de período vive en **un solo lugar** (si hoy está dentro de `get_spending_summary`, se extrae a una función SQL compartida). |
| Evaluación y reclamo (servidor) | Una RPC para `authenticated`, `security definer`, que solo actúa sobre `auth.uid()` (p. ej. `claim_budget_alerts()`): calcula para cada presupuesto activo el umbral más alto cruzado y no avisado (filtrado por `alert_thresholds`), lo **reclama** en `budget_alerts` (`on conflict do nothing`; al reclamar 100 también reclama 80) y devuelve **solo lo que esta llamada reclamó** (período, umbral). Así dos teléfonos o dos corridas no avisan dos veces. Otra RPC (p. ej. `silence_budget_alerts()`) reclama en silencio lo ya cruzado (se llama al activar los avisos o un umbral). |
| Cambio de límite | Un trigger en `budgets` (al cambiar `limit_amount`) borra los `budget_alerts` del período actual de ese presupuesto y reclama en silencio lo ya cruzado con el nuevo límite. |
| Tarea en segundo plano | `expo-background-task` (WorkManager) + `expo-task-manager`, intervalo mínimo de 15 minutos. Requiere sesión válida (la sesión de Supabase en `expo-secure-store` se refresca como hoy); sin sesión no hace nada. Llama a la RPC de reclamo y muestra una notificación local por cada fila devuelta. |
| Notificaciones | `expo-notifications` **solo locales** (sin `google-services.json`, sin token de push). Canal Android "Presupuesto", importancia por defecto. El aviso lleva `data: { kind: 'budget' }`; tocarlo abre la app en Inicio. |
| Preferencia "Avisos en este teléfono" | Se guarda en el teléfono (es por dispositivo). Al iniciar la app con la preferencia encendida y el permiso concedido, se asegura que la tarea esté registrada. |
| APK final | Perfil `production` en `eas.json` (APK, distribución interna) con el mismo entorno de variables que `preview`, versión `1.0.0`. El checklist del teléfono corre antes en `preview`. |

## 3. Componentes

- Migración(es) con pgTAP: límites de período compartidos (si se extraen), RPC de reclamo y de silencio (EXECUTE para
  `authenticated`, actúan solo sobre `auth.uid()`), trigger de cambio de límite.
- App: `src/features/notifications/` (api de las RPC, tarea en segundo plano, permiso, preferencia, armado del texto),
  interruptor y estado bloqueado en `AlertsSection`, revisión al abrir/volver a la app, cancelación al cerrar sesión,
  configuración de `expo-notifications`/`expo-background-task` en `app.json`.
- `sync-mail` no cambia.
- Docs: CLAUDE.md (sección de avisos) y ALCANCE (avisos locales, sin push remoto).

## 4. Pruebas

- pgTAP: 79 % no reclama; 80 % reclama una vez y la segunda llamada devuelve vacío; 70 → 105 % devuelve solo 100 y deja el
  80 reclamado; umbral apagado en el perfil no reclama; presupuesto inactivo no reclama; silenciar con 120 % no devuelve
  nada después; cambiar el límite borra los reclamos del período y vuelve a reclamar en silencio lo ya cruzado; período
  nuevo vuelve a avisar; semana desde el lunes y mes en la zona del perfil (un gasto 23:30 en Santo Domingo cuenta ese
  día); gasto en USD con la tasa del BCRD; ignorados y "Transferencias propias" no suman; un usuario no reclama ni ve
  avisos de otro; `anon` sin EXECUTE.
- Vitest: armado del texto (80/100, semanal/mensual) y la lógica pura del interruptor (permitido, bloqueado, apagado).
- En el teléfono: checklist (activar, rechazar, apagar, cerrar sesión; aviso real al 80 y al 100 con un presupuesto bajo
  de prueba; aviso con la app en segundo plano y tras un rato con la pantalla apagada; tocar el aviso abre Inicio;
  Gmail y Outlook siguen vinculando).

## 5. Pasos del usuario

Aprobar cada paso remoto (migraciones, variables de EAS si cambian, builds `preview` y `production`) y probar en el
teléfono con un presupuesto bajo, devolviéndolo luego a su valor.

## 6. Riesgos

- Android puede espaciar o pausar la tarea (reposo, ahorro de batería, marcas con gestión agresiva). Aceptado por el
  usuario; la revisión al abrir la app cubre el resto.
- Forzar el cierre de la app detiene la tarea hasta volver a abrirla.

## 7. Lo que queda al implementador

Nombres finales de funciones y archivos, el intervalo exacto de la tarea (≥ 15 min) y dónde guardar la preferencia del
teléfono, siempre con tests primero y sin duplicar reglas (períodos, qué cuenta como gasto).
