use std::path::PathBuf;

/// Nombre que se usa si el sugerido queda vacío tras limpiarlo.
const FALLBACK_NAME: &str = "Recibo.pdf";
/// Caracteres que Windows no acepta en un nombre de archivo.
const FORBIDDEN: &[char] = &['\\', '/', ':', '*', '?', '"', '<', '>', '|'];

/// Nombre sugerido para el diálogo: sin caracteres prohibidos ni de control, sin espacios en los
/// bordes y terminado en `.pdf` (sin duplicarlo); vacío → `Recibo.pdf`.
pub fn safe_file_name(suggested: &str) -> String {
    let cleaned: String = suggested
        .chars()
        .filter(|c| !c.is_control() && !FORBIDDEN.contains(c))
        .collect();
    let trimmed = cleaned.trim();
    if trimmed.is_empty() {
        FALLBACK_NAME.to_string()
    } else if trimmed.to_lowercase().ends_with(".pdf") {
        trimmed.to_string()
    } else {
        format!("{trimmed}.pdf")
    }
}

/// El usuario puede borrar la extensión en el diálogo: la ruta final siempre termina en `.pdf`.
pub fn with_pdf_extension(path: PathBuf) -> PathBuf {
    if path.extension().is_some_and(|ext| ext.eq_ignore_ascii_case("pdf")) {
        path
    } else {
        let mut name = path.into_os_string();
        name.push(".pdf");
        PathBuf::from(name)
    }
}

/// Abre "Guardar como" y guarda la página actual en PDF. `false` si el usuario cancela; `true`
/// solo cuando WebView2 confirma el archivo. JS solo sugiere el nombre: la ruta la elige el diálogo.
/// Tiene que ser `async`: un comando síncrono corre en el hilo principal y esperar ahí al callback
/// de WebView2 cuelga la ventana.
#[tauri::command]
pub async fn save_report_pdf(window: tauri::WebviewWindow, file_name: String) -> Result<bool, String> {
    #[cfg(windows)]
    {
        windows_pdf::save(window, file_name).await
    }
    #[cfg(not(windows))]
    {
        let _ = (window, file_name);
        Err("solo en Windows".into())
    }
}

