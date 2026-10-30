use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager};

/// Argumento con el que Windows abre la app al encender la computadora.
pub const HIDDEN_ARG: &str = "--hidden";

const OPEN_ID: &str = "open";
const QUIT_ID: &str = "quit";

/// `true` si la app arrancó sola con Windows: queda junto al reloj, sin ventana.
pub fn starts_hidden(args: &[String]) -> bool {
    args.iter().any(|arg| arg == HIDDEN_ARG)
}

/// Muestra la ventana principal, la restaura si estaba minimizada y la enfoca.
pub fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
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
    fn windows_start_stays_hidden() {
        assert!(starts_hidden(&["recibo.exe".into(), "--hidden".into()]));
    }
}
