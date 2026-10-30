//! Servidor local de un solo uso para el login por el navegador (127.0.0.1:53682).
//! Nunca registra el código ni la línea de la petición.

use std::time::Duration;
use tauri::State;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{Mutex, Notify};

const PORT: u16 = 53682;
const WAIT_LIMIT: Duration = Duration::from_secs(300);
const READ_LIMIT: Duration = Duration::from_secs(5);

#[derive(Debug, PartialEq)]
pub enum CallbackOutcome {
    Code(String),
    Denied,
    Ignored,
}

/// Interpreta la primera línea de la petición HTTP del redirect.
pub fn parse_callback(request_line: &str, state: &str) -> CallbackOutcome {
    let mut parts = request_line.split_whitespace();
    if parts.next() != Some("GET") {
        return CallbackOutcome::Ignored;
    }
    let Some(target) = parts.next() else {
        return CallbackOutcome::Ignored;
    };
    let Ok(url) = url::Url::parse(&format!("http://localhost{target}")) else {
        return CallbackOutcome::Ignored;
    };
    if url.path() != "/callback" {
        return CallbackOutcome::Ignored;
    }
    let mut code = None;
    let mut error = false;
    let mut state_ok = false;
    for (key, value) in url.query_pairs() {
        match key.as_ref() {
            "code" => code = Some(value.into_owned()),
            "error" => error = true,
            "state" => state_ok = value == state,
            _ => {}
        }
    }
    if !state_ok {
        return CallbackOutcome::Ignored;
    }
    match (code, error) {
        (_, true) => CallbackOutcome::Denied,
        (Some(code), false) if !code.is_empty() => CallbackOutcome::Code(code),
        _ => CallbackOutcome::Ignored,
    }
}

struct Pending {
    listener: TcpListener,
    state: String,
}

#[derive(Default)]
pub struct LoginState {
    pending: Mutex<Option<Pending>>,
    cancel: Notify,
}

/// Abre el puerto. Uno nuevo reemplaza al anterior.
#[tauri::command]
pub async fn login_listen(state: String, login: State<'_, LoginState>) -> Result<(), String> {
    let mut pending = login.pending.lock().await;
    *pending = None;
    let listener = TcpListener::bind(("127.0.0.1", PORT))
        .await
        .map_err(|_| "port-busy".to_string())?;
    *pending = Some(Pending { listener, state });
    Ok(())
}

/// Espera el redirect. Suelta el puerto al terminar, sea cual sea el resultado.
#[tauri::command]
pub async fn login_wait(login: State<'_, LoginState>) -> Result<String, String> {
    let Some(pending) = login.pending.lock().await.take() else {
        return Err("cancelled".into());
    };
    let serve = async {
        loop {
            let Ok((mut stream, _)) = pending.listener.accept().await else {
                continue;
            };
            match read_outcome(&mut stream, &pending.state).await {
                CallbackOutcome::Code(code) => {
                    respond(&mut stream, 200, "Listo. Ya puedes cerrar esta pestaña y volver a Recibo.").await;
                    return Ok(code);
                }
                CallbackOutcome::Denied => {
                    respond(&mut stream, 200, "No se conectó el correo. Vuelve a Recibo.").await;
                    return Err("denied".to_string());
                }
                CallbackOutcome::Ignored => respond(&mut stream, 404, "No encontrado.").await,
            }
        }
    };
    tokio::select! {
        result = serve => result,
        _ = tokio::time::sleep(WAIT_LIMIT) => Err("timeout".into()),
        _ = login.cancel.notified() => Err("cancelled".into()),
    }
}

/// Cancela la espera en curso y suelta el puerto.
#[tauri::command]
pub async fn login_cancel(login: State<'_, LoginState>) -> Result<(), String> {
    login.cancel.notify_waiters();
    *login.pending.lock().await = None;
    Ok(())
}

async fn read_outcome(stream: &mut TcpStream, state: &str) -> CallbackOutcome {
    let mut buf = [0u8; 4096];
    let read = tokio::time::timeout(READ_LIMIT, stream.read(&mut buf)).await;
    let Ok(Ok(n)) = read else {
        return CallbackOutcome::Ignored;
    };
    let text = String::from_utf8_lossy(&buf[..n]);
    parse_callback(text.lines().next().unwrap_or(""), state)
}

async fn respond(stream: &mut TcpStream, status: u16, message: &str) {
    let reason = if status == 200 { "OK" } else { "Not Found" };
    let body = format!(
        "<!doctype html><html><head><meta charset=\"utf-8\"><title>Recibo</title></head><body><p>{message}</p></body></html>"
    );
    let response = format!(
        "HTTP/1.1 {status} {reason}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
        body.len()
    );
    let _ = stream.write_all(response.as_bytes()).await;
    let _ = stream.shutdown().await;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn code_with_right_state() {
        assert_eq!(
            parse_callback("GET /callback?code=abc&state=s1 HTTP/1.1", "s1"),
            CallbackOutcome::Code("abc".into())
        );
    }
    #[test]
    fn wrong_state_keeps_waiting() {
        assert_eq!(parse_callback("GET /callback?code=abc&state=otro HTTP/1.1", "s1"), CallbackOutcome::Ignored);
    }
    #[test]
    fn other_path_keeps_waiting() {
        assert_eq!(parse_callback("GET /favicon.ico HTTP/1.1", "s1"), CallbackOutcome::Ignored);
    }
    #[test]
    fn user_said_no() {
        assert_eq!(
            parse_callback("GET /callback?error=access_denied&state=s1 HTTP/1.1", "s1"),
            CallbackOutcome::Denied
        );
    }
    #[test]
    fn encoded_code_is_decoded() {
        assert_eq!(
            parse_callback("GET /callback?code=a%2Fb&state=s1 HTTP/1.1", "s1"),
            CallbackOutcome::Code("a/b".into())
        );
    }
}