#[cfg(windows)]
mod windows_pdf {
    use super::{safe_file_name, with_pdf_extension};
    use std::path::Path;
    use std::sync::{Arc, Mutex};
    use tauri::Manager;
    use tauri_plugin_dialog::DialogExt;
    use tokio::sync::oneshot;
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2Environment6, ICoreWebView2PrintSettings, ICoreWebView2_7,
        COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT,
    };
    use webview2_com::PrintToPdfCompletedHandler;
    use windows::core::{Interface, HSTRING};

    const SAVE_FAILED: &str = "no se pudo guardar el PDF";
    /// Hoja carta vertical, en pulgadas.
    const PAGE_WIDTH_IN: f64 = 8.5;
    const PAGE_HEIGHT_IN: f64 = 11.0;
    const MARGIN_IN: f64 = 0.5;

    type Done = oneshot::Sender<Result<(), String>>;

    pub async fn save(window: tauri::WebviewWindow, file_name: String) -> Result<bool, String> {
        // 1. Diálogo, sin bloquear el hilo principal.
        let (tx, rx) = oneshot::channel();
        window
            .dialog()
            .file()
            .set_parent(&window)
            .set_file_name(safe_file_name(&file_name))
            .add_filter("PDF", &["pdf"])
            .set_directory(window.path().document_dir().map_err(|e| e.to_string())?)
            .save_file(move |path| {
                let _ = tx.send(path);
            });
        let Some(path) = rx.await.map_err(|e| e.to_string())? else {
            return Ok(false);
        };
        let path = with_pdf_extension(path.into_path().map_err(|e| e.to_string())?);

        // 2. PrintToPdf en el hilo de la UI (with_webview ya corre ahí); el resultado vuelve por otro oneshot.
        let (done_tx, done_rx) = oneshot::channel::<Result<(), String>>();
        window
            .with_webview(move |webview| print(&webview, &path, done_tx))
            .map_err(|e| e.to_string())?;
        // Un canal cerrado sin respuesta (WebView2 soltó el callback) también es un fallo.
        done_rx.await.map_err(|_| SAVE_FAILED.to_string())??;
        Ok(true)
    }

    /// Lanza `PrintToPdf`; el resultado, venga del callback o de un error previo, llega por `done`.
    fn print(webview: &tauri::webview::PlatformWebview, path: &Path, done: Done) {
        // El callback y el error síncrono de PrintToPdf comparten el aviso: el primero gana.
        let done = Arc::new(Mutex::new(Some(done)));
        let finish = move |result: Result<(), String>| {
            if let Some(tx) = done.lock().ok().and_then(|mut slot| slot.take()) {
                let _ = tx.send(result);
            }
        };
        let on_complete = finish.clone();
        let handler = PrintToPdfCompletedHandler::create(Box::new(move |hr, ok| {
            on_complete(if hr.is_ok() && ok { Ok(()) } else { Err(SAVE_FAILED.into()) });
            Ok(())
        }));
        // SAFETY: llamadas COM a la WebView2 de esta ventana, en el hilo de la UI (with_webview).
        let started = unsafe {
            prepare(webview).and_then(|(core, settings)| {
                core.PrintToPdf(&HSTRING::from(path.as_os_str()), &settings, &handler)
            })
        };
        if let Err(error) = started {
            finish(Err(format!("{SAVE_FAILED}: {}", error.message())));
        }
    }

    /// WebView2 7+ y la hoja: carta vertical, márgenes de media pulgada, sin fondos ni el
    /// encabezado/pie que agrega el navegador.
    unsafe fn prepare(
        webview: &tauri::webview::PlatformWebview,
    ) -> windows::core::Result<(ICoreWebView2_7, ICoreWebView2PrintSettings)> {
        let core = webview.controller().CoreWebView2()?.cast::<ICoreWebView2_7>()?;
        let settings = webview
            .environment()
            .cast::<ICoreWebView2Environment6>()?
            .CreatePrintSettings()?;
        settings.SetOrientation(COREWEBVIEW2_PRINT_ORIENTATION_PORTRAIT)?;
        settings.SetPageWidth(PAGE_WIDTH_IN)?;
        settings.SetPageHeight(PAGE_HEIGHT_IN)?;
        settings.SetMarginTop(MARGIN_IN)?;
        settings.SetMarginBottom(MARGIN_IN)?;
        settings.SetMarginLeft(MARGIN_IN)?;
        settings.SetMarginRight(MARGIN_IN)?;
        settings.SetShouldPrintBackgrounds(false)?;
        settings.SetShouldPrintHeaderAndFooter(false)?;
        Ok((core, settings))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    #[test]
    fn keeps_a_clean_name() {
        assert_eq!(safe_file_name("Recibo - Octubre 2026.pdf"), "Recibo - Octubre 2026.pdf");
    }
    #[test]
    fn strips_forbidden_characters() {
        assert_eq!(safe_file_name("a/b:c*.pdf"), "abc.pdf");
    }
    #[test]
    fn adds_the_extension() {
        assert_eq!(safe_file_name("Recibo"), "Recibo.pdf");
    }
    #[test]
    fn keeps_an_uppercase_extension() {
        assert_eq!(safe_file_name("X.PDF"), "X.PDF");
    }
    #[test]
    fn blank_name_falls_back() {
        assert_eq!(safe_file_name("  "), "Recibo.pdf");
    }
    #[test]
    fn chosen_path_gets_the_extension() {
        assert!(with_pdf_extension(PathBuf::from("C:/x/r")).ends_with("r.pdf"));
    }
    #[test]
    fn chosen_path_with_extension_stays() {
        assert_eq!(with_pdf_extension(PathBuf::from("C:/x/r.pdf")), PathBuf::from("C:/x/r.pdf"));
    }
}
