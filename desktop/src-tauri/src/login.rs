//! Servidor local de un solo uso para el login por el navegador (127.0.0.1:53682).
//! Nunca registra el código ni la línea de la petición.

use std::time::Duration;
use tauri::State;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{oneshot, Mutex};

const PORT: u16 = 53682;
const WAIT_LIMIT: Duration = Duration::from_secs(300);
const READ_LIMIT: Duration = Duration::from_secs(2);
const REQUEST_LINE_CAP: usize = 16 * 1024;

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

/// Una espera en curso: `cancel` la termina y `released` se cierra cuando ya soltó el puerto.
struct Active {
    cancel: oneshot::Sender<()>,
    released: oneshot::Receiver<()>,
}

#[derive(Default)]
struct Slot {
    pending: Option<Pending>,
    active: Option<Active>,
}

#[derive(Default)]
pub struct LoginState {
    slot: Mutex<Slot>,
}

impl LoginState {
    /// Termina la espera en curso (si hay) y espera a que suelte el puerto. Se llama con el candado tomado.
    async fn stop_active(slot: &mut Slot) {
        slot.pending = None;
        if let Some(active) = slot.active.take() {
            let _ = active.cancel.send(());
            // `Err` = el otro lado se soltó: el puerto ya está libre.
            let _ = active.released.await;
        }
    }

    /// Abre el puerto y devuelve el puerto real. Uno nuevo reemplaza al anterior.
    pub async fn listen(&self, port: u16, state: String) -> Result<u16, String> {
        let mut slot = self.slot.lock().await;
        Self::stop_active(&mut slot).await;
        let listener = TcpListener::bind(("127.0.0.1", port))
            .await
            .map_err(|_| "port-busy".to_string())?;
        let bound = listener.local_addr().map_err(|e| e.to_string())?.port();
        slot.pending = Some(Pending { listener, state });
        Ok(bound)
    }

