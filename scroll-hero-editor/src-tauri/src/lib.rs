//! The desktop shell.
//!
//! Deliberately almost empty. The point of this wrapper is to find out what the system
//! webview does with the existing app before any native work is committed to — see
//! `docs/desktop-app-plan.md`, which lists the questions worth answering first.
//!
//! The one command here exists so that "did the wrapper actually work?" has a one-line
//! answer from the devtools console, and so the ffmpeg question can be checked without
//! writing anything further:
//!
//! ```js
//! await __TAURI__.core.invoke('platform_info')
//! ```

use std::process::Command;

use serde::Serialize;

#[derive(Serialize)]
pub struct PlatformInfo {
    /// `macos`, `linux`, `windows`.
    os: &'static str,
    arch: &'static str,
    /// Version string of an ffmpeg on PATH, or `null` if there is none.
    ///
    /// A shipping build would bundle ffmpeg as a sidecar rather than trust PATH. This is
    /// here to answer the cheaper question first: can Rust drive it and hand the result
    /// back to the UI at all?
    ffmpeg: Option<String>,
}

fn ffmpeg_version() -> Option<String> {
    let out = Command::new("ffmpeg").arg("-version").output().ok()?;
    if !out.status.success() {
        return None;
    }
    let text = String::from_utf8_lossy(&out.stdout);
    text.lines().next().map(|line| line.trim().to_string())
}

#[tauri::command]
fn platform_info() -> PlatformInfo {
    PlatformInfo {
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        ffmpeg: ffmpeg_version(),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![platform_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
