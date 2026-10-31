use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use std::path::Path;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_notification::NotificationExt;

/// Argumento con el que Windows abre la app al encender la computadora.
pub const HIDDEN_ARG: &str = "--hidden";

/// Cada cuánto la ventana revisa los avisos de presupuesto, esté a la vista o no.
pub const ALERTS_TICK_SECS: u64 = 900;
/// `actionId` que el plugin informa al tocar el cuerpo de un aviso.
const TAP_ACTION: &str = "tap";

const OPEN_ID: &str = "open";
const QUIT_ID: &str = "quit";

/// `true` si la app arrancó sola con Windows: queda junto al reloj, sin ventana.
pub fn starts_hidden(args: &[String]) -> bool {
    args.iter().any(|arg| arg == HIDDEN_ARG)
}

const UPDATE_MARKER: &str = "update-restart";

/// `true` si la ventana debe verse al arrancar: siempre, salvo un arranque de Windows (`--hidden`)
/// que no viene de una actualización (el instalador reenvía los argumentos del proceso anterior).
pub fn should_show(args: &[String], restarted_by_update: bool) -> bool {
    !starts_hidden(args) || restarted_by_update
}

/// Deja la marca de "reinicio por actualización" en `dir`.
pub fn write_update_marker(dir: &Path) -> std::io::Result<()> {
    std::fs::create_dir_all(dir)?;
    std::fs::write(dir.join(UPDATE_MARKER), b"1")
}

/// Borra la marca; `true` si existía. Una marca sobrante solo muestra la ventana una vez.
pub fn take_update_marker(dir: &Path) -> bool {
    std::fs::remove_file(dir.join(UPDATE_MARKER)).is_ok()
}

/// Muestra la ventana principal, la restaura si estaba minimizada y la enfoca.
pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

/// `true` si la acción es un toque sobre el aviso (y no uno de sus botones).
pub fn is_tap(action_id: &str) -> bool {
    action_id == TAP_ACTION
}

/// Al tocar un aviso: trae la ventana al frente y le pide abrir Este mes. Debe registrarse antes de mostrar avisos.
pub fn open_month_on_tap(app: &AppHandle) -> tauri_plugin_notification::Result<()> {
    let handle = app.clone();
    app.notification().on_action(move |performed| {
        if is_tap(performed.action_id()) {
            show_main(&handle);
            let _ = handle.emit("open-month", ());
        }
    })
}

/// Pulso de 15 min: la ventana revisa los avisos aunque nadie la mire.
pub fn start_alerts_tick(app: &AppHandle) {
    let handle = app.clone();
    tauri::async_runtime::spawn(async move {
        loop {
            tokio::time::sleep(Duration::from_secs(ALERTS_TICK_SECS)).await;
            let _ = handle.emit("alerts-tick", ());
        }
    });
}

/// Ícono junto al reloj: clic izquierdo abre la ventana; el menú tiene Abrir y Salir.
pub fn build_tray(app: &tauri::App) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, OPEN_ID, "Abrir Recibo", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_ID, "Salir", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&open, &quit])?;

    let mut tray = TrayIconBuilder::new()
        .tooltip("Recibo")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
            OPEN_ID => show_main(app),
            QUIT_ID => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normal_start_shows_window() {
        assert!(!starts_hidden(&["recibo.exe".into()]));
    }

    #[test]
    fn only_the_body_click_opens_the_month() {
        assert!(is_tap("tap"));
        assert!(!is_tap("dismiss"));
    }

    #[test]
    fn should_show_covers_the_four_combinations() {
        let normal = vec!["recibo.exe".to_string()];
        let hidden = vec!["recibo.exe".to_string(), "--hidden".to_string()];
        assert!(should_show(&normal, false));
        assert!(should_show(&normal, true));
        assert!(!should_show(&hidden, false));
        assert!(should_show(&hidden, true));
    }

    #[test]
    fn update_marker_is_taken_once() {
        let dir = std::env::temp_dir().join(format!("recibo-marker-{}", std::process::id()));
        assert!(!take_update_marker(&dir));
        write_update_marker(&dir).unwrap();
        assert!(take_update_marker(&dir));
        assert!(!take_update_marker(&dir));
        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn windows_start_stays_hidden() {
        assert!(starts_hidden(&["recibo.exe".into(), "--hidden".into()]));
    }
}