    /// Espera el redirect. Suelta el puerto al terminar, sea cual sea el resultado.
    pub async fn wait(&self, limit: Duration) -> Result<String, String> {
        let (cancel_rx, released_tx, pending) = {
            let mut slot = self.slot.lock().await;
            let Some(pending) = slot.pending.take() else {
                return Err("cancelled".into());
            };
            let (cancel_tx, cancel_rx) = oneshot::channel();
            let (released_tx, released_rx) = oneshot::channel::<()>();
            slot.active = Some(Active { cancel: cancel_tx, released: released_rx });
            (cancel_rx, released_tx, pending)
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
        let result = tokio::select! {
            result = serve => result,
            _ = tokio::time::sleep(limit) => Err("timeout".into()),
            _ = cancel_rx => Err("cancelled".into()),
        };
        drop(pending);
        drop(released_tx);
        result
    }

    /// Cancela la espera en curso y suelta el puerto.
    pub async fn cancel(&self) {
        let mut slot = self.slot.lock().await;
        Self::stop_active(&mut slot).await;
    }
}

#[tauri::command]
pub async fn login_listen(state: String, login: State<'_, LoginState>) -> Result<(), String> {
    login.listen(PORT, state).await.map(|_| ())
}

#[tauri::command]
pub async fn login_wait(login: State<'_, LoginState>) -> Result<String, String> {
    login.wait(WAIT_LIMIT).await
}

#[tauri::command]
pub async fn login_cancel(login: State<'_, LoginState>) -> Result<(), String> {
    login.cancel().await;
    Ok(())
}

/// Lee hasta el fin de la primera línea (máx. 16 KB, todo dentro de `READ_LIMIT`).
async fn read_outcome(stream: &mut TcpStream, state: &str) -> CallbackOutcome {
    let read = async {
        let mut data: Vec<u8> = Vec::new();
        let mut buf = [0u8; 2048];
        while !data.windows(2).any(|w| w == b"\r\n") && data.len() < REQUEST_LINE_CAP {
            match stream.read(&mut buf).await {
                Ok(0) | Err(_) => break,
                Ok(n) => data.extend_from_slice(&buf[..n]),
            }
        }
        data
    };
    let Ok(data) = tokio::time::timeout(READ_LIMIT, read).await else {
        return CallbackOutcome::Ignored;
    };
    let text = String::from_utf8_lossy(&data);
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

    // --- escucha asíncrona (puerto 0: el sistema elige uno libre) ---
    use std::sync::Arc;
    use tokio::io::{AsyncReadExt, AsyncWriteExt};
    use tokio::net::TcpStream;

    const LIMIT: Duration = Duration::from_secs(10);

    async fn request(port: u16, parts: &[&str]) -> String {
        let mut stream = TcpStream::connect(("127.0.0.1", port)).await.unwrap();
        for part in parts {
            stream.write_all(part.as_bytes()).await.unwrap();
            stream.flush().await.unwrap();
            tokio::time::sleep(Duration::from_millis(50)).await;
        }
        let mut out = String::new();
        let _ = stream.read_to_string(&mut out).await;
        out
    }

    async fn started(state: &Arc<LoginState>) -> (u16, tokio::task::JoinHandle<Result<String, String>>) {
        let port = state.listen(0, "s1".into()).await.unwrap();
        let waiter = Arc::clone(state);
        let handle = tokio::spawn(async move { waiter.wait(LIMIT).await });
        tokio::time::sleep(Duration::from_millis(50)).await;
        (port, handle)
    }

    async fn port_is_free(port: u16) -> bool {
        TcpListener::bind(("127.0.0.1", port)).await.is_ok()
    }

    #[tokio::test]
    async fn wrong_state_then_code() {
        let state = Arc::new(LoginState::default());
        let (port, handle) = started(&state).await;
        let first = request(port, &["GET /callback?code=x&state=otro HTTP/1.1\r\n\r\n"]).await;
        assert!(first.starts_with("HTTP/1.1 404"));
        request(port, &["GET /callback?code=abc&state=s1 HTTP/1.1\r\n\r\n"]).await;
        assert_eq!(handle.await.unwrap(), Ok("abc".into()));
        assert!(port_is_free(port).await);
    }

    #[tokio::test]
    async fn cancel_before_wait() {
        let state = LoginState::default();
        let port = state.listen(0, "s1".into()).await.unwrap();
        state.cancel().await;
        assert_eq!(state.wait(LIMIT).await, Err("cancelled".into()));
        assert!(port_is_free(port).await);
    }

    #[tokio::test]
    async fn cancel_during_wait() {
        let state = Arc::new(LoginState::default());
        let (port, handle) = started(&state).await;
        state.cancel().await;
        assert_eq!(handle.await.unwrap(), Err("cancelled".into()));
        assert!(port_is_free(port).await);
    }

    #[tokio::test(flavor = "multi_thread", worker_threads = 4)]
    async fn cancel_right_after_wait_starts_is_never_lost() {
        for _ in 0..300 {
            let state = Arc::new(LoginState::default());
            let port = state.listen(0, "s1".into()).await.unwrap();
            let waiter = Arc::clone(&state);
            let handle = tokio::spawn(async move { waiter.wait(LIMIT).await });
            state.cancel().await;
            assert_eq!(handle.await.unwrap(), Err("cancelled".into()));
            assert!(port_is_free(port).await);
        }
    }

    #[tokio::test]
    async fn listen_replaces_active_wait() {
        let state = Arc::new(LoginState::default());
        let (port, first) = started(&state).await;
        let again = state.listen(port, "s2".into()).await;
        assert_eq!(again, Ok(port));
        assert_eq!(first.await.unwrap(), Err("cancelled".into()));
    }

    #[tokio::test]
    async fn timeout_frees_the_port() {
        let state = LoginState::default();
        let port = state.listen(0, "s1".into()).await.unwrap();
        assert_eq!(state.wait(Duration::from_millis(100)).await, Err("timeout".into()));
        assert!(port_is_free(port).await);
    }

    #[tokio::test]
    async fn denied_frees_the_port() {
        let state = Arc::new(LoginState::default());
        let (port, handle) = started(&state).await;
        request(port, &["GET /callback?error=access_denied&state=s1 HTTP/1.1\r\n\r\n"]).await;
        assert_eq!(handle.await.unwrap(), Err("denied".into()));
        assert!(port_is_free(port).await);
    }

    #[tokio::test]
    async fn silent_connection_does_not_block_the_real_one() {
        let state = Arc::new(LoginState::default());
        let (port, handle) = started(&state).await;
        let _silent = TcpStream::connect(("127.0.0.1", port)).await.unwrap();
        request(port, &["GET /callback?code=abc&state=s1 HTTP/1.1\r\n\r\n"]).await;
        assert_eq!(handle.await.unwrap(), Ok("abc".into()));
    }

    #[tokio::test]
    async fn fragmented_request_line() {
        let state = Arc::new(LoginState::default());
        let (port, handle) = started(&state).await;
        request(port, &["GET /callback?co", "de=abc&state=s1 HTT", "P/1.1\r\n\r\n"]).await;
        assert_eq!(handle.await.unwrap(), Ok("abc".into()));
    }

    #[tokio::test]
    async fn long_code() {
        let code = "a".repeat(4100);
        let state = Arc::new(LoginState::default());
        let (port, handle) = started(&state).await;
        request(port, &[&format!("GET /callback?code={code}&state=s1 HTTP/1.1\r\n\r\n")]).await;
        assert_eq!(handle.await.unwrap(), Ok(code));
    }
}
