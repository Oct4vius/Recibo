mod login;
mod shell;

use keyring::{Entry, Error};
use tauri::Manager;

const SERVICE: &str = "recibo-desktop";

fn entry(key: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, key).map_err(|e| e.to_string())
}

/// Lee un secreto del Administrador de credenciales; `None` si no existe.
#[tauri::command]
fn secret_get(key: String) -> Result<Option<String>, String> {
    match entry(&key)?.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(Error::NoEntry) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn secret_set(key: String, value: String) -> Result<(), String> {
    entry(&key)?.set_password(&value).map_err(|e| e.to_string())
}

/// Borrar algo que no existe no es un error.
#[tauri::command]
fn secret_delete(key: String) -> Result<(), String> {
    match entry(&key)?.delete_credential() {
        Ok(()) | Err(Error::NoEntry) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

fn update_dir(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_data_dir().ok()
}

/// Antes de instalar una actualización: el próximo arranque debe mostrar la ventana.
#[tauri::command]
fn mark_update_restart(app: tauri::AppHandle) -> Result<(), String> {
    let dir = update_dir(&app).ok_or("sin carpeta de datos")?;
    shell::write_update_marker(&dir).map_err(|e| e.to_string())
}

/// Si la instalación falla, la marca no debe quedar.
#[tauri::command]
fn clear_update_restart(app: tauri::AppHandle) {
    if let Some(dir) = update_dir(&app) {
        shell::take_update_marker(&dir);
    }
}

/// La sesión murió con la ventana escondida: hay que mostrar el inicio de sesión.
#[tauri::command]
fn show_window(app: tauri::AppHandle) {
    shell::show_main(&app);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Debe ser el primer plugin: una segunda copia solo trae la primera al frente.
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Una segunda copia abierta por Windows (--hidden) no debe sacar la ventana.
            if !shell::starts_hidden(&args) {
                shell::show_main(app);
            }
        }))
        // Registrado, pero apagado: solo la casilla de Ajustes lo enciende.
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![shell::HIDDEN_ARG]),
        ))
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(login::LoginState::default())
        .setup(|app| {
            shell::open_month_on_tap(app.handle())?;
            shell::start_alerts_tick(app.handle());
            shell::build_tray(app)?;
            let args: Vec<String> = std::env::args().collect();
            // Tras actualizar, el instalador reenvía `--hidden`: la marca fuerza la ventana.
            let restarted_by_update = update_dir(app.handle()).is_some_and(|dir| shell::take_update_marker(&dir));
            if shell::should_show(&args, restarted_by_update) {
                shell::show_main(app.handle());
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            // La X solo guarda la ventana junto al reloj; Salir está en el menú de la bandeja.
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .invoke_handler(tauri::generate_handler![
            secret_get,
            secret_set,
            secret_delete,
            mark_update_restart,
            clear_update_restart,
            show_window,
            login::login_listen,
            login::login_wait,
            login::login_cancel
        ])
        .run(tauri::generate_context!())
        .expect("error while running Recibo");
}
