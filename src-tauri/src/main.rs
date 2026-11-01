#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{fs, io::Write, path::PathBuf};
use tauri::{menu::{Menu, MenuItem}, tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent}, Manager};
use tauri_plugin_dialog::DialogExt;

fn data_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("calendar.json"))
}

#[tauri::command]
fn load_data(app: tauri::AppHandle) -> Result<Option<String>, String> {
    let path = data_path(&app)?;
    match fs::metadata(&path) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e.to_string()),
        Ok(meta) if meta.len() > 10_000_000 => return Err("Saved data exceeds 10 MB".into()),
        _ => {}
    }
    fs::read_to_string(path).map(Some).map_err(|e| e.to_string())
}

#[tauri::command]
fn save_data(app: tauri::AppHandle, data: String) -> Result<(), String> {
    if data.len() > 10_000_000 { return Err("Saved data exceeds 10 MB".into()); }
    let parsed: serde_json::Value = serde_json::from_str(&data).map_err(|e| e.to_string())?;
    if parsed["version"] != 1 || !parsed["events"].is_array() || !parsed["settings"].is_object() {
        return Err("Invalid calendar data".into());
    }
    let path = data_path(&app)?;
    let mut file = tempfile::NamedTempFile::new_in(path.parent().unwrap()).map_err(|e| e.to_string())?;
    file.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
    file.as_file().sync_all().map_err(|e| e.to_string())?;
    file.persist(path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn print_window(window: tauri::WebviewWindow) -> Result<(), String> {
    window.print().map_err(|e| e.to_string())
}

#[tauri::command]
async fn export_backup(app: tauri::AppHandle, data: String) -> Result<bool, String> {
    if data.len() > 10_000_000 { return Err("Backup exceeds 10 MB".into()); }
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app.dialog().file().set_file_name("luach-plus-backup.json")
            .add_filter("Luach+ backup", &["json"]).blocking_save_file();
        let Some(selected) = selected else { return Ok(false); };
        let path = selected.into_path().map_err(|e| e.to_string())?;
        let mut file = tempfile::NamedTempFile::new_in(path.parent().ok_or("Invalid backup path")?).map_err(|e| e.to_string())?;
        file.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        file.as_file().sync_all().map_err(|e| e.to_string())?;
        file.persist(path).map_err(|e| e.to_string())?;
        Ok(true)
    }).await.map_err(|e| e.to_string())?
}

fn show_main(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![load_data, save_data, print_window, export_backup])
        .setup(|app| {
            let open = MenuItem::with_id(app, "open", "Open Luach+ / פתיחת הלוח", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit / יציאה", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&open, &quit])?;
            let mut tray = TrayIconBuilder::new()
                .menu(&menu)
                .tooltip("Luach+ · close to tray; reminders remain active")
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_main(tray.app_handle());
                    }
                });
            if let Some(icon) = app.default_window_icon() { tray = tray.icon(icon.clone()); }
            // If tray creation fails, keep ordinary close behavior so the window cannot be stranded.
            if tray.build(app).is_ok() {
                let window = app.get_webview_window("main").unwrap();
                let handle = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        if handle.hide().is_ok() { api.prevent_close(); }
                    }
                });
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("Could not start Luach+");
}
