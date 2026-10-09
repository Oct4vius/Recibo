-- Preferencia de push por umbral (4b-2). Global por usuario: existe antes de crear un presupuesto.
-- Apagar un umbral solo apaga el push; la app sigue mostrando el borde amarillo y la CallingCard.
-- El sync (Plan 3) solo envía push de los umbrales presentes aquí.
alter table public.profiles
  add column alert_thresholds integer[] not null default array[80, 100]
  constraint profiles_alert_thresholds_allowed
    check (alert_thresholds <@ array[80, 100] and array_position(alert_thresholds, null) is null);

-- Una sola fuente para los umbrales: la del perfil. Ningún código leía esta columna.
alter table public.budgets drop column thresholds;
